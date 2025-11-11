-- Fix RLS policies for class/room navigation
-- This fixes the stack depth issue by disabling RLS temporarily on class_members
-- and using service role for admin operations

-- TEMPORARY FIX: Disable RLS on class_members to break circular dependency
-- This allows the query to work. We'll add back proper RLS in production.
alter table public.class_members disable row level security;

-- Drop all existing problematic policies
drop policy if exists "Class members can view profiles in their classes" on public.profiles;
drop policy if exists "Users can view profiles" on public.profiles;
drop policy if exists "Users can view schools for their classes" on public.schools;
drop policy if exists "Authenticated users can view schools" on public.schools;
drop policy if exists "Users can view classes they are members of" on public.classes;
drop policy if exists "Users can view their classes" on public.classes;
drop policy if exists "Users can view class members in their classes" on public.class_members;
drop policy if exists "Users can view members in their classes" on public.class_members;

-- Schools: Simple policy - all authenticated users can view schools
create policy "Authenticated users can view schools"
  on public.schools for select
  to authenticated
  using (true);

-- Profiles: All authenticated users can view all profiles
-- This is needed for displaying usernames in chat
create policy "Users can view profiles"
  on public.profiles for select
  to authenticated
  using (true);

-- Classes: Users can view classes where they are members
-- This now works because class_members has RLS disabled
create policy "Users can view their classes"
  on public.classes for select
  to authenticated
  using (
    id in (
      select class_id from public.class_members
      where user_id = auth.uid()
      and status = 'active'
    )
  );

-- NOTE: class_members RLS is disabled to prevent circular dependency
-- In production, you should implement this at the application layer
-- or use a more sophisticated RLS setup with helper functions
