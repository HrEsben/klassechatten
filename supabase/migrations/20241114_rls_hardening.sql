-- =============================================
-- Migration: RLS Hardening for KlasseChatten
-- Date: 2024-11-14
-- Description: Refactor Row Level Security to follow Supabase best practices
--
-- Changes:
-- 1. Create SECURITY DEFINER helper functions to prevent infinite recursion
--    (Helper functions MUST bypass RLS when they query RLS-protected tables)
-- 2. Use symmetric USING/WITH CHECK clauses
-- 3. Minimize overlapping policies
-- 4. Add missing indexes for RLS performance
-- 5. Harden all SECURITY DEFINER functions with search_path
--
-- Important Note:
-- The helper functions (is_member_of_class, is_admin_of_class) MUST use 
-- SECURITY DEFINER to avoid infinite recursion. This is because:
-- - class_members table has RLS policies
-- - Those policies call is_member_of_class() or is_admin_of_class()
-- - Those functions query class_members table
-- - Without SECURITY DEFINER, this creates an infinite loop
--
-- This is the official Supabase recommendation for RLS helper functions.
--
-- References:
-- - https://supabase.com/docs/guides/database/postgres/row-level-security#use-security-definer-functions
-- - https://github.com/orgs/supabase/discussions/14576
-- =============================================

-- =============================================
-- PART 1: HELPER FUNCTIONS (SECURITY DEFINER TO BYPASS RLS)
-- =============================================
-- Note: These functions MUST use SECURITY DEFINER to avoid infinite recursion
-- when policies on class_members call these functions which query class_members.
-- This is the recommended Supabase pattern for RLS helper functions.
-- Reference: https://supabase.com/docs/guides/database/postgres/row-level-security#use-security-definer-functions

-- System admin check (via profiles.role)
-- Uses SECURITY DEFINER because profiles table has RLS enabled
CREATE OR REPLACE FUNCTION public.is_system_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = (SELECT auth.uid()) AND p.role = 'admin'
  );
$$;

-- Class membership check (active members only)
-- MUST use SECURITY DEFINER to bypass RLS on class_members table
CREATE OR REPLACE FUNCTION public.is_member_of_class(c uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.class_members cm
    WHERE cm.class_id = c 
      AND cm.user_id = (SELECT auth.uid()) 
      AND cm.status = 'active'
  );
$$;

-- Class admin check (members with is_class_admin flag)
-- MUST use SECURITY DEFINER to bypass RLS on class_members table
CREATE OR REPLACE FUNCTION public.is_admin_of_class(c uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.class_members cm
    WHERE cm.class_id = c 
      AND cm.user_id = (SELECT auth.uid())
      AND cm.status = 'active' 
      AND cm.is_class_admin = true
  );
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.is_system_admin TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_member_of_class TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_of_class TO authenticated;

-- =============================================
-- PART 2: PERFORMANCE INDEXES
-- =============================================

-- Index for class_members lookups (used heavily in policies)
CREATE INDEX IF NOT EXISTS idx_class_members_class_user 
ON public.class_members (class_id, user_id) 
WHERE status = 'active';

-- Index for class_members admin lookups
CREATE INDEX IF NOT EXISTS idx_class_members_admin 
ON public.class_members (class_id, user_id, is_class_admin) 
WHERE status = 'active' AND is_class_admin = true;

-- Index for messages by class, room, and time (for chat queries)
CREATE INDEX IF NOT EXISTS idx_messages_class_room_created 
ON public.messages (class_id, room_id, created_at DESC);

-- Index for profiles role lookup (system admin checks)
CREATE INDEX IF NOT EXISTS idx_profiles_role 
ON public.profiles (user_id, role) 
WHERE role = 'admin';

-- Index for reports by class and status
CREATE INDEX IF NOT EXISTS idx_reports_class_status 
ON public.reports (class_id, status);

-- =============================================
-- PART 3: RLS POLICIES - class_members
-- =============================================

