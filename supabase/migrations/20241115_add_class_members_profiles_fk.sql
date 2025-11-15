-- Add foreign key relationship between class_members and profiles
-- This allows PostgREST to automatically join class_members with profiles

-- First, ensure all user_ids in class_members exist in profiles
-- (They should, but let's be safe)
DO $$ 
BEGIN
  -- Check if there are any orphaned records
  IF EXISTS (
    SELECT 1 
    FROM class_members cm
    LEFT JOIN profiles p ON cm.user_id = p.user_id
    WHERE p.user_id IS NULL
  ) THEN
    RAISE NOTICE 'Warning: Found orphaned class_members records. They will remain but should be investigated.';
  END IF;
END $$;

-- Add the foreign key constraint
-- This creates a relationship from class_members.user_id -> profiles.user_id
ALTER TABLE public.class_members
  ADD CONSTRAINT class_members_user_id_profiles_fkey
  FOREIGN KEY (user_id)
  REFERENCES public.profiles(user_id)
  ON DELETE CASCADE;

-- Add an index to improve join performance
CREATE INDEX IF NOT EXISTS idx_class_members_user_id ON public.class_members(user_id);

-- Verify the relationship was created
DO $$
BEGIN
  RAISE NOTICE 'Foreign key constraint added successfully!';
  RAISE NOTICE 'class_members.user_id now references profiles.user_id';
END $$;
