-- Migration: Class Creation Flow with Placeholder Students
-- Date: 2024-11-13
-- Description: Add support for parents to create classes with placeholder students

-- Add placeholder and claimed_at columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_placeholder boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS claimed_at timestamptz;

-- Add nickname column to classes (optional friendly name like "De Seje")
ALTER TABLE public.classes
ADD COLUMN IF NOT EXISTS nickname text;

-- Update classes table to ensure invite_code is always set
-- Make sure existing classes have invite codes
CREATE OR REPLACE FUNCTION generate_invite_code() 
RETURNS text 
LANGUAGE plpgsql 
AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Exclude confusing chars
  result text := '';
  i int;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- Function to create class with placeholder students
CREATE OR REPLACE FUNCTION create_class_with_students(
  p_school_name text,
  p_grade_level int,
  p_class_letter text,
  p_nickname text,
  p_student_count int,
  p_creator_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_school_id uuid;
  v_class_id uuid;
  v_invite_code text;
  v_class_label text;
  v_room_id uuid;
  i int;
  v_student_id uuid;
  v_result json;
BEGIN
  -- Create or find school
  INSERT INTO public.schools (name)
  VALUES (p_school_name)
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_school_id;
  
  -- If school already exists, get its ID
  IF v_school_id IS NULL THEN
    SELECT id INTO v_school_id FROM public.schools WHERE name = p_school_name LIMIT 1;
  END IF;

  -- Generate unique invite code
  LOOP
    v_invite_code := generate_invite_code();
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.classes WHERE invite_code = v_invite_code);
  END LOOP;

  -- Create class label (e.g., "3A" or "3.A")
  v_class_label := p_grade_level::text || p_class_letter;

  -- Create class
  INSERT INTO public.classes (
    school_id,
    label,
    grade_level,
    nickname,
    invite_code,
    created_by
  )
  VALUES (
    v_school_id,
    v_class_label,
    p_grade_level,
    NULLIF(p_nickname, ''),
    v_invite_code,
    p_creator_id
  )
  RETURNING id INTO v_class_id;

  -- Add creator as class member (parent/guardian role)
  INSERT INTO public.class_members (class_id, user_id, role_in_class)
  VALUES (v_class_id, p_creator_id, 'guardian');

  -- Create default "Klassechatten" room for the class
  INSERT INTO public.rooms (class_id, name, type, created_by)
  VALUES (v_class_id, 'Klassechatten', 'general', p_creator_id)
  RETURNING id INTO v_room_id;

  -- Create placeholder students
  -- We create auth.users entries, and the handle_new_user trigger will automatically create profiles
  FOR i IN 1..p_student_count LOOP
    -- Generate a unique placeholder ID
    v_student_id := gen_random_uuid();
    
    -- Insert into auth.users with metadata that tells the trigger this is a placeholder
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token,
      email_change_token_new
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_student_id,
      'authenticated',
      'authenticated',
      'placeholder_' || v_student_id::text || '@temp.klassechatten.dk',
      crypt('placeholder_password_' || v_student_id::text, gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object(
        'role', 'child',
        'display_name', 'Elev ' || i,
        'is_placeholder', true
      ),
      now(),
      now(),
      '',
      '',
      ''
    );

    -- The handle_new_user trigger creates the profile automatically with correct metadata

    -- Add placeholder student to class
    INSERT INTO public.class_members (class_id, user_id, role_in_class)
    VALUES (v_class_id, v_student_id, 'child');
  END LOOP;

  -- Return class info
  SELECT json_build_object(
    'class_id', v_class_id,
    'invite_code', v_invite_code,
    'label', v_class_label,
    'nickname', p_nickname,
    'student_count', p_student_count
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Function to claim a placeholder student profile
CREATE OR REPLACE FUNCTION claim_placeholder_student(
  p_class_invite_code text,
  p_student_name text,
  p_new_user_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_class_id uuid;
  v_placeholder_id uuid;
  v_result json;
BEGIN
  -- Find class by invite code
  SELECT id INTO v_class_id
  FROM public.classes
  WHERE invite_code = p_class_invite_code;

  IF v_class_id IS NULL THEN
    RAISE EXCEPTION 'Invalid invitation code';
  END IF;

  -- Find an unclaimed placeholder student in this class
  SELECT p.user_id INTO v_placeholder_id
  FROM public.profiles p
  JOIN public.class_members cm ON cm.user_id = p.user_id
  WHERE cm.class_id = v_class_id
    AND p.is_placeholder = true
    AND p.claimed_at IS NULL
    AND p.role = 'child'
  LIMIT 1;

  IF v_placeholder_id IS NULL THEN
    RAISE EXCEPTION 'No available student slots in this class';
  END IF;

  -- Update the placeholder profile with new user info
  UPDATE public.profiles
  SET 
    display_name = p_student_name,
    claimed_at = now()
  WHERE user_id = v_placeholder_id;

  -- Transfer class membership to new user
  UPDATE public.class_members
  SET user_id = p_new_user_id
  WHERE class_id = v_class_id AND user_id = v_placeholder_id;

  -- Delete the placeholder profile and auth.users (CASCADE will handle it)
  DELETE FROM auth.users WHERE id = v_placeholder_id;

  -- Return success info
  SELECT json_build_object(
    'class_id', v_class_id,
    'claimed', true
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_class_with_students TO authenticated;
GRANT EXECUTE ON FUNCTION claim_placeholder_student TO authenticated;
GRANT EXECUTE ON FUNCTION generate_invite_code TO authenticated;

-- Update RLS policies to handle placeholders
-- Profiles: Users can see placeholders in their classes
DROP POLICY IF EXISTS "Users can view class members including placeholders" ON public.profiles;
CREATE POLICY "Users can view class members including placeholders"
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
