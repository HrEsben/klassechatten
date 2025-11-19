# Deploy Child Account Function

## ❌ Error
```
Could not find the function public.create_child_account(...) in the schema cache
```

## 🔍 Cause
The migration `20241113_username_auth.sql` hasn't been applied to your database yet.

## ✅ Solution

### Option 1: Deploy via Supabase CLI (Recommended)
```bash
cd /Users/esbenpro/Documents/KlasseChatten
supabase db push
```

### Option 2: Deploy via SQL Editor (If CLI fails)
1. Open Supabase Dashboard: https://supabase.com/dashboard/project/uxdmqhgilcynzxjpbfui/sql/new
2. Open file: `supabase/migrations/20241113_username_auth.sql`
3. Copy the entire content (171 lines)
4. Paste into SQL Editor
5. Click "Run"

### Option 3: Deploy via psql
```bash
psql "postgresql://postgres.uxdmqhgilcynzxjpbfui:[YOUR-PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres" < supabase/migrations/20241113_username_auth.sql
```

## 🔬 Verify Deployment
After deploying, test in SQL Editor:
```sql
-- Check if function exists
SELECT proname, pronargs 
FROM pg_proc 
WHERE proname = 'create_child_account';
```

Should return:
```
proname              | pronargs
---------------------|----------
create_child_account | 6
```

## 📦 What This Migration Does
1. Creates `create_child_account()` function to:
   - Validate parent is member of class
   - Check username availability
   - Create child auth account via auth.users
   - Link child to parent via `guardian_links`
   - Add child to class as student
   - Return complete child profile

2. Grants execute permission to authenticated users

## 🔗 Related Migrations (Deploy in Order)
1. ✅ `20241113_username_auth.sql` - **This one** (child account creation)
2. ⏳ `20241119_guardian_invite_codes.sql` - Guardian invite codes (deploy next)

## 📝 Function Signature
```sql
CREATE OR REPLACE FUNCTION create_child_account(
  p_class_id uuid,
  p_parent_id uuid,
  p_child_username text,
  p_child_display_name text,
  p_child_password text,
  p_child_email text DEFAULT NULL
)
RETURNS json
```

## 🎯 Quick Fix
If you want to test the create-child page immediately:

1. Go to Supabase SQL Editor
2. Run this migration file
3. Refresh the web app
4. Try creating a child again
