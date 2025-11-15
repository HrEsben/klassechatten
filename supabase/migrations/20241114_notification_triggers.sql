-- Notification Triggers
-- Automatically create notifications for relevant events

-- ============================================================
-- TRIGGER: New Message Notifications
-- ============================================================

CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER AS $$
DECLARE
  v_room RECORD;
  v_sender RECORD;
  v_member RECORD;
  v_idempotency_key TEXT;
  v_title TEXT;
  v_body TEXT;
BEGIN
  -- Get room info
  SELECT r.*, c.label as class_name, c.id as class_id
  INTO v_room
  FROM rooms r
  JOIN classes c ON c.id = r.class_id
  WHERE r.id = NEW.room_id;
  
  -- Get sender info
  SELECT display_name
  INTO v_sender
  FROM profiles
  WHERE user_id = NEW.user_id;
  
  -- Create notifications for all room members except the sender
  FOR v_member IN
    SELECT DISTINCT cm.user_id
    FROM class_members cm
    WHERE cm.class_id = v_room.class_id
    AND cm.user_id != NEW.user_id
  LOOP
    -- Generate idempotency key to prevent duplicates
    v_idempotency_key := 'msg_' || NEW.id::text || '_user_' || v_member.user_id::text;
    
    -- Check if user should receive this notification
    IF should_send_notification(
      v_member.user_id,
      'new_message',
      NEW.room_id,
      v_room.class_id
    ) THEN
      -- Prepare notification content
      v_title := v_room.class_name || ' • ' || v_room.name;
      v_body := COALESCE(v_sender.display_name, 'Nogen') || ': ' || 
                COALESCE(LEFT(NEW.body, 100), 'Sendte et billede');
      
      -- Insert notification
      INSERT INTO notifications (
        user_id,
        type,
        title,
        body,
        room_id,
        message_id,
        class_id,
        data,
        idempotency_key
      ) VALUES (
        v_member.user_id,
        'new_message',
        v_title,
        v_body,
        NEW.room_id,
        NEW.id,
        v_room.class_id,
        jsonb_build_object(
          'sender_id', NEW.user_id,
          'sender_name', v_sender.display_name,
          'room_name', v_room.name,
          'class_name', v_room.class_name
        ),
        v_idempotency_key
      )
      ON CONFLICT (idempotency_key) DO NOTHING; -- Prevent duplicates
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for all new messages
CREATE TRIGGER trigger_notify_new_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_message();

-- ============================================================
-- TRIGGER: Mention Notifications
-- ============================================================

CREATE OR REPLACE FUNCTION notify_mention()
RETURNS TRIGGER AS $$
DECLARE
  v_room RECORD;
  v_sender RECORD;
  v_mentioned_user_id UUID;
  v_mention_pattern TEXT;
  v_idempotency_key TEXT;
  v_title TEXT;
  v_body TEXT;
