-- Add foreign key relationship from messages to profiles
-- This allows PostgREST to join messages with profiles

-- First, ensure all users who have sent messages have profiles
-- Create missing profiles for any user_id in messages that doesn't exist in profiles
INSERT INTO public.profiles (user_id, role, display_name, created_at)
SELECT DISTINCT 
  m.user_id,
  'child' as role,
  COALESCE(
    (SELECT raw_user_meta_data->>'display_name' FROM auth.users WHERE id = m.user_id),
    (SELECT email FROM auth.users WHERE id = m.user_id),
    'Unknown User'
  ) as display_name,
  now() as created_at
FROM public.messages m
WHERE m.user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.user_id = m.user_id
  );

-- Now add the foreign key constraint (only if it doesn't exist)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'messages_user_id_profiles_fkey'
  ) THEN
    ALTER TABLE public.messages 
      ADD CONSTRAINT messages_user_id_profiles_fkey 
      FOREIGN KEY (user_id) 
      REFERENCES public.profiles(user_id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- Refresh the PostgREST schema cache
NOTIFY pgrst, 'reload schema';
