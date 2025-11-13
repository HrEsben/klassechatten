-- =============================================
-- EMERGENCY ROLLBACK: Reset to Known Working State
-- Date: 2024-11-14
-- Description: Drop ALL RLS policies and helper functions, then rebuild from scratch
--
-- This migration:
-- 1. Drops ALL policies on all tables
-- 2. Drops ALL helper functions (old and new)
-- 3. Recreates ONLY the working helper functions with SECURITY DEFINER
-- 4. Recreates clean, minimal policies
--
-- Run this to fix infinite recursion caused by conflicting policies
-- =============================================

-- =============================================
-- STEP 1: DROP ALL EXISTING POLICIES
-- =============================================

-- Drop class_members policies
DROP POLICY IF EXISTS cm_select_members ON public.class_members;
DROP POLICY IF EXISTS cm_insert_by_admin ON public.class_members;
DROP POLICY IF EXISTS cm_update_by_admin ON public.class_members;
DROP POLICY IF EXISTS cm_delete_by_admin ON public.class_members;
DROP POLICY IF EXISTS class_members_select ON public.class_members;
DROP POLICY IF EXISTS class_members_insert ON public.class_members;
DROP POLICY IF EXISTS class_members_update ON public.class_members;
DROP POLICY IF EXISTS class_members_delete ON public.class_members;

-- Drop schools policies
DROP POLICY IF EXISTS schools_select_own ON public.schools;
DROP POLICY IF EXISTS schools_insert_any ON public.schools;
DROP POLICY IF EXISTS schools_update_admin ON public.schools;
DROP POLICY IF EXISTS schools_delete_admin ON public.schools;
DROP POLICY IF EXISTS schools_select ON public.schools;
DROP POLICY IF EXISTS schools_insert ON public.schools;
DROP POLICY IF EXISTS schools_update ON public.schools;
DROP POLICY IF EXISTS schools_delete ON public.schools;

-- Drop classes policies
DROP POLICY IF EXISTS classes_select ON public.classes;
DROP POLICY IF EXISTS classes_insert ON public.classes;
DROP POLICY IF EXISTS classes_update ON public.classes;
DROP POLICY IF EXISTS classes_delete ON public.classes;

-- Drop rooms policies
DROP POLICY IF EXISTS rooms_select ON public.rooms;
DROP POLICY IF EXISTS rooms_insert ON public.rooms;
DROP POLICY IF EXISTS rooms_update ON public.rooms;
DROP POLICY IF EXISTS rooms_delete ON public.rooms;

-- Drop messages policies
DROP POLICY IF EXISTS msg_select ON public.messages;
DROP POLICY IF EXISTS msg_insert_own ON public.messages;
DROP POLICY IF EXISTS msg_update ON public.messages;
DROP POLICY IF EXISTS msg_delete ON public.messages;
DROP POLICY IF EXISTS messages_select ON public.messages;
DROP POLICY IF EXISTS messages_insert ON public.messages;
DROP POLICY IF EXISTS messages_update ON public.messages;
DROP POLICY IF EXISTS messages_delete ON public.messages;

-- Drop reports policies
DROP POLICY IF EXISTS reports_select ON public.reports;
DROP POLICY IF EXISTS reports_insert ON public.reports;
DROP POLICY IF EXISTS reports_update_admin ON public.reports;
DROP POLICY IF EXISTS reports_delete ON public.reports;

-- Drop moderation_events policies
DROP POLICY IF EXISTS moderation_select ON public.moderation_events;
DROP POLICY IF EXISTS moderation_update ON public.moderation_events;

-- Drop profiles policies
DROP POLICY IF EXISTS profiles_select_all ON public.profiles;
DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
DROP POLICY IF EXISTS profiles_update ON public.profiles;

-- Drop guardian_links policies
DROP POLICY IF EXISTS guardian_links_select ON public.guardian_links;
DROP POLICY IF EXISTS guardian_links_insert ON public.guardian_links;
DROP POLICY IF EXISTS guardian_links_update ON public.guardian_links;
DROP POLICY IF EXISTS guardian_links_delete ON public.guardian_links;

-- =============================================
-- STEP 2: DROP ALL HELPER FUNCTIONS
-- =============================================

-- Drop new helper functions
DROP FUNCTION IF EXISTS public.is_system_admin();
DROP FUNCTION IF EXISTS public.is_member_of_class(uuid);
DROP FUNCTION IF EXISTS public.is_admin_of_class(uuid);

-- Drop old helper functions
DROP FUNCTION IF EXISTS public.get_user_class_ids(uuid);
DROP FUNCTION IF EXISTS public.get_user_admin_class_ids(uuid);

