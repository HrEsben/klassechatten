-- Fix notification triggers: Replace c.name with c.label
-- Run this in Supabase SQL Editor

-- Drop existing triggers first
DROP TRIGGER IF EXISTS trigger_notify_new_message ON messages;
DROP TRIGGER IF EXISTS trigger_notify_mention ON messages;
DROP TRIGGER IF EXISTS trigger_notify_reply ON messages;
DROP TRIGGER IF EXISTS trigger_notify_reaction ON reactions;

-- Drop existing functions
DROP FUNCTION IF EXISTS notify_new_message();
DROP FUNCTION IF EXISTS notify_mention();
DROP FUNCTION IF EXISTS notify_reply();
DROP FUNCTION IF EXISTS notify_reaction();

-- Now run the corrected migration
-- Copy and paste the entire content of:
-- supabase/migrations/20241114_notification_triggers.sql
