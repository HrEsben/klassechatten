-- =============================================
-- Drop all old policies that are causing conflicts
-- These are the policies with natural language names that call
-- non-existent or broken helper functions
-- =============================================

-- Drop old class_members policies
DROP POLICY IF EXISTS "Admins can manage all class members" ON public.class_members;
DROP POLICY IF EXISTS "Admins can view all class members" ON public.class_members;
DROP POLICY IF EXISTS "Class admins can add members" ON public.class_members;
DROP POLICY IF EXISTS "Class admins can remove members" ON public.class_members;
DROP POLICY IF EXISTS "Class admins can update members" ON public.class_members;
DROP POLICY IF EXISTS "class_members read for members" ON public.class_members;
DROP POLICY IF EXISTS "Users can view members in their classes" ON public.class_members;
DROP POLICY IF EXISTS "Users can view class members including placeholders" ON public.class_members;

-- Drop old classes policies
DROP POLICY IF EXISTS "classes read for members" ON public.classes;
DROP POLICY IF EXISTS "Users can view their classes" ON public.classes;

-- Drop old messages policies
DROP POLICY IF EXISTS "adult can delete" ON public.messages;
DROP POLICY IF EXISTS "adult can moderate (update/delete)" ON public.messages;
DROP POLICY IF EXISTS "child/guardian insert own messages" ON public.messages;
DROP POLICY IF EXISTS "edit own within grace" ON public.messages;
DROP POLICY IF EXISTS "messages read for members" ON public.messages;

-- Drop old profiles policies
DROP POLICY IF EXISTS "profiles self read" ON public.profiles;
DROP POLICY IF EXISTS "profiles self write" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles" ON public.profiles;

-- Drop old schools policies
DROP POLICY IF EXISTS "Admins can delete schools" ON public.schools;
DROP POLICY IF EXISTS "Admins can update schools" ON public.schools;
DROP POLICY IF EXISTS "Admins can view all schools" ON public.schools;
DROP POLICY IF EXISTS "Authenticated users can create schools" ON public.schools;
DROP POLICY IF EXISTS "Authenticated users can view schools" ON public.schools;
DROP POLICY IF EXISTS "Users can view schools they belong to" ON public.schools;

-- Drop old rooms policies
DROP POLICY IF EXISTS "rooms read for members" ON public.rooms;

-- Drop old reports policies
DROP POLICY IF EXISTS "reports insert for members" ON public.reports;
DROP POLICY IF EXISTS "reports read for class adults" ON public.reports;

-- Drop old read_receipts policies (if any exist)
DROP POLICY IF EXISTS "Users can insert their own read receipts" ON public.read_receipts;
DROP POLICY IF EXISTS "Users can update their own read receipts" ON public.read_receipts;
DROP POLICY IF EXISTS "Users can view read receipts in their classes" ON public.read_receipts;

-- The new policies (cm_select_members, etc.) should remain intact
-- They were created by the 20241114_rls_hardening.sql migration
