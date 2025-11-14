-- =============================================
-- Fix Read Receipts RLS Policies
-- Date: 2024-11-14
-- Description: Recreate missing RLS policies for read_receipts table
--              These were accidentally removed in the rollback migration
-- =============================================

-- Enable RLS (should already be enabled, but ensure it)
ALTER TABLE public.read_receipts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view read receipts in their classes" ON public.read_receipts;
DROP POLICY IF EXISTS "Users can insert their own read receipts" ON public.read_receipts;
DROP POLICY IF EXISTS "Users can update their own read receipts" ON public.read_receipts;
DROP POLICY IF EXISTS read_receipts_select ON public.read_receipts;
DROP POLICY IF EXISTS read_receipts_insert ON public.read_receipts;
DROP POLICY IF EXISTS read_receipts_update ON public.read_receipts;

-- =============================================
-- SELECT: Users can see read receipts for messages in their classes
-- =============================================
CREATE POLICY read_receipts_select
ON public.read_receipts
FOR SELECT
TO authenticated
USING (
  -- User can see read receipts for messages in classes they are a member of
  EXISTS (
    SELECT 1 
    FROM public.messages m
    WHERE m.id = read_receipts.message_id
      AND is_member_of_class(m.class_id)
  )
);

-- =============================================
-- INSERT: Users can insert their own read receipts for messages they can see
-- =============================================
CREATE POLICY read_receipts_insert
ON public.read_receipts
FOR INSERT
TO authenticated
WITH CHECK (
  -- Must be inserting for themselves
  user_id = auth.uid()
  -- And the message must be in a class they're a member of
  AND EXISTS (
    SELECT 1 
    FROM public.messages m
    WHERE m.id = read_receipts.message_id
      AND is_member_of_class(m.class_id)
  )
);

-- =============================================
-- UPDATE: Users can update their own read receipts (upsert support)
-- =============================================
CREATE POLICY read_receipts_update
ON public.read_receipts
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- =============================================
-- Performance indexes (should already exist, but ensure they do)
-- =============================================
CREATE INDEX IF NOT EXISTS idx_read_receipts_message_user 
ON public.read_receipts (message_id, user_id);

CREATE INDEX IF NOT EXISTS idx_read_receipts_user_read_at 
ON public.read_receipts (user_id, read_at);

-- =============================================
-- Realtime (should already be enabled, but ensure it)
-- =============================================
-- Note: This may fail if already added, that's OK
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE read_receipts;
EXCEPTION
  WHEN duplicate_object THEN
    NULL; -- Already exists, ignore
END;
$$;
