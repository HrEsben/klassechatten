-- Enable Realtime for messages table
-- This allows real-time chat updates via Supabase Realtime

-- Add messages table to realtime publication
alter publication supabase_realtime add table messages;

-- Verify it's added (optional - for debugging)
-- You can check with: SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