ALTER TABLE public.class_members ENABLE ROW LEVEL SECURITY;

-- SELECT: Members can view other members in their classes, admins see all
DROP POLICY IF EXISTS cm_select_members ON public.class_members;
CREATE POLICY cm_select_members
ON public.class_members
FOR SELECT
TO authenticated
USING (
  (SELECT public.is_member_of_class(class_id)) 
  OR (SELECT public.is_system_admin())
);

-- INSERT: Only class admins (or system admins) can add members
DROP POLICY IF EXISTS cm_insert_by_admin ON public.class_members;
CREATE POLICY cm_insert_by_admin
ON public.class_members
FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT public.is_admin_of_class(class_id)) 
  OR (SELECT public.is_system_admin())
);

-- UPDATE: Only class admins (or system admins) can update members
DROP POLICY IF EXISTS cm_update_by_admin ON public.class_members;
CREATE POLICY cm_update_by_admin
ON public.class_members
FOR UPDATE
TO authenticated
USING (
  (SELECT public.is_admin_of_class(class_id)) 
  OR (SELECT public.is_system_admin())
)
WITH CHECK (
  (SELECT public.is_admin_of_class(class_id)) 
  OR (SELECT public.is_system_admin())
);

-- DELETE: Only class admins (or system admins) can remove members
DROP POLICY IF EXISTS cm_delete_by_admin ON public.class_members;
CREATE POLICY cm_delete_by_admin
ON public.class_members
FOR DELETE
TO authenticated
USING (
  (SELECT public.is_admin_of_class(class_id)) 
  OR (SELECT public.is_system_admin())
);

-- =============================================
-- PART 4: RLS POLICIES - schools
-- =============================================

ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can see schools where they have classes, admins see all
DROP POLICY IF EXISTS schools_select_own ON public.schools;
CREATE POLICY schools_select_own
ON public.schools
FOR SELECT
TO authenticated
USING (
  (SELECT public.is_system_admin()) 
  OR EXISTS (
    SELECT 1
    FROM public.classes c
    JOIN public.class_members cm ON cm.class_id = c.id
    WHERE c.school_id = schools.id 
      AND cm.user_id = (SELECT auth.uid())
      AND cm.status = 'active'
  )
);

-- INSERT: Any authenticated user can create schools (needed for class creation)
DROP POLICY IF EXISTS schools_insert_any ON public.schools;
CREATE POLICY schools_insert_any
ON public.schools
FOR INSERT
TO authenticated
WITH CHECK (true);

-- UPDATE: Only system admins can update schools
DROP POLICY IF EXISTS schools_update_admin ON public.schools;
CREATE POLICY schools_update_admin
ON public.schools
FOR UPDATE
TO authenticated
USING ((SELECT public.is_system_admin()))
WITH CHECK ((SELECT public.is_system_admin()));

-- DELETE: Only system admins can delete schools
DROP POLICY IF EXISTS schools_delete_admin ON public.schools;
CREATE POLICY schools_delete_admin
ON public.schools
FOR DELETE
TO authenticated
USING ((SELECT public.is_system_admin()));

-- =============================================
-- PART 5: RLS POLICIES - classes
-- =============================================

ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

-- SELECT: Members can view their classes, admins see all
DROP POLICY IF EXISTS classes_select ON public.classes;
CREATE POLICY classes_select
ON public.classes
FOR SELECT
TO authenticated
USING (
  (SELECT public.is_member_of_class(id)) 
  OR (SELECT public.is_system_admin())
);

-- INSERT: Any authenticated user can create classes (via RPC function)
DROP POLICY IF EXISTS classes_insert ON public.classes;
CREATE POLICY classes_insert
ON public.classes
FOR INSERT
TO authenticated
WITH CHECK (created_by = (SELECT auth.uid()));

