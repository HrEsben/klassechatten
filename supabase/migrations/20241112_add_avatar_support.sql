-- Add avatar support to profiles table
-- Migration: 20241112_add_avatar_support.sql

-- Add avatar_url column to profiles table
alter table public.profiles 
add column if not exists avatar_url text;

-- Add avatar_color column for fallback colored avatars with initials
alter table public.profiles 
add column if not exists avatar_color text default '#3B82F6';

-- Update RLS policies to include avatar fields
drop policy if exists "Users can view all profiles" on public.profiles;
create policy "Users can view all profiles" 
  on public.profiles for select 
  to authenticated 
  using (true);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" 
  on public.profiles for update 
  to authenticated 
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Create a function to generate avatar colors based on display_name
create or replace function public.generate_avatar_color(display_name text)
returns text
language plpgsql
as $$
declare
  colors text[] := array[
    '#3B82F6', '#8B5CF6', '#EF4444', '#F59E0B', 
    '#10B981', '#06B6D4', '#EC4899', '#84CC16',
    '#6366F1', '#F97316', '#14B8A6', '#F43F5E'
  ];
  hash_value int;
begin
  -- Generate a simple hash from the display_name
  hash_value := abs(hashtext(display_name)) % array_length(colors, 1) + 1;
  return colors[hash_value];
end;
$$;

-- Update existing profiles with generated avatar colors
update public.profiles 
set avatar_color = public.generate_avatar_color(display_name)
where avatar_color is null or avatar_color = '#3B82F6';

-- Add a trigger to automatically set avatar_color for new profiles
create or replace function public.set_profile_avatar_color()
returns trigger
language plpgsql
as $$
begin
  if new.avatar_color is null or new.avatar_color = '#3B82F6' then
    new.avatar_color := public.generate_avatar_color(new.display_name);
  end if;
  return new;
end;
$$;

drop trigger if exists set_avatar_color_trigger on public.profiles;
create trigger set_avatar_color_trigger
  before insert or update of display_name on public.profiles
  for each row
  execute function public.set_profile_avatar_color();