-- =============================================
-- STEP 3: CREATE SECURITY DEFINER HELPER FUNCTIONS
-- =============================================

-- Get all class IDs where user is an active member
CREATE OR REPLACE FUNCTION public.get_user_class_ids(p_user_id uuid)
RETURNS TABLE(class_id uuid)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT cm.class_id
  FROM public.class_members cm
  WHERE cm.user_id = p_user_id
    AND cm.status = 'active';
$$;

-- Get all class IDs where user is a class admin
CREATE OR REPLACE FUNCTION public.get_user_admin_class_ids(p_user_id uuid)
RETURNS TABLE(class_id uuid)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT cm.class_id
  FROM public.class_members cm
  WHERE cm.user_id = p_user_id
    AND cm.status = 'active'
    AND cm.is_class_admin = true;
$$;

-- Check if user is system admin
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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_user_class_ids TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_admin_class_ids TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_system_admin TO authenticated;

-- =============================================
-- STEP 4: CREATE CLEAN RLS POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE public.class_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guardian_links ENABLE ROW LEVEL SECURITY;

-- =============================================
-- class_members policies
-- =============================================

CREATE POLICY class_members_select
ON public.class_members
FOR SELECT
TO authenticated
USING (
  class_id IN (SELECT get_user_class_ids(auth.uid()))
  OR (SELECT is_system_admin())
);

CREATE POLICY class_members_insert
ON public.class_members
FOR INSERT
TO authenticated
WITH CHECK (
  class_id IN (SELECT get_user_admin_class_ids(auth.uid()))
  OR (SELECT is_system_admin())
);

CREATE POLICY class_members_update
ON public.class_members
FOR UPDATE
TO authenticated
USING (
  class_id IN (SELECT get_user_admin_class_ids(auth.uid()))
  OR (SELECT is_system_admin())
)
WITH CHECK (
  class_id IN (SELECT get_user_admin_class_ids(auth.uid()))
  OR (SELECT is_system_admin())
);

CREATE POLICY class_members_delete
ON public.class_members
FOR DELETE
TO authenticated
USING (
  class_id IN (SELECT get_user_admin_class_ids(auth.uid()))
  OR (SELECT is_system_admin())
);

-- =============================================
-- schools policies
-- =============================================

CREATE POLICY schools_select
ON public.schools
FOR SELECT
TO authenticated
USING (
  (SELECT is_system_admin())
  OR EXISTS (
    SELECT 1
    FROM public.classes c
    WHERE c.school_id = schools.id
      AND c.id IN (SELECT get_user_class_ids(auth.uid()))
  )
);

CREATE POLICY schools_insert
ON public.schools
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY schools_update
ON public.schools
FOR UPDATE
TO authenticated
USING ((SELECT is_system_admin()))
WITH CHECK ((SELECT is_system_admin()));

CREATE POLICY schools_delete
ON public.schools
FOR DELETE
TO authenticated
USING ((SELECT is_system_admin()));

-- =============================================
-- classes policies
-- =============================================

CREATE POLICY classes_select
ON public.classes
FOR SELECT
TO authenticated
USING (
  id IN (SELECT get_user_class_ids(auth.uid()))
  OR (SELECT is_system_admin())
);

CREATE POLICY classes_insert
ON public.classes
FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());

CREATE POLICY classes_update
ON public.classes
FOR UPDATE
TO authenticated
USING (
  id IN (SELECT get_user_admin_class_ids(auth.uid()))
  OR (SELECT is_system_admin())
)
WITH CHECK (
  id IN (SELECT get_user_admin_class_ids(auth.uid()))
  OR (SELECT is_system_admin())
);

CREATE POLICY classes_delete
ON public.classes
FOR DELETE
TO authenticated
USING ((SELECT is_system_admin()));

-- =============================================
-- rooms policies
-- =============================================

CREATE POLICY rooms_select
ON public.rooms
FOR SELECT
TO authenticated
USING (
  class_id IN (SELECT get_user_class_ids(auth.uid()))
  OR (SELECT is_system_admin())
);

CREATE POLICY rooms_insert
ON public.rooms
FOR INSERT
TO authenticated
WITH CHECK (
  class_id IN (SELECT get_user_admin_class_ids(auth.uid()))
  OR (SELECT is_system_admin())
);

CREATE POLICY rooms_update
ON public.rooms
FOR UPDATE
TO authenticated
USING (
  class_id IN (SELECT get_user_admin_class_ids(auth.uid()))
  OR (SELECT is_system_admin())
)
WITH CHECK (
  class_id IN (SELECT get_user_admin_class_ids(auth.uid()))
  OR (SELECT is_system_admin())
);