-- UPDATE: Class admins and system admins can update classes
DROP POLICY IF EXISTS classes_update ON public.classes;
CREATE POLICY classes_update
ON public.classes
FOR UPDATE
TO authenticated
USING (
  (SELECT public.is_admin_of_class(id)) 
  OR (SELECT public.is_system_admin())
)
WITH CHECK (
  (SELECT public.is_admin_of_class(id)) 
  OR (SELECT public.is_system_admin())
);

-- DELETE: Only system admins can delete classes
DROP POLICY IF EXISTS classes_delete ON public.classes;
CREATE POLICY classes_delete
ON public.classes
FOR DELETE
TO authenticated
USING ((SELECT public.is_system_admin()));

-- =============================================
-- PART 6: RLS POLICIES - rooms
-- =============================================

ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

-- SELECT: Members can view rooms in their classes
DROP POLICY IF EXISTS rooms_select ON public.rooms;
CREATE POLICY rooms_select
ON public.rooms
FOR SELECT
TO authenticated
USING (
  (SELECT public.is_member_of_class(class_id)) 
  OR (SELECT public.is_system_admin())
);

-- INSERT: Class admins can create rooms
DROP POLICY IF EXISTS rooms_insert ON public.rooms;
CREATE POLICY rooms_insert
ON public.rooms
FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT public.is_admin_of_class(class_id)) 
  OR (SELECT public.is_system_admin())
);

-- UPDATE: Class admins can update rooms
DROP POLICY IF EXISTS rooms_update ON public.rooms;
CREATE POLICY rooms_update
ON public.rooms
FOR UPDATE
TO authenticated
USING (
  (SELECT public.is_admin_of_class(class_id)) 
  OR (SELECT public.is_system_admin())
)
WITH CHECK (
  (SELECT public.is_admin_of_class(class_id)) 
  OR (SELECT public.is_system_admin())
);

-- DELETE: Class admins can delete rooms
DROP POLICY IF EXISTS rooms_delete ON public.rooms;
CREATE POLICY rooms_delete
ON public.rooms
FOR DELETE
TO authenticated
USING (
  (SELECT public.is_admin_of_class(class_id)) 
  OR (SELECT public.is_system_admin())
);

-- =============================================
-- PART 7: RLS POLICIES - messages
-- =============================================

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- SELECT: Members can view messages in their classes
DROP POLICY IF EXISTS msg_select ON public.messages;
CREATE POLICY msg_select
ON public.messages
FOR SELECT
TO authenticated
USING (
  (SELECT public.is_member_of_class(class_id)) 
  OR (SELECT public.is_system_admin())
);

-- INSERT: Author must be authenticated member of the class
-- Note: Actual inserts happen via Edge Function with AI moderation
DROP POLICY IF EXISTS msg_insert_own ON public.messages;
CREATE POLICY msg_insert_own
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = (SELECT auth.uid())
  AND (SELECT public.is_member_of_class(class_id))
);

-- UPDATE: Author can edit within 2 minutes, class admins can moderate anytime
DROP POLICY IF EXISTS msg_update ON public.messages;
CREATE POLICY msg_update
ON public.messages
FOR UPDATE
TO authenticated
USING (
  (user_id = (SELECT auth.uid()) AND (SELECT now()) - created_at < interval '2 minutes')
  OR (SELECT public.is_admin_of_class(class_id))
  OR (SELECT public.is_system_admin())
)
WITH CHECK (
  (user_id = (SELECT auth.uid()) AND (SELECT now()) - created_at < interval '2 minutes')
  OR (SELECT public.is_admin_of_class(class_id))
  OR (SELECT public.is_system_admin())
);

-- DELETE: Class admins and system admins can delete messages
DROP POLICY IF EXISTS msg_delete ON public.messages;
CREATE POLICY msg_delete
ON public.messages
FOR DELETE
TO authenticated
USING (
  (SELECT public.is_admin_of_class(class_id)) 
  OR (SELECT public.is_system_admin())
);

