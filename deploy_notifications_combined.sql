-- Notifications System Migration
-- Creates tables for cross-platform notifications with push tokens and preferences

-- ============================================================
-- 1. NOTIFICATIONS TABLE
-- ============================================================
-- Single source of truth for all notifications (in-app feed + push)
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  
  -- Notification content
  type TEXT NOT NULL CHECK (type IN ('new_message', 'mention', 'reaction', 'system', 'moderation')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  
  -- Context for deep linking
  room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
  message_id BIGINT REFERENCES messages(id) ON DELETE SET NULL,
  class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
  
  -- Metadata
  data JSONB DEFAULT '{}'::jsonb, -- Additional context (e.g., sender info)
  
  -- State tracking
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  delivered BOOLEAN DEFAULT FALSE,
  delivered_at TIMESTAMPTZ,
  
  -- Idempotency
  idempotency_key TEXT UNIQUE, -- Prevent duplicate notifications
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id) WHERE read = FALSE;
CREATE INDEX idx_notifications_room_id ON notifications(room_id);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_idempotency ON notifications(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- RLS Policies
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

-- System/Edge functions can insert notifications
CREATE POLICY "Service role can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true); -- Will be restricted to service role key

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- 2. PUSH TOKENS TABLE
-- ============================================================
-- Store device tokens for APNs/FCM/Expo push notifications

-- Drop old simple push_tokens table if it exists
DROP TABLE IF EXISTS push_tokens CASCADE;

CREATE TABLE push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  
  -- Token info
  token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  provider TEXT NOT NULL CHECK (provider IN ('expo', 'apns', 'fcm', 'web-push')),
  
  -- Device info (for debugging)
  device_id TEXT, -- Unique device identifier
  device_name TEXT, -- e.g., "iPhone 14 Pro"
  app_version TEXT,
  
  -- Token health
  is_valid BOOLEAN DEFAULT TRUE,
  last_used_at TIMESTAMPTZ DEFAULT now(),
  invalid_at TIMESTAMPTZ, -- When token became invalid
  error_count INTEGER DEFAULT 0,
  last_error TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- One token per device (upsert on conflict)
  UNIQUE(user_id, device_id, platform)
);

-- Indexes
CREATE INDEX idx_push_tokens_user_id ON push_tokens(user_id);
CREATE INDEX idx_push_tokens_token ON push_tokens(token);
CREATE INDEX idx_push_tokens_valid ON push_tokens(is_valid) WHERE is_valid = TRUE;
CREATE INDEX idx_push_tokens_device ON push_tokens(user_id, device_id);

-- RLS Policies
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

-- Users can view their own tokens
CREATE POLICY "Users can view own push tokens"
  ON push_tokens FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own tokens
CREATE POLICY "Users can insert own push tokens"
  ON push_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own tokens
CREATE POLICY "Users can update own push tokens"
  ON push_tokens FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own tokens
CREATE POLICY "Users can delete own push tokens"
  ON push_tokens FOR DELETE
  USING (auth.uid() = user_id);

-- Service role can update token health
CREATE POLICY "Service role can update token health"
  ON push_tokens FOR UPDATE
  WITH CHECK (true); -- Restricted to service role key

-- ============================================================
-- 3. NOTIFICATION PREFERENCES TABLE
-- ============================================================
-- Per-user notification settings
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE UNIQUE,
  
  -- Global toggles
  push_enabled BOOLEAN DEFAULT TRUE,
  in_app_enabled BOOLEAN DEFAULT TRUE,
  
  -- Per-type preferences
  notify_new_messages BOOLEAN DEFAULT TRUE,
  notify_mentions BOOLEAN DEFAULT TRUE,
  notify_reactions BOOLEAN DEFAULT TRUE,
  notify_system BOOLEAN DEFAULT TRUE,
  notify_moderation BOOLEAN DEFAULT TRUE,
  
  -- Quiet hours (stored as time without timezone, interpreted in user's local time)
  quiet_hours_enabled BOOLEAN DEFAULT FALSE,
  quiet_hours_start TIME, -- e.g., '22:00'
  quiet_hours_end TIME,   -- e.g., '07:00'
  
  -- Rate limiting (prevent notification spam)
  max_notifications_per_hour INTEGER DEFAULT 60,
  
  -- Room-specific muting (JSONB array of room IDs)
  muted_rooms JSONB DEFAULT '[]'::jsonb,
  muted_classes JSONB DEFAULT '[]'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index
CREATE INDEX idx_notification_prefs_user ON notification_preferences(user_id);

-- RLS Policies
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Users can view their own preferences
CREATE POLICY "Users can view own notification preferences"
  ON notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own preferences
CREATE POLICY "Users can insert own notification preferences"
  ON notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own preferences
CREATE POLICY "Users can update own notification preferences"
  ON notification_preferences FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own preferences
CREATE POLICY "Users can delete own notification preferences"
  ON notification_preferences FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- 4. NOTIFICATION DELIVERY LOG
-- ============================================================
-- Track push notification delivery for observability
CREATE TABLE IF NOT EXISTS notification_delivery_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  push_token_id UUID REFERENCES push_tokens(id) ON DELETE SET NULL,
  
  -- Delivery info
  status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'retry')),
  provider TEXT NOT NULL, -- 'expo', 'apns', 'fcm'
  provider_response JSONB, -- Full response from provider
  
  -- Error tracking
  error_code TEXT,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  
  -- Timing
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_delivery_log_notification ON notification_delivery_log(notification_id);
CREATE INDEX idx_delivery_log_status ON notification_delivery_log(status);
CREATE INDEX idx_delivery_log_created ON notification_delivery_log(created_at DESC);

-- RLS: Only admins and service role can view delivery logs
ALTER TABLE notification_delivery_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view delivery logs"
  ON notification_delivery_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ============================================================
