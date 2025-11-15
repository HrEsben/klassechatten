-- Fix notification triggers - Run this in Supabase SQL Editor
-- https://supabase.com/dashboard/project/uxdmqhgilcynzxjpbfui/sql/new

-- Step 1: Drop broken triggers and functions
DROP TRIGGER IF EXISTS trigger_notify_new_message ON messages;
DROP TRIGGER IF EXISTS trigger_notify_mention ON messages;
DROP TRIGGER IF EXISTS trigger_notify_reply ON messages;
DROP TRIGGER IF EXISTS trigger_notify_reaction ON reactions;

DROP FUNCTION IF EXISTS notify_new_message();
DROP FUNCTION IF EXISTS notify_mention();
DROP FUNCTION IF EXISTS notify_reply();
DROP FUNCTION IF EXISTS notify_reaction();

-- Step 2: Now copy the ENTIRE content of this file:
-- supabase/migrations/20241114_notification_triggers.sql
-- and run it in the SQL Editor

-- This will recreate all the triggers with the fixed c.label reference