BEGIN
  -- Skip if message has no body
  IF NEW.body IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Get room info
  SELECT r.*, c.label as class_name, c.id as class_id
  INTO v_room
  FROM rooms r
  JOIN classes c ON c.id = r.class_id
  WHERE r.id = NEW.room_id;
  
  -- Get sender info
  SELECT display_name
  INTO v_sender
  FROM profiles
  WHERE user_id = NEW.user_id;
  
  -- Look for @mentions in message body by display_name only (no username column)
  -- Pattern: @"display name" or @displayname
  FOR v_mentioned_user_id IN
    SELECT DISTINCT p.user_id
    FROM profiles p
    JOIN class_members cm ON cm.user_id = p.user_id
    WHERE cm.class_id = v_room.class_id
    AND p.user_id != NEW.user_id
    AND (
      -- Match @"display name"
      NEW.body ~ ('@"' || p.display_name || '"')
      -- Match @displayname (no spaces, case insensitive)
      OR NEW.body ~* ('@' || replace(p.display_name, ' ', '') || '\b')
    )
  LOOP
    v_idempotency_key := 'mention_' || NEW.id::text || '_user_' || v_mentioned_user_id::text;
    
    -- Check if user should receive this notification
    IF should_send_notification(
      v_mentioned_user_id,
      'mention',
      NEW.room_id,
      v_room.class_id
    ) THEN
      v_title := COALESCE(v_sender.display_name, 'Nogen') || ' nævnte dig';
      v_body := 'I ' || v_room.class_name || ' • ' || v_room.name;
      
      INSERT INTO notifications (
        user_id,
        type,
        title,
        body,
        room_id,
        message_id,
        class_id,
        data,
        idempotency_key
      ) VALUES (
        v_mentioned_user_id,
        'mention',
        v_title,
        v_body,
        NEW.room_id,
        NEW.id,
        v_room.class_id,
        jsonb_build_object(
          'sender_id', NEW.user_id,
          'sender_name', v_sender.display_name,
          'room_name', v_room.name,
          'class_name', v_room.class_name,
          'message_preview', LEFT(NEW.body, 100)
        ),
        v_idempotency_key
      )
      ON CONFLICT (idempotency_key) DO NOTHING;
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for messages with body text
CREATE TRIGGER trigger_notify_mention
  AFTER INSERT ON messages
  FOR EACH ROW
  WHEN (NEW.body IS NOT NULL)
  EXECUTE FUNCTION notify_mention();

-- ============================================================
-- TRIGGER: Reaction Notifications
-- ============================================================

CREATE OR REPLACE FUNCTION notify_reaction()
RETURNS TRIGGER AS $$
DECLARE
  v_message RECORD;
  v_room RECORD;
  v_reactor RECORD;
  v_idempotency_key TEXT;
  v_title TEXT;
  v_body TEXT;
BEGIN
  -- Get message and author
  SELECT m.*, m.user_id as author_id
  INTO v_message
  FROM messages m
  WHERE m.id = NEW.message_id;
  
  -- Don't notify if user reacted to their own message
  IF v_message.author_id = NEW.user_id THEN
    RETURN NEW;
  END IF;
  
  -- Get room info
  SELECT r.*, c.label as class_name, c.id as class_id
  INTO v_room
  FROM rooms r
  JOIN classes c ON c.id = r.class_id
  WHERE r.id = v_message.room_id;
  
  -- Get reactor info
  SELECT display_name
  INTO v_reactor
  FROM profiles
  WHERE user_id = NEW.user_id;
  
  v_idempotency_key := 'reaction_' || NEW.id::text || '_author_' || v_message.author_id::text;
  
  -- Check if message author should receive notification
  IF should_send_notification(
    v_message.author_id,
    'reaction',
    v_message.room_id,
    v_room.class_id
  ) THEN
    v_title := COALESCE(v_reactor.display_name, 'Nogen') || ' reagerede ' || NEW.emoji;
    v_body := 'På din besked i ' || v_room.class_name || ' • ' || v_room.name;
    
    INSERT INTO notifications (
      user_id,
      type,
      title,
      body,
      room_id,
      message_id,
      class_id,
      data,
      idempotency_key
    ) VALUES (
      v_message.author_id,
      'reaction',
      v_title,
      v_body,
      v_message.room_id,
      NEW.message_id,
      v_room.class_id,
      jsonb_build_object(
        'reactor_id', NEW.user_id,
        'reactor_name', v_reactor.display_name,
        'emoji', NEW.emoji,
        'room_name', v_room.name,
        'class_name', v_room.class_name,
        'message_preview', LEFT(v_message.body, 100)
      ),
      v_idempotency_key
    )
    ON CONFLICT (idempotency_key) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_reaction
  AFTER INSERT ON reactions
  FOR EACH ROW
  EXECUTE FUNCTION notify_reaction();

-- ============================================================
-- TRIGGER: Moderation Notifications
-- ============================================================

CREATE OR REPLACE FUNCTION notify_moderation()
RETURNS TRIGGER AS $$
DECLARE
  v_room RECORD;
  v_idempotency_key TEXT;
  v_title TEXT;
  v_body TEXT;