CREATE POLICY rooms_delete
ON public.rooms
FOR DELETE
TO authenticated
USING (
  class_id IN (SELECT get_user_admin_class_ids(auth.uid()))
  OR (SELECT is_system_admin())
);

-- =============================================
-- messages policies
-- =============================================

CREATE POLICY messages_select
ON public.messages
FOR SELECT
TO authenticated
USING (
  class_id IN (SELECT get_user_class_ids(auth.uid()))
  OR (SELECT is_system_admin())
);

CREATE POLICY messages_insert
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND class_id IN (SELECT get_user_class_ids(auth.uid()))
);

CREATE POLICY messages_update
ON public.messages
FOR UPDATE
TO authenticated
USING (
  (user_id = auth.uid() AND now() - created_at < interval '2 minutes')
  OR class_id IN (SELECT get_user_admin_class_ids(auth.uid()))
  OR (SELECT is_system_admin())
)
WITH CHECK (
  (user_id = auth.uid() AND now() - created_at < interval '2 minutes')
  OR class_id IN (SELECT get_user_admin_class_ids(auth.uid()))
  OR (SELECT is_system_admin())
);

CREATE POLICY messages_delete
ON public.messages
FOR DELETE
TO authenticated
USING (
  class_id IN (SELECT get_user_admin_class_ids(auth.uid()))
  OR (SELECT is_system_admin())
);

-- =============================================
-- reports policies
-- =============================================

CREATE POLICY reports_select
ON public.reports
FOR SELECT
TO authenticated
USING (
  reporter_user_id = auth.uid()
  OR class_id IN (SELECT get_user_admin_class_ids(auth.uid()))
  OR (SELECT is_system_admin())
);

CREATE POLICY reports_insert
ON public.reports
FOR INSERT
TO authenticated
WITH CHECK (
  reporter_user_id = auth.uid()
  AND class_id IN (SELECT get_user_class_ids(auth.uid()))
);

CREATE POLICY reports_update
ON public.reports
FOR UPDATE
TO authenticated
USING (
  class_id IN (SELECT get_user_admin_class_ids(auth.uid()))
  OR (SELECT is_system_admin())
)
WITH CHECK (
  class_id IN (SELECT get_user_admin_class_ids(auth.uid()))
  OR (SELECT is_system_admin())
);

CREATE POLICY reports_delete
ON public.reports
FOR DELETE
TO authenticated
USING ((SELECT is_system_admin()));

-- =============================================
-- moderation_events policies
-- =============================================

CREATE POLICY moderation_select
ON public.moderation_events
FOR SELECT
TO authenticated
USING (
  class_id IN (SELECT get_user_admin_class_ids(auth.uid()))
  OR (SELECT is_system_admin())
);

CREATE POLICY moderation_update
ON public.moderation_events
FOR UPDATE
TO authenticated
USING (
  class_id IN (SELECT get_user_admin_class_ids(auth.uid()))
  OR (SELECT is_system_admin())
)
WITH CHECK (
  class_id IN (SELECT get_user_admin_class_ids(auth.uid()))
  OR (SELECT is_system_admin())
);

-- =============================================
-- profiles policies
-- =============================================

CREATE POLICY profiles_select
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY profiles_insert
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY profiles_update
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid()
  OR (SELECT is_system_admin())
)
WITH CHECK (
  user_id = auth.uid()
  OR (SELECT is_system_admin())
);

-- =============================================
-- guardian_links policies
-- =============================================

CREATE POLICY guardian_links_select
ON public.guardian_links
FOR SELECT
TO authenticated
USING (
  child_user_id = auth.uid()
  OR guardian_user_id = auth.uid()
  OR (SELECT is_system_admin())
);

CREATE POLICY guardian_links_insert
ON public.guardian_links
FOR INSERT
TO authenticated
WITH CHECK (
  guardian_user_id = auth.uid()
  OR (SELECT is_system_admin())
);

CREATE POLICY guardian_links_update
ON public.guardian_links
FOR UPDATE
TO authenticated
USING (
  guardian_user_id = auth.uid()
  OR (SELECT is_system_admin())
)
WITH CHECK (
  guardian_user_id = auth.uid()
  OR (SELECT is_system_admin())
);

CREATE POLICY guardian_links_delete
ON public.guardian_links
FOR DELETE
TO authenticated
USING (
  guardian_user_id = auth.uid()
  OR (SELECT is_system_admin())
);

-- =============================================
-- VERIFICATION
-- =============================================

-- This should now work without infinite recursion:
-- SELECT * FROM class_members WHERE user_id = auth.uid();
