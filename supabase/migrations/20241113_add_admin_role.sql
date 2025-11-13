-- Add admin role to the system
-- Date: 2025-11-13

-- Step 1: Update the role check constraint to include 'admin'
ALTER TABLE public.profiles 
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles 
  ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('child', 'guardian', 'adult', 'admin'));

-- Step 2: Update class_members role check to include 'admin'
ALTER TABLE public.class_members 
  DROP CONSTRAINT IF EXISTS class_members_role_in_class_check;

ALTER TABLE public.class_members 
  ADD CONSTRAINT class_members_role_in_class_check 
  CHECK (role_in_class IN ('child', 'guardian', 'adult', 'admin'));

-- Step 3: Set esben@optus.dk as admin
-- First, get the user_id for esben@optus.dk
DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Get the user ID from auth.users
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = 'esben@optus.dk';

  -- If user exists, update their role to admin
  IF admin_user_id IS NOT NULL THEN
    UPDATE public.profiles
    SET role = 'admin'
    WHERE user_id = admin_user_id;

    RAISE NOTICE 'Admin role assigned to esben@optus.dk (user_id: %)', admin_user_id;
  ELSE
    RAISE NOTICE 'User esben@optus.dk not found in auth.users';
  END IF;
END $$;

-- Step 4: Create RLS policies for admin users
-- Admins can view all profiles
CREATE POLICY IF NOT EXISTS "Admins can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can update all profiles
CREATE POLICY IF NOT EXISTS "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can view all classes
CREATE POLICY IF NOT EXISTS "Admins can view all classes"
  ON public.classes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can manage all classes
CREATE POLICY IF NOT EXISTS "Admins can manage all classes"
  ON public.classes FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can view all messages
CREATE POLICY IF NOT EXISTS "Admins can view all messages"
  ON public.messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can manage all messages
CREATE POLICY IF NOT EXISTS "Admins can manage all messages"
  ON public.messages FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can view all rooms
CREATE POLICY IF NOT EXISTS "Admins can view all rooms"
  ON public.rooms FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can manage all rooms
CREATE POLICY IF NOT EXISTS "Admins can manage all rooms"
  ON public.rooms FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can view all reports
CREATE POLICY IF NOT EXISTS "Admins can view all reports"
  ON public.reports FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can manage all reports
CREATE POLICY IF NOT EXISTS "Admins can manage all reports"
  ON public.reports FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can view all moderation events
CREATE POLICY IF NOT EXISTS "Admins can view all moderation events"
  ON public.moderation_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can manage all moderation events
CREATE POLICY IF NOT EXISTS "Admins can manage all moderation events"
  ON public.moderation_events FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can view all schools
CREATE POLICY IF NOT EXISTS "Admins can view all schools"
  ON public.schools FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can manage all schools
CREATE POLICY IF NOT EXISTS "Admins can manage all schools"
  ON public.schools FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Step 5: Create a helper function to check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND role = 'admin'
  );
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

COMMENT ON FUNCTION public.is_admin() IS 'Returns true if the current user has admin role';
