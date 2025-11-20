-- Function to get all users with auth data (email and last_sign_in_at)
-- This avoids the Supabase Auth API bug with NULL values in confirmation_token and email_change columns

CREATE OR REPLACE FUNCTION get_all_users_with_auth()
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  role TEXT,
  display_name TEXT,
  avatar_url TEXT,
  avatar_color TEXT,
  created_at TIMESTAMPTZ,
  last_sign_in_at TIMESTAMPTZ
)
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT 
    p.user_id,
    COALESCE(au.email, 'N/A') as email,
    p.role,
    p.display_name,
    p.avatar_url,
    p.avatar_color,
    p.created_at,
    au.last_sign_in_at
  FROM profiles p
  LEFT JOIN auth.users au ON au.id = p.user_id
  WHERE (p.is_placeholder IS NULL OR p.is_placeholder = false)
  ORDER BY p.created_at DESC;
$$;