-- =============================================
-- PART 8: RLS POLICIES - reports
-- =============================================

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- SELECT: Reporter, class admins, and system admins can view reports
DROP POLICY IF EXISTS reports_select ON public.reports;
CREATE POLICY reports_select
ON public.reports
FOR SELECT
TO authenticated
USING (
  reporter_user_id = (SELECT auth.uid())
  OR (SELECT public.is_admin_of_class(class_id))
  OR (SELECT public.is_system_admin())
);

-- INSERT: Any class member can create reports
DROP POLICY IF EXISTS reports_insert ON public.reports;
CREATE POLICY reports_insert
ON public.reports
FOR INSERT
TO authenticated
WITH CHECK (
  reporter_user_id = (SELECT auth.uid())
  AND (SELECT public.is_member_of_class(class_id))
);

-- UPDATE: Class admins and system admins can update reports (change status)
DROP POLICY IF EXISTS reports_update_admin ON public.reports;
CREATE POLICY reports_update_admin
ON public.reports
FOR UPDATE
TO authenticated
USING (
  (SELECT public.is_admin_of_class(class_id)) 
  OR (SELECT public.is_system_admin())
)
WITH CHECK (
  (SELECT public.is_admin_of_class(class_id)) 
  OR (SELECT public.is_system_admin())
);

-- DELETE: Only system admins can delete reports
DROP POLICY IF EXISTS reports_delete ON public.reports;
CREATE POLICY reports_delete
ON public.reports
FOR DELETE
TO authenticated
USING ((SELECT public.is_system_admin()));

-- =============================================
-- PART 9: RLS POLICIES - moderation_events
-- =============================================

ALTER TABLE public.moderation_events ENABLE ROW LEVEL SECURITY;

-- SELECT: Class admins and system admins can view moderation events
DROP POLICY IF EXISTS moderation_select ON public.moderation_events;
CREATE POLICY moderation_select
ON public.moderation_events
FOR SELECT
TO authenticated
USING (
  (SELECT public.is_admin_of_class(class_id)) 
  OR (SELECT public.is_system_admin())
);

-- INSERT: Edge Functions can create moderation events (via service role)
-- No INSERT policy needed for authenticated users

-- UPDATE: Class admins and system admins can update moderation status
DROP POLICY IF EXISTS moderation_update ON public.moderation_events;
CREATE POLICY moderation_update
ON public.moderation_events
FOR UPDATE
TO authenticated
USING (
  (SELECT public.is_admin_of_class(class_id)) 
  OR (SELECT public.is_system_admin())
)
WITH CHECK (
  (SELECT public.is_admin_of_class(class_id)) 
  OR (SELECT public.is_system_admin())
);

-- =============================================
-- PART 10: RLS POLICIES - profiles
-- =============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can view all profiles (for displaying names in chat)
DROP POLICY IF EXISTS profiles_select_all ON public.profiles;
CREATE POLICY profiles_select_all
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- INSERT: Users can only create their own profile
DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
CREATE POLICY profiles_insert_own
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (user_id = (SELECT auth.uid()));

-- UPDATE: Users can update their own profile, admins can update any
DROP POLICY IF EXISTS profiles_update ON public.profiles;
CREATE POLICY profiles_update
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  user_id = (SELECT auth.uid())
  OR (SELECT public.is_system_admin())
)
WITH CHECK (
  user_id = (SELECT auth.uid())
  OR (SELECT public.is_system_admin())
);

-- =============================================
-- PART 11: RLS POLICIES - guardian_links
-- =============================================

ALTER TABLE public.guardian_links ENABLE ROW LEVEL SECURITY;

-- SELECT: Children and their guardians can view links
DROP POLICY IF EXISTS guardian_links_select ON public.guardian_links;
CREATE POLICY guardian_links_select
ON public.guardian_links
FOR SELECT
TO authenticated
USING (
  child_user_id = (SELECT auth.uid())
  OR guardian_user_id = (SELECT auth.uid())
  OR (SELECT public.is_system_admin())
);