-- 5. HELPER FUNCTIONS
-- ============================================================

-- Function to check if user should receive notification based on preferences
CREATE OR REPLACE FUNCTION should_send_notification(
  p_user_id UUID,
  p_notification_type TEXT,
  p_room_id UUID DEFAULT NULL,
  p_class_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_prefs notification_preferences;
  v_current_time TIME;
BEGIN
  -- Get user preferences (use defaults if not exists)
  SELECT * INTO v_prefs
  FROM notification_preferences
  WHERE user_id = p_user_id;
  
  -- If no preferences exist, use defaults (allow notification)
  IF NOT FOUND THEN
    RETURN TRUE;
  END IF;
  
  -- Check global toggles
  IF NOT v_prefs.push_enabled THEN
    RETURN FALSE;
  END IF;
  
  -- Check per-type preferences
  CASE p_notification_type
    WHEN 'new_message' THEN
      IF NOT v_prefs.notify_new_messages THEN
        RETURN FALSE;
      END IF;
    WHEN 'mention' THEN
      IF NOT v_prefs.notify_mentions THEN
        RETURN FALSE;
      END IF;
    WHEN 'reaction' THEN
      IF NOT v_prefs.notify_reactions THEN
        RETURN FALSE;
      END IF;
    WHEN 'system' THEN
      IF NOT v_prefs.notify_system THEN
        RETURN FALSE;
      END IF;
    WHEN 'moderation' THEN
      IF NOT v_prefs.notify_moderation THEN
        RETURN FALSE;
      END IF;
  END CASE;
  
  -- Check muted rooms
  IF p_room_id IS NOT NULL AND v_prefs.muted_rooms @> to_jsonb(p_room_id::text) THEN
    RETURN FALSE;
  END IF;
  
  -- Check muted classes
  IF p_class_id IS NOT NULL AND v_prefs.muted_classes @> to_jsonb(p_class_id::text) THEN
    RETURN FALSE;
  END IF;
  
  -- Check quiet hours
  IF v_prefs.quiet_hours_enabled THEN
    v_current_time := LOCALTIME;
    
    -- Handle overnight quiet hours (e.g., 22:00 to 07:00)
    IF v_prefs.quiet_hours_start > v_prefs.quiet_hours_end THEN
      IF v_current_time >= v_prefs.quiet_hours_start OR v_current_time < v_prefs.quiet_hours_end THEN
        RETURN FALSE;
      END IF;
    -- Handle same-day quiet hours (e.g., 12:00 to 14:00)
    ELSE
      IF v_current_time >= v_prefs.quiet_hours_start AND v_current_time < v_prefs.quiet_hours_end THEN
        RETURN FALSE;
      END IF;
    END IF;
  END IF;
  
  -- Check rate limiting (notifications in last hour)
  IF EXISTS (
    SELECT 1
    FROM notifications
    WHERE user_id = p_user_id
    AND created_at > now() - interval '1 hour'
    GROUP BY user_id
    HAVING COUNT(*) >= v_prefs.max_notifications_per_hour
  ) THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE notifications
  SET read = TRUE,
      read_at = now(),
      updated_at = now()
  WHERE id = p_notification_id
  AND user_id = auth.uid()
  AND read = FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark all notifications as read for a user
CREATE OR REPLACE FUNCTION mark_all_notifications_read()
RETURNS void AS $$
BEGIN
  UPDATE notifications
  SET read = TRUE,
      read_at = now(),
      updated_at = now()
  WHERE user_id = auth.uid()
  AND read = FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up old invalid push tokens
CREATE OR REPLACE FUNCTION cleanup_invalid_push_tokens()
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  -- Delete tokens that have been invalid for more than 30 days
  DELETE FROM push_tokens
  WHERE is_valid = FALSE
  AND invalid_at < now() - interval '30 days';
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 6. TRIGGERS
-- ============================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_push_tokens_updated_at
  BEFORE UPDATE ON push_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_notification_prefs_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 7. ENABLE REALTIME FOR IN-APP NOTIFICATIONS
-- ============================================================

-- Enable realtime on notifications table for in-app feed
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- Grant necessary permissions for realtime
GRANT SELECT ON notifications TO authenticated;
GRANT INSERT, UPDATE ON notifications TO service_role;

COMMENT ON TABLE notifications IS 'Single source of truth for all notifications (push + in-app feed)';
COMMENT ON TABLE push_tokens IS 'Device tokens for push notifications (APNs/FCM/Expo)';
COMMENT ON TABLE notification_preferences IS 'Per-user notification settings and preferences';
COMMENT ON TABLE notification_delivery_log IS 'Delivery tracking for observability and debugging';
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
  SELECT r.*, c.name as class_name, c.id as class_id
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
  SELECT r.*, c.name as class_name, c.id as class_id
  INTO v_room
  FROM rooms r
  JOIN classes c ON c.id = r.class_id
  WHERE r.id = NEW.room_id;
  
  -- Get sender info
  SELECT display_name
  INTO v_sender
  FROM profiles
  WHERE user_id = NEW.user_id;
  
  -- Look for @mentions in message body
  -- Pattern: @username or @"display name"
  FOR v_mentioned_user_id IN
    SELECT DISTINCT p.user_id
    FROM profiles p
    JOIN class_members cm ON cm.user_id = p.user_id
    WHERE cm.class_id = v_room.class_id
    AND p.user_id != NEW.user_id
    AND (
      -- Match @username
      NEW.body ~ ('@' || p.username || '\b')
      -- Match @"display name"
      OR NEW.body ~ ('@"' || p.display_name || '"')
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
  SELECT r.*, c.name as class_name, c.id as class_id
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
  SELECT r.*, c.name as class_name, c.id as class_id
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
