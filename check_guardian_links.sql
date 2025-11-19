-- Check guardian links in the database
-- Run this in Supabase SQL Editor to see what's actually stored

-- 1. Show all guardian links
SELECT 
  gl.guardian_user_id,
  gp.username as guardian_username,
  gp.display_name as guardian_name,
  gl.child_user_id,
  cp.username as child_username,
  cp.display_name as child_name,
  gl.created_at
FROM guardian_links gl
JOIN profiles gp ON gl.guardian_user_id = gp.user_id
JOIN profiles cp ON gl.child_user_id = cp.user_id
ORDER BY gl.created_at DESC;

-- 2. Show pending invitations
SELECT 
  gi.id,
  gi.invited_email,
  gi.status,
  gi.expires_at,
  cp.username as child_username,
  cp.display_name as child_name,
  gp.username as inviter_username,
  gi.created_at,
  gi.accepted_at
FROM guardian_invitations gi
JOIN profiles cp ON gi.child_id = cp.user_id
LEFT JOIN profiles gp ON gi.inviter_guardian_id = gp.user_id
ORDER BY gi.created_at DESC
LIMIT 20;

-- 3. Show all profiles with their roles
SELECT 
  p.user_id,
  p.username,
  p.display_name,
  au.email,
  p.role,
  p.created_at
FROM profiles p
LEFT JOIN auth.users au ON p.user_id = au.id
ORDER BY p.created_at DESC
LIMIT 20;

-- 4. Check for a specific user (replace the email)
SELECT 
  p.user_id,
  p.username,
  p.display_name,
  au.email,
  p.role,
  COUNT(gl.child_user_id) as child_count
FROM profiles p
LEFT JOIN auth.users au ON p.user_id = au.id
LEFT JOIN guardian_links gl ON p.user_id = gl.guardian_user_id
WHERE au.email = 'far@optus.dk'  -- Change this to your email
GROUP BY p.user_id, p.username, p.display_name, au.email, p.role;
