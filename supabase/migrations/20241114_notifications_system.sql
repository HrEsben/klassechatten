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
