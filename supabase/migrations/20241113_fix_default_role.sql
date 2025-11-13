-- Fix auto-create profile trigger to default to 'guardian' role for new signups
-- Children will still get 'child' role when created via create_child_account()

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
SECURITY DEFINER SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, role, display_name, is_placeholder)
  VALUES (
    NEW.id,
    -- Default to 'guardian' for self-signup users
    -- Placeholders and children have role in metadata
    COALESCE(NEW.raw_user_meta_data->>'role', 'guardian'),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'is_placeholder')::boolean, false)
  );
  RETURN NEW;
END;
$$;

-- Update existing users who signed up via the form (have email in auth.users)
-- Change their role from 'child' to 'guardian'
UPDATE public.profiles
SET role = 'guardian'
WHERE role = 'child'
  AND user_id IN (
    SELECT id 
    FROM auth.users 
    WHERE email IS NOT NULL 
      AND email != ''
  );