BEGIN
  -- Only notify when message is flagged or blocked
  IF NEW.moderation_status NOT IN ('flagged', 'blocked') THEN
    RETURN NEW;
  END IF;
  
  -- Don't notify if status hasn't changed
  IF OLD.moderation_status = NEW.moderation_status THEN
    RETURN NEW;
  END IF;
  
  -- Get room info
  SELECT r.*, c.label as class_name, c.id as class_id
  INTO v_room
  FROM rooms r
  JOIN classes c ON c.id = r.class_id
  WHERE r.id = NEW.room_id;
  
  v_idempotency_key := 'moderation_' || NEW.id::text || '_user_' || NEW.user_id::text || '_' || NEW.moderation_status;
  
  -- Check if user should receive notification
  IF should_send_notification(
    NEW.user_id,
    'moderation',
    NEW.room_id,
    v_room.class_id
  ) THEN
    IF NEW.moderation_status = 'flagged' THEN
      v_title := 'Din besked blev markeret';
      v_body := 'En lærer vil gennemgå den i ' || v_room.class_name;
    ELSIF NEW.moderation_status = 'blocked' THEN
      v_title := 'Din besked blev blokeret';
      v_body := 'Den overholdt ikke retningslinjerne';
    END IF;
    
    INSERT INTO notifications (
      user_id,
      type,
      title,
      body,
      room_id,
      message_id,
      class_id,
      data,
      idempotency_key
    ) VALUES (
      NEW.user_id,
      'moderation',
      v_title,
      v_body,
      NEW.room_id,
      NEW.id,
      v_room.class_id,
      jsonb_build_object(
        'moderation_status', NEW.moderation_status,
        'moderation_reason', NEW.moderation_reason,
        'room_name', v_room.name,
        'class_name', v_room.class_name
      ),
      v_idempotency_key
    )
    ON CONFLICT (idempotency_key) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: Moderation trigger disabled - messages table doesn't have moderation_status column
-- Uncomment when moderation is implemented:
-- CREATE TRIGGER trigger_notify_moderation
--   AFTER UPDATE ON messages
--   FOR EACH ROW
--   WHEN (NEW.moderation_status IS DISTINCT FROM OLD.moderation_status)
--   EXECUTE FUNCTION notify_moderation();

-- ============================================================
-- TRIGGER: Call Edge Function for Push Notifications
-- ============================================================
-- This trigger sends a webhook to the Edge Function to handle push delivery

CREATE OR REPLACE FUNCTION trigger_push_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_webhook_url TEXT;
BEGIN
  -- Only trigger for new notifications
  IF TG_OP = 'INSERT' THEN
    -- Get the webhook URL from environment or use default
    -- In production, this should be set via Supabase secrets
    v_webhook_url := current_setting('app.settings.notification_webhook_url', TRUE);
    
    -- If webhook URL is not configured, skip (use in-app only)
    IF v_webhook_url IS NULL OR v_webhook_url = '' THEN
      RETURN NEW;
    END IF;
    
    -- Call Edge Function asynchronously using pg_net (if available)
    -- This requires pg_net extension to be enabled
    -- For now, we'll handle this in the Edge Function polling approach
    -- or via Supabase Database Webhooks configuration
    
    -- The Edge Function will be triggered via Database Webhooks
    -- configured in Supabase Dashboard: Database -> Webhooks
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: This trigger is optional - we can use Supabase Database Webhooks instead
-- CREATE TRIGGER trigger_push_notification
--   AFTER INSERT ON notifications
--   FOR EACH ROW
--   EXECUTE FUNCTION trigger_push_notification();

COMMENT ON FUNCTION notify_new_message() IS 'Creates notifications for new messages in a room';
COMMENT ON FUNCTION notify_mention() IS 'Creates notifications when a user is mentioned';
COMMENT ON FUNCTION notify_reaction() IS 'Creates notifications when someone reacts to a user message';
COMMENT ON FUNCTION notify_moderation() IS 'Creates notifications for moderation events';
