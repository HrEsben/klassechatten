-- Sample data for testing KlasseChatten
-- Run this AFTER you have signed up at least one user

-- Insert a test school
insert into public.schools (id, name, municipality) values
  ('00000000-0000-0000-0000-000000000001', 'Testskole', 'København')
on conflict (id) do nothing;

-- Get the current user's ID (the one running this query)
-- This works if you're logged in through Supabase dashboard
do $$
declare
  current_user_id uuid;
  class_uuid uuid := '00000000-0000-0000-0000-000000000002';
  room_general_uuid uuid := '00000000-0000-0000-0000-000000000003';
  room_topic_uuid uuid := '00000000-0000-0000-0000-000000000004';
begin
  -- Get any existing user from auth.users (pick the first one)
  select id into current_user_id from auth.users limit 1;
  
  if current_user_id is null then
    raise notice 'No users found. Please sign up first through the app.';
    return;
  end if;

  raise notice 'Using user ID: %', current_user_id;

  -- Create a test class
  insert into public.classes (id, school_id, label, grade_level, invite_code, created_by)
  values (class_uuid, '00000000-0000-0000-0000-000000000001', '3.A', 3, 'ABC123XY', current_user_id)
  on conflict (id) do nothing;

  -- Add user as class member
  insert into public.class_members (class_id, user_id, role_in_class)
  values (class_uuid, current_user_id, 'child')
  on conflict (class_id, user_id) do nothing;

  -- Create rooms
  insert into public.rooms (id, class_id, name, type, created_by)
  values 
    (room_general_uuid, class_uuid, 'general', 'general', current_user_id),
    (room_topic_uuid, class_uuid, 'lektier', 'topic', current_user_id)
  on conflict (id) do nothing;

  -- Add some sample messages
  insert into public.messages (room_id, class_id, user_id, body)
  values 
    (room_general_uuid, class_uuid, current_user_id, 'Hej alle sammen! 👋'),
    (room_general_uuid, class_uuid, current_user_id, 'Velkommen til 3.A!'),
    (room_topic_uuid, class_uuid, current_user_id, 'Husk at lave matematiklektier til i morgen');

  raise notice 'Sample data created successfully!';
end $$;
