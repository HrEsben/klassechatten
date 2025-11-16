-- Migration: Flagged Messages with Parent Notifications
-- Date: 2024-11-16
-- Description: 
--   1. Add is_flagged column to messages table
--   2. Add severity column to moderation_events table
--   3. Create function to get message context (previous 8 messages)
--   4. Create function to batch and notify parents of flagged messages
--   5. Create trigger to notify parents when messages are flagged

-- ============================================================
-- STEP 1: Add is_flagged column to messages
-- ============================================================

ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_messages_flagged 
ON messages(is_flagged) 
WHERE is_flagged = TRUE;

-- ============================================================
-- STEP 2: Add severity column to moderation_events
-- ============================================================

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'moderation_events' 
    AND column_name = 'severity'
  ) THEN
    ALTER TABLE moderation_events 
    ADD COLUMN severity TEXT DEFAULT 'moderate_severity' 
    CHECK (severity IN ('high_severity', 'moderate_severity', 'low_severity'));
  END IF;
END $$;

-- ============================================================
-- STEP 3: Function to get message context
-- ============================================================

CREATE OR REPLACE FUNCTION get_message_context(
  p_message_id UUID,
  p_context_count INTEGER DEFAULT 8
)
RETURNS TABLE (
  id UUID,
  body TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ,
  user_id UUID,
  display_name TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.body,
    m.image_url,
    m.created_at,
    m.user_id,
    COALESCE(p.display_name, u.email) as display_name
  FROM messages m
  LEFT JOIN profiles p ON m.user_id = p.id
  LEFT JOIN auth.users u ON m.user_id = u.id
  WHERE m.room_id = (SELECT room_id FROM messages WHERE id = p_message_id)
    AND m.created_at < (SELECT created_at FROM messages WHERE id = p_message_id)
  ORDER BY m.created_at DESC
  LIMIT p_context_count;
END;
$$;

-- ============================================================
-- STEP 4: Create parent_notification_queue table
-- ============================================================

CREATE TABLE IF NOT EXISTS parent_notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  flagged_message_ids UUID[] NOT NULL,
  context_message_ids UUID[] NOT NULL,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  severity TEXT NOT NULL CHECK (severity IN ('high_severity', 'moderate_severity', 'low_severity')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  UNIQUE(child_user_id, class_id, room_id, created_at)
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_parent_notification_queue_status 
ON parent_notification_queue(status, created_at);

CREATE INDEX IF NOT EXISTS idx_parent_notification_queue_child 
ON parent_notification_queue(child_user_id, created_at);

-- Enable RLS
ALTER TABLE parent_notification_queue ENABLE ROW LEVEL SECURITY;

-- Only admins and the system can read/write
CREATE POLICY parent_notification_queue_admin_all
ON parent_notification_queue
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- ============================================================
-- STEP 5: Function to batch and queue parent notifications
-- ============================================================

CREATE OR REPLACE FUNCTION queue_parent_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_child_user_id UUID;
  v_room_id UUID;
  v_class_id UUID;
  v_context_ids UUID[];
  v_existing_queue_id UUID;
  v_time_window INTERVAL := INTERVAL '5 minutes';
BEGIN
  -- Only process flagged messages
  IF NOT NEW.is_flagged THEN
    RETURN NEW;
  END IF;

  -- Get message details
  v_child_user_id := NEW.user_id;
  v_room_id := NEW.room_id;
  v_class_id := NEW.class_id;

  -- Get context message IDs (previous 8 messages)
  SELECT ARRAY_AGG(id ORDER BY created_at DESC)
  INTO v_context_ids
  FROM (
    SELECT id, created_at
    FROM messages
    WHERE room_id = v_room_id
      AND created_at < NEW.created_at
    ORDER BY created_at DESC
    LIMIT 8
  ) context_msgs;

  -- Check if there's a recent pending notification for this child in this room
  SELECT id INTO v_existing_queue_id
  FROM parent_notification_queue
  WHERE child_user_id = v_child_user_id
    AND class_id = v_class_id
    AND room_id = v_room_id
    AND status = 'pending'
    AND created_at >= (NOW() - v_time_window)
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_existing_queue_id IS NOT NULL THEN
    -- Add to existing queue entry (batch multiple flags together)
    UPDATE parent_notification_queue
    SET 
      flagged_message_ids = array_append(flagged_message_ids, NEW.id),
      -- Update context to latest messages
      context_message_ids = v_context_ids,
      -- Upgrade severity if needed
      severity = CASE 
        WHEN (SELECT severity FROM moderation_events WHERE subject_id = NEW.id ORDER BY created_at DESC LIMIT 1) = 'high_severity' 
        THEN 'high_severity'
        ELSE severity
      END
    WHERE id = v_existing_queue_id;
  ELSE
    -- Create new queue entry
    INSERT INTO parent_notification_queue (
      child_user_id,
      flagged_message_ids,
      context_message_ids,
      class_id,
      room_id,
      severity
    )
    VALUES (
      v_child_user_id,
      ARRAY[NEW.id],
      COALESCE(v_context_ids, ARRAY[]::UUID[]),
      v_class_id,
      v_room_id,
      COALESCE(
        (SELECT severity FROM moderation_events WHERE subject_id = NEW.id ORDER BY created_at DESC LIMIT 1),
        'moderate_severity'
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================================
-- STEP 6: Create trigger
-- ============================================================

DROP TRIGGER IF EXISTS trigger_queue_parent_notification ON messages;

CREATE TRIGGER trigger_queue_parent_notification
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION queue_parent_notification();

-- ============================================================
-- STEP 7: Function to process queued notifications (called by cron or Edge Function)
-- ============================================================

CREATE OR REPLACE FUNCTION process_parent_notifications()
RETURNS TABLE (
  queue_id UUID,
  child_user_id UUID,
  guardian_user_ids UUID[],
  flagged_messages JSONB,
  context_messages JSONB,
  room_name TEXT,
  class_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH pending_notifications AS (
    SELECT * FROM parent_notification_queue
    WHERE status = 'pending'
      AND created_at <= (NOW() - INTERVAL '30 seconds')  -- Wait 30 seconds for batching
    ORDER BY created_at ASC
    LIMIT 50
  )
  SELECT 
    pn.id as queue_id,
    pn.child_user_id,
    ARRAY_AGG(DISTINCT gl.guardian_user_id) as guardian_user_ids,
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', m.id,
          'body', m.body,
          'image_url', m.image_url,
          'created_at', m.created_at
        )
      )
      FROM messages m
      WHERE m.id = ANY(pn.flagged_message_ids)
    ) as flagged_messages,
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', m.id,
          'body', m.body,
          'image_url', m.image_url,
          'created_at', m.created_at,
          'user_name', COALESCE(p.display_name, u.email)
        ) ORDER BY m.created_at DESC
      )
      FROM messages m
      LEFT JOIN profiles p ON m.user_id = p.id
      LEFT JOIN auth.users u ON m.user_id = u.id
      WHERE m.id = ANY(pn.context_message_ids)
    ) as context_messages,
    r.name as room_name,
    c.label as class_name
  FROM pending_notifications pn
  LEFT JOIN guardian_links gl ON gl.child_user_id = pn.child_user_id
  LEFT JOIN rooms r ON r.id = pn.room_id
  LEFT JOIN classes c ON c.id = pn.class_id
  WHERE gl.consent_status = 'granted'
  GROUP BY pn.id, pn.child_user_id, pn.flagged_message_ids, pn.context_message_ids, pn.room_id, pn.class_id, r.name, c.label;
END;
$$;

-- ============================================================
-- STEP 8: Function to mark notification as sent
-- ============================================================

CREATE OR REPLACE FUNCTION mark_notification_sent(p_queue_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE parent_notification_queue
  SET 
    status = 'sent',
    sent_at = NOW()
  WHERE id = p_queue_id;
END;
$$;

-- ============================================================
-- STEP 9: Grant permissions
-- ============================================================

GRANT EXECUTE ON FUNCTION get_message_context TO authenticated;
GRANT EXECUTE ON FUNCTION queue_parent_notification TO authenticated;
GRANT EXECUTE ON FUNCTION process_parent_notifications TO service_role;
GRANT EXECUTE ON FUNCTION mark_notification_sent TO service_role;

-- ============================================================
-- DONE
-- ============================================================

-- Summary:
-- ✅ Added is_flagged column to messages
-- ✅ Added severity column to moderation_events  
-- ✅ Created parent_notification_queue table with batching support
-- ✅ Created trigger to automatically queue parent notifications
-- ✅ Created functions to process and send notifications with context
-- ✅ Notifications are batched within 5-minute windows
-- ✅ Context includes previous 8 messages for parent review
