-- Migration: Update Default Room Name to Klassechatten
-- Date: 2024-11-13
-- Description: 
--   1. Add 'is_class_admin' boolean flag to class_members (privilege on top of existing role)
--   2. Update the create_class_with_students function to use "Klassechatten" as default room name
--   3. Assign class creator as class_admin (while keeping their guardian role)

-- Step 1: Add is_class_admin column to class_members
ALTER TABLE public.class_members 
  ADD COLUMN IF NOT EXISTS is_class_admin boolean DEFAULT false;

-- Update the function to use "Klassechatten" instead of "general"
-- Also assigns creator as class_admin (guardian with admin privileges)
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

  -- Add creator as class member (guardian role with class_admin privileges)
  INSERT INTO public.class_members (class_id, user_id, role_in_class, is_class_admin)
  VALUES (v_class_id, p_creator_id, 'guardian', true);

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

-- Also update existing "general" rooms to "Klassechatten"
UPDATE public.rooms 
SET name = 'Klassechatten' 
WHERE name = 'general' AND type = 'general';

-- Helper function to check if user is class admin
CREATE OR REPLACE FUNCTION is_class_admin(p_user_id uuid, p_class_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.class_members
    WHERE class_id = p_class_id
      AND user_id = p_user_id
      AND is_class_admin = true
  );
END;
$$;