-- INSERT: Guardians can create links to children
DROP POLICY IF EXISTS guardian_links_insert ON public.guardian_links;
CREATE POLICY guardian_links_insert
ON public.guardian_links
FOR INSERT
TO authenticated
WITH CHECK (
  guardian_user_id = (SELECT auth.uid())
  OR (SELECT public.is_system_admin())
);

-- UPDATE: Guardians can update their links
DROP POLICY IF EXISTS guardian_links_update ON public.guardian_links;
CREATE POLICY guardian_links_update
ON public.guardian_links
FOR UPDATE
TO authenticated
USING (
  guardian_user_id = (SELECT auth.uid())
  OR (SELECT public.is_system_admin())
)
WITH CHECK (
  guardian_user_id = (SELECT auth.uid())
  OR (SELECT public.is_system_admin())
);

-- DELETE: Guardians can delete their links
DROP POLICY IF EXISTS guardian_links_delete ON public.guardian_links;
CREATE POLICY guardian_links_delete
ON public.guardian_links
FOR DELETE
TO authenticated
USING (
  guardian_user_id = (SELECT auth.uid())
  OR (SELECT public.is_system_admin())
);

-- =============================================
-- PART 12: HARDEN EXISTING SECURITY DEFINER RPCs
-- =============================================

-- Update is_class_admin helper (used in RPCs)
CREATE OR REPLACE FUNCTION is_class_admin(p_user_id uuid, p_class_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT public.is_admin_of_class(p_class_id);
$$;

-- Update promote_to_class_admin with hardened header
CREATE OR REPLACE FUNCTION promote_to_class_admin(
  p_class_id uuid,
  p_user_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result json;
  v_current_role text;
BEGIN
  -- Check if caller is a class admin or system admin
  IF NOT ((SELECT public.is_admin_of_class(p_class_id)) OR (SELECT public.is_system_admin())) THEN
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

-- Update revoke_class_admin with hardened header
CREATE OR REPLACE FUNCTION revoke_class_admin(
  p_class_id uuid,
  p_user_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result json;
  v_current_role text;
  v_admin_count int;
BEGIN
  -- Check if caller is a class admin or system admin
  IF NOT ((SELECT public.is_admin_of_class(p_class_id)) OR (SELECT public.is_system_admin())) THEN
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

-- Update add_student_slots with hardened header
CREATE OR REPLACE FUNCTION add_student_slots(
  p_class_id uuid,
  p_count int
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_student_id uuid;
  i int;
  v_current_count int;
  v_result json;
BEGIN
  -- Check if caller is a class admin or system admin
  IF NOT ((SELECT public.is_admin_of_class(p_class_id)) OR (SELECT public.is_system_admin())) THEN
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

-- Update remove_placeholder_slot with hardened header
CREATE OR REPLACE FUNCTION remove_placeholder_slot(
  p_class_id uuid,
  p_placeholder_user_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result json;
BEGIN
  -- Check if caller is a class admin or system admin
  IF NOT ((SELECT public.is_admin_of_class(p_class_id)) OR (SELECT public.is_system_admin())) THEN
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

-- Update create_class_with_students with hardened header
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
SET search_path = public, pg_temp
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
  
  IF v_school_id IS NULL THEN
    SELECT id INTO v_school_id FROM public.schools WHERE name = p_school_name LIMIT 1;
  END IF;

  -- Generate unique invite code
  LOOP
    v_invite_code := generate_invite_code();
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.classes WHERE invite_code = v_invite_code);
  END LOOP;

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

  -- Create default "Klassechatten" room
  INSERT INTO public.rooms (class_id, name, type, created_by)
  VALUES (v_class_id, 'Klassechatten', 'general', p_creator_id)
  RETURNING id INTO v_room_id;

  -- Create placeholder students
  FOR i IN 1..p_student_count LOOP
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
        'display_name', 'Elev ' || i,
        'is_placeholder', true
      ),
      now(),
      now(),
      '',
      '',
      ''
    );

    INSERT INTO public.class_members (class_id, user_id, role_in_class)
    VALUES (v_class_id, v_student_id, 'child');
  END LOOP;

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

-- =============================================
-- PART 13: CLEANUP OLD SECURITY DEFINER HELPERS
-- =============================================

-- Drop old SECURITY DEFINER helper functions (replaced with STABLE helpers)
DROP FUNCTION IF EXISTS get_user_class_ids(uuid);
DROP FUNCTION IF EXISTS get_user_admin_class_ids(uuid);

-- =============================================
-- TEST PLAN & VALIDATION
-- =============================================

/*
TEST MATRIX - Run these tests with different roles:

1. CHILD (class member, not admin):
   -- Should see:
   SELECT * FROM class_members WHERE class_id = '<test_class_id>';  -- ✓ Own class members
   SELECT * FROM messages WHERE class_id = '<test_class_id>';       -- ✓ Own class messages
   SELECT * FROM rooms WHERE class_id = '<test_class_id>';          -- ✓ Own class rooms
   
   -- Should NOT be able to:
   INSERT INTO class_members (...);  -- ✗ Cannot add members
   UPDATE rooms SET name = 'x';      -- ✗ Cannot update rooms
   DELETE FROM messages;             -- ✗ Cannot delete messages

2. GUARDIAN (class member, not admin):
   -- Same as CHILD above
   
3. ADULT (class member WITH is_class_admin = true):
   -- Should see everything CHILD sees, PLUS:
   INSERT INTO class_members (...);   -- ✓ Can add members
   UPDATE rooms SET name = 'New';     -- ✓ Can update rooms
   DELETE FROM messages WHERE id=X;   -- ✓ Can delete messages
   UPDATE class_members SET role_in_class = 'adult';  -- ✓ Can update members

4. SYSTEM ADMIN (profiles.role = 'admin'):
   -- Should see and do EVERYTHING across ALL classes

5. NON-MEMBER (authenticated but not in class):
   SELECT * FROM class_members WHERE class_id = '<test_class_id>';  -- ✗ No results
   SELECT * FROM messages WHERE class_id = '<test_class_id>';       -- ✗ No results
   INSERT INTO messages (...);  -- ✗ Fails WITH CHECK

PERFORMANCE TESTS:
-- These should use indexes and be fast (< 10ms for 10k rows):
EXPLAIN ANALYZE SELECT * FROM messages WHERE class_id = '<class>' AND room_id = '<room>' ORDER BY created_at DESC LIMIT 50;
EXPLAIN ANALYZE SELECT * FROM class_members WHERE class_id = '<class>' AND status = 'active';

ROLLBACK PLAN:
If this migration causes issues:
1. Run the previous migration file: 20241113_update_default_room_name.sql
2. Or manually restore old SECURITY DEFINER helpers:
   - Recreate get_user_class_ids() and get_user_admin_class_ids()
   - Update policies to use those functions instead of new helpers

POLICY RATIONALE:

class_members:
- Members see other members in their classes (for UI display)
- Only class admins can modify membership (add/remove/promote)

schools:
- Members see schools where they have classes
- Anyone can create schools (during class creation flow)
- Only system admins can modify/delete schools

classes:
- Members see their own classes
- Creator can make initial class (created_by check)
- Class admins can update class settings
- Only system admins can delete classes

rooms:
- Members see rooms in their classes (read-only for non-admins)
- Class admins can create/update/delete rooms

messages:
- Members see messages in their classes
- Authors must be class members (enforced in WITH CHECK)
- Authors can edit own messages within 2 minutes
- Class admins can moderate (edit/delete) anytime

reports:
- Reporter, class admins, and system admins can view
- Any class member can create reports
- Class admins can update status
- Only system admins can delete
*/
