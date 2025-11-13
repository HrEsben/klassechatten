# Admin Role Setup Guide

## Overview
This migration adds admin role support to KlasseChatten and assigns admin privileges to `esben@optus.dk`.

## What This Migration Does

1. **Updates Role Constraints**
   - Adds `'admin'` to the allowed roles in `profiles` table
   - Adds `'admin'` to the allowed roles in `class_members` table

2. **Assigns Admin Role**
   - Sets `esben@optus.dk` as an admin user
   - If the user doesn't exist yet, the migration will log a notice

3. **Creates Admin Privileges (RLS Policies)**
   - Admins can view and manage ALL profiles
   - Admins can view and manage ALL classes
   - Admins can view and manage ALL messages
   - Admins can view and manage ALL rooms
   - Admins can view and manage ALL reports
   - Admins can view and manage ALL moderation events
   - Admins can view and manage ALL schools

4. **Helper Function**
   - Creates `is_admin()` function to check if current user is admin
   - Can be used in other policies or application logic

## How to Deploy

### Option 1: Via Supabase Dashboard (Recommended for First Time)

1. Go to your Supabase project: https://supabase.com/dashboard/project/uxdmqhgilcynzxjpbfui
2. Navigate to **SQL Editor**
3. Open the file: `supabase/migrations/20241113_add_admin_role.sql`
4. Copy the entire SQL content
5. Paste it into the SQL Editor
6. Click **Run** to execute the migration

### Option 2: Via Supabase CLI

```bash
# Make sure you're in the project root
cd /Users/esbenpro/Documents/KlasseChatten

# Link to your project (if not already linked)
supabase link --project-ref uxdmqhgilcynzxjpbfui

# Apply the migration
supabase db push
```

## Verification

After running the migration, verify the admin role was assigned:

```sql
-- Check if esben@optus.dk has admin role
SELECT 
  p.user_id,
  u.email,
  p.role,
  p.display_name
FROM public.profiles p
JOIN auth.users u ON p.user_id = u.id
WHERE u.email = 'esben@optus.dk';
```

Expected result:
```
user_id                              | email           | role  | display_name
-------------------------------------|-----------------|-------|-------------
<uuid>                               | esben@optus.dk  | admin | <name>
```

## Testing Admin Privileges

Once deployed and logged in as `esben@optus.dk`, you should be able to:

- ✅ View all profiles across all classes
- ✅ View and manage all classes
- ✅ View and manage all messages in any room
- ✅ View and manage all reports
- ✅ View and manage moderation events
- ✅ Create, update, and delete rooms
- ✅ Access all schools data

## Frontend Updates

The frontend is already prepared to display "Admin" for users with the admin role:

- Header will show **"ADMIN"** instead of "Bruger"
- `useUserProfile` hook supports the admin role
- Role label mapping: `admin` → `"Admin"`

## Security Notes

⚠️ **Important**: Admin role bypasses most RLS policies. Only assign this role to trusted users who need full system access.

## Rollback (If Needed)

If you need to remove admin privileges:

```sql
-- Remove admin role from user
UPDATE public.profiles
SET role = 'adult'  -- or 'child' / 'guardian' as appropriate
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'esben@optus.dk');

-- To completely remove admin role from system (not recommended unless needed):
-- ALTER TABLE public.profiles DROP CONSTRAINT profiles_role_check;
-- ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('child', 'guardian', 'adult'));
```

## Future Admin Management

To add more admins in the future:

```sql
-- Set another user as admin
UPDATE public.profiles
SET role = 'admin'
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'new-admin@example.com');
```

To check all current admins:

```sql
SELECT 
  p.user_id,
  u.email,
  p.display_name,
  p.created_at
FROM public.profiles p
JOIN auth.users u ON p.user_id = u.id
WHERE p.role = 'admin'
ORDER BY p.created_at;
```
