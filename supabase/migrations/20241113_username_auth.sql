-- Migration: Username-based Auth for Children
-- Date: 2024-11-13
-- Description: Add username support and make email optional for child accounts

-- Add username column to profiles (unique, required for children)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS username text UNIQUE;

-- Create index for username lookups
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

-- Drop the old placeholder claim function
DROP FUNCTION IF EXISTS claim_placeholder_student(text, text, uuid);

-- Function for parent to create child account and link to placeholder
CREATE OR REPLACE FUNCTION create_child_account(
  p_class_id uuid,
  p_parent_id uuid,
  p_child_username text,
  p_child_display_name text,
  p_child_password text,
  p_child_email text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_child_id uuid;
  v_placeholder_id uuid;
  v_result json;
  v_email text;
BEGIN
  -- Validate parent is member of the class
  IF NOT EXISTS (
    SELECT 1 FROM public.class_members 
    WHERE class_id = p_class_id 
    AND user_id = p_parent_id
    AND role_in_class IN ('guardian', 'adult')
  ) THEN
    RAISE EXCEPTION 'Parent is not a member of this class';
  END IF;

  -- Check username is available
  IF EXISTS (SELECT 1 FROM public.profiles WHERE username = p_child_username) THEN
    RAISE EXCEPTION 'Username already taken';
  END IF;

  -- Find an unclaimed placeholder student in this class
  SELECT p.user_id INTO v_placeholder_id
  FROM public.profiles p
  JOIN public.class_members cm ON cm.user_id = p.user_id
  WHERE cm.class_id = p_class_id
    AND p.is_placeholder = true
    AND p.claimed_at IS NULL
    AND p.role = 'child'
  LIMIT 1;

  IF v_placeholder_id IS NULL THEN
    RAISE EXCEPTION 'No available student slots in this class';
  END IF;

  -- Generate email if not provided (for Supabase auth)
  IF p_child_email IS NULL OR p_child_email = '' THEN
    v_email := 'child_' || p_child_username || '@klassechatten.local';
  ELSE
    v_email := p_child_email;
  END IF;

  -- Create auth user for child
  INSERT INTO auth.users (
    instance_id,
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    aud,
    role,
    created_at,
    updated_at
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    v_email,
    crypt(p_child_password, gen_salt('bf')),
    now(), -- Auto-confirm since parent is creating
    jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
    jsonb_build_object('username', p_child_username),
    'authenticated',
    'authenticated',
    now(),
    now()
  )
  RETURNING id INTO v_child_id;

  -- Update placeholder profile with child info
  UPDATE public.profiles
  SET 
    display_name = p_child_display_name,
    username = p_child_username,
    claimed_at = now()
  WHERE user_id = v_placeholder_id;

  -- Transfer class membership to new child user
  UPDATE public.class_members
  SET user_id = v_child_id
  WHERE class_id = p_class_id AND user_id = v_placeholder_id;

  -- Create guardian link
  INSERT INTO public.guardian_links (child_user_id, guardian_user_id, relationship)
  VALUES (v_child_id, p_parent_id, 'parent')
  ON CONFLICT DO NOTHING;

  -- Delete the placeholder auth user
  DELETE FROM auth.users WHERE id = v_placeholder_id;

  -- Return success info
  SELECT json_build_object(
    'child_id', v_child_id,
    'username', p_child_username,
    'class_id', p_class_id,
    'claimed', true
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Function to get available placeholders in a class
CREATE OR REPLACE FUNCTION get_available_placeholders(p_class_id uuid)
RETURNS TABLE (
  placeholder_id uuid,
  display_name text,
  created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    p.user_id,
    p.display_name,
    p.created_at
  FROM public.profiles p
  JOIN public.class_members cm ON cm.user_id = p.user_id
  WHERE cm.class_id = p_class_id
    AND p.is_placeholder = true
    AND p.claimed_at IS NULL
    AND p.role = 'child'
  ORDER BY p.created_at;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_child_account TO authenticated;
GRANT EXECUTE ON FUNCTION get_available_placeholders TO authenticated;

-- Update RLS policy for profiles to handle username lookups
DROP POLICY IF EXISTS "Users can view class members including placeholders" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile and class members" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can check username availability" ON public.profiles;

CREATE POLICY "Users can view their own profile and class members"
ON public.profiles FOR SELECT
USING (
  user_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM public.class_members cm1
    JOIN public.class_members cm2 ON cm1.class_id = cm2.class_id
    WHERE cm1.user_id = auth.uid()
    AND cm2.user_id = profiles.user_id
  )
);

-- Policy for username uniqueness check (needed for signup validation)
CREATE POLICY "Anyone can check username availability"
ON public.profiles FOR SELECT
USING (true);
