-- Migration: Disable automatic notifications for every new message
-- Instead, we'll show unread counts on room cards
-- Date: 2024-11-15
-- Description: 
--   1. Disable the trigger that creates notifications for every message
--   2. Keep mention, reaction, and moderation notifications active
--   3. Add function to calculate unread message counts per room

-- ============================================================
-- STEP 1: Disable the new message notification trigger
-- ============================================================

-- Drop the trigger that fires on every new message
DROP TRIGGER IF EXISTS trigger_notify_new_message ON messages;

-- Comment out the function (keep for reference, but make it a no-op)
-- We keep the function in case we want to re-enable it later
CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER AS $$
BEGIN
  -- Disabled: No longer creating notifications for every message
  -- Instead, users will see unread counts on room cards
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION notify_new_message() IS 'DISABLED: Previously created notifications for new messages. Now shows unread counts instead.';


-- ============================================================
-- STEP 2: Add function to get unread message counts per room
-- ============================================================

CREATE OR REPLACE FUNCTION get_unread_counts_for_user(p_user_id UUID)
RETURNS TABLE (
  room_id UUID,
  unread_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.room_id,
    COUNT(*) AS unread_count
  FROM messages m
  -- Only messages in rooms the user has access to
  INNER JOIN rooms r ON r.id = m.room_id
  INNER JOIN class_members cm ON cm.class_id = r.class_id
  -- Only count messages that haven't been read yet
  LEFT JOIN read_receipts rr ON rr.message_id = m.id AND rr.user_id = p_user_id
  WHERE 
    cm.user_id = p_user_id
    AND m.user_id != p_user_id  -- Don't count user's own messages
    AND m.deleted_at IS NULL    -- Don't count deleted messages
    AND rr.id IS NULL           -- No read receipt = unread
  GROUP BY m.room_id
  HAVING COUNT(*) > 0;          -- Only return rooms with unread messages
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_unread_counts_for_user(UUID) IS 'Returns unread message counts per room for a specific user';


-- ============================================================
-- STEP 3: Add RPC endpoint for easier client access
-- ============================================================

-- This allows clients to call: supabase.rpc('get_my_unread_counts')
CREATE OR REPLACE FUNCTION get_my_unread_counts()
RETURNS TABLE (
  room_id UUID,
  unread_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM get_unread_counts_for_user(auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_my_unread_counts() IS 'Returns unread message counts per room for the authenticated user';


-- ============================================================
-- STEP 4: Grant necessary permissions
-- ============================================================

-- Allow authenticated users to call the RPC functions
GRANT EXECUTE ON FUNCTION get_unread_counts_for_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_my_unread_counts() TO authenticated;