-- Function to promote a guardian/adult/child to class admin (only callable by existing class admins)
CREATE OR REPLACE FUNCTION promote_to_class_admin(
  p_class_id uuid,
  p_user_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result json;
  v_current_role text;
BEGIN
  -- Check if caller is a class admin
  IF NOT is_class_admin(auth.uid(), p_class_id) THEN
    RAISE EXCEPTION 'Only class admins can promote other users to admin';
  END IF;

  -- Check if target user is already a member
  IF NOT EXISTS (
    SELECT 1 FROM public.class_members
    WHERE class_id = p_class_id AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'User is not a member of this class';
  END IF;

  -- Get the current role of the user
  SELECT role_in_class INTO v_current_role
  FROM public.class_members
  WHERE class_id = p_class_id AND user_id = p_user_id;

  -- Update is_class_admin flag to true (keeps their existing role)
  UPDATE public.class_members
  SET is_class_admin = true
  WHERE class_id = p_class_id AND user_id = p_user_id;

  SELECT json_build_object(
    'success', true,
    'class_id', p_class_id,
    'user_id', p_user_id,
    'role', v_current_role,
    'is_class_admin', true
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Function to revoke class admin privileges (only callable by existing class admins)
CREATE OR REPLACE FUNCTION revoke_class_admin(
  p_class_id uuid,
  p_user_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result json;
  v_current_role text;
  v_admin_count int;
BEGIN
  -- Check if caller is a class admin
  IF NOT is_class_admin(auth.uid(), p_class_id) THEN
    RAISE EXCEPTION 'Only class admins can revoke admin privileges';
  END IF;

  -- Count remaining admins (must keep at least one)
  SELECT COUNT(*) INTO v_admin_count
  FROM public.class_members
  WHERE class_id = p_class_id AND is_class_admin = true;

  IF v_admin_count <= 1 THEN
    RAISE EXCEPTION 'Cannot revoke last class admin - class must have at least one admin';
  END IF;

  -- Get the current role of the user
  SELECT role_in_class INTO v_current_role
  FROM public.class_members
  WHERE class_id = p_class_id AND user_id = p_user_id;

  -- Update is_class_admin flag to false (keeps their existing role)
  UPDATE public.class_members
  SET is_class_admin = false
  WHERE class_id = p_class_id AND user_id = p_user_id;

  SELECT json_build_object(
    'success', true,
    'class_id', p_class_id,
    'user_id', p_user_id,
    'role', v_current_role,
    'is_class_admin', false
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Function to add placeholder student slots (only callable by class admins)
CREATE OR REPLACE FUNCTION add_student_slots(
  p_class_id uuid,
  p_count int
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_student_id uuid;
  i int;
  v_current_count int;
  v_result json;
BEGIN
  -- Check if caller is a class admin
  IF NOT is_class_admin(auth.uid(), p_class_id) THEN
    RAISE EXCEPTION 'Only class admins can add student slots';
  END IF;

  -- Get current placeholder count for display
  SELECT COUNT(*) INTO v_current_count
  FROM public.profiles p
  JOIN public.class_members cm ON cm.user_id = p.user_id
  WHERE cm.class_id = p_class_id
    AND p.is_placeholder = true
    AND p.claimed_at IS NULL;

  -- Create new placeholder students
  FOR i IN 1..p_count LOOP
    v_student_id := gen_random_uuid();
    
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
        'display_name', 'Elev ' || (v_current_count + i),
        'is_placeholder', true
      ),
      now(),
      now(),
      '',
      '',
      ''
    );

    INSERT INTO public.class_members (class_id, user_id, role_in_class)
    VALUES (p_class_id, v_student_id, 'child');
  END LOOP;

  SELECT json_build_object(
    'success', true,
    'class_id', p_class_id,
    'slots_added', p_count,
    'total_available', v_current_count + p_count
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Function to remove unclaimed placeholder slots (only callable by class admins)
CREATE OR REPLACE FUNCTION remove_placeholder_slot(
  p_class_id uuid,
  p_placeholder_user_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result json;
BEGIN
  -- Check if caller is a class admin
  IF NOT is_class_admin(auth.uid(), p_class_id) THEN
    RAISE EXCEPTION 'Only class admins can remove placeholder slots';
  END IF;

  -- Check if it's an unclaimed placeholder
  IF NOT EXISTS (
    SELECT 1 
    FROM public.profiles p
    JOIN public.class_members cm ON cm.user_id = p.user_id
    WHERE cm.class_id = p_class_id
      AND p.user_id = p_placeholder_user_id
      AND p.is_placeholder = true
      AND p.claimed_at IS NULL
  ) THEN
    RAISE EXCEPTION 'User is not an unclaimed placeholder in this class';
  END IF;

  -- Delete the placeholder (CASCADE will handle class_members)
  DELETE FROM auth.users WHERE id = p_placeholder_user_id;

  SELECT json_build_object(
    'success', true,
    'class_id', p_class_id,
    'removed_user_id', p_placeholder_user_id
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION is_class_admin TO authenticated;
GRANT EXECUTE ON FUNCTION promote_to_class_admin TO authenticated;
GRANT EXECUTE ON FUNCTION revoke_class_admin TO authenticated;
GRANT EXECUTE ON FUNCTION add_student_slots TO authenticated;
GRANT EXECUTE ON FUNCTION remove_placeholder_slot TO authenticated;

-- Helper function to get user's class IDs (bypasses RLS)
CREATE OR REPLACE FUNCTION get_user_class_ids(p_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT class_id FROM public.class_members WHERE user_id = p_user_id;
$$;

-- Helper function to get user's admin class IDs (bypasses RLS)
CREATE OR REPLACE FUNCTION get_user_admin_class_ids(p_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT class_id FROM public.class_members WHERE user_id = p_user_id AND is_class_admin = true;
$$;

GRANT EXECUTE ON FUNCTION get_user_class_ids TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_admin_class_ids TO authenticated;

-- RLS Policies for class_members table
-- Enable RLS
ALTER TABLE public.class_members ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view class members in their own classes
DROP POLICY IF EXISTS "Users can view members in their classes" ON public.class_members;
CREATE POLICY "Users can view members in their classes"
ON public.class_members FOR SELECT
TO authenticated
USING (
  class_id IN (SELECT get_user_class_ids(auth.uid()))
);

-- Policy: System admins can view all class members
DROP POLICY IF EXISTS "Admins can view all class members" ON public.class_members;
CREATE POLICY "Admins can view all class members"
ON public.class_members FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- Policy: Class admins can insert new members (when adding guardians/adults)
DROP POLICY IF EXISTS "Class admins can add members" ON public.class_members;
CREATE POLICY "Class admins can add members"
ON public.class_members FOR INSERT
TO authenticated
WITH CHECK (
  class_id IN (SELECT get_user_admin_class_ids(auth.uid()))
);

-- Policy: Class admins can update member roles and admin status
DROP POLICY IF EXISTS "Class admins can update members" ON public.class_members;
CREATE POLICY "Class admins can update members"
ON public.class_members FOR UPDATE
TO authenticated
USING (
  class_id IN (SELECT get_user_admin_class_ids(auth.uid()))
);

-- Policy: Class admins can remove members
DROP POLICY IF EXISTS "Class admins can remove members" ON public.class_members;
CREATE POLICY "Class admins can remove members"
ON public.class_members FOR DELETE
TO authenticated
USING (
  class_id IN (SELECT get_user_admin_class_ids(auth.uid()))
);

-- Policy: System admins can do anything with class_members
DROP POLICY IF EXISTS "Admins can manage all class members" ON public.class_members;
CREATE POLICY "Admins can manage all class members"
ON public.class_members FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- RLS Policies for schools table
-- Enable RLS
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view schools where they have classes
DROP POLICY IF EXISTS "Users can view schools they belong to" ON public.schools;
CREATE POLICY "Users can view schools they belong to"
ON public.schools FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.classes c
    JOIN public.class_members cm ON cm.class_id = c.id
    WHERE c.school_id = schools.id
    AND cm.user_id = auth.uid()
  )
);

-- Policy: System admins can view all schools
DROP POLICY IF EXISTS "Admins can view all schools" ON public.schools;
CREATE POLICY "Admins can view all schools"
ON public.schools FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- Policy: Authenticated users can create schools (when creating a class)
DROP POLICY IF EXISTS "Authenticated users can create schools" ON public.schools;
CREATE POLICY "Authenticated users can create schools"
ON public.schools FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy: System admins can update schools
DROP POLICY IF EXISTS "Admins can update schools" ON public.schools;
CREATE POLICY "Admins can update schools"
ON public.schools FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- Policy: System admins can delete schools
DROP POLICY IF EXISTS "Admins can delete schools" ON public.schools;
CREATE POLICY "Admins can delete schools"
ON public.schools FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);
