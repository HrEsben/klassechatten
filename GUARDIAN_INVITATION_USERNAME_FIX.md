# Guardian Invitation Username Fix - Complete

## Problem
Guardian email invitation system was failing with "Child account not found" error.

### Root Cause
- Database functions were querying `username` column from profiles table
- All 47 profiles in the database have `NULL` username values
- The `username` column was added via ALTER TABLE migration but never populated with data
- `display_name` column has values for all profiles and should be used instead

## Investigation
1. Checked profiles table structure - confirmed username column exists but is nullable
2. Queried all profiles:
   - Total: 47 profiles
   - With username: 0 (all NULL)
   - With display_name: 47 (all populated)
3. Checked specific child record (3c226cca-2e70-46f7-93d3-1fed590c753c):
   - username: NULL
   - display_name: "child_benny"

## Solution Applied

### 1. Updated Migration File
**File**: `/supabase/migrations/20241113_guardian_email_invitations.sql`

Changed all 3 occurrences from:
```sql
SELECT username INTO v_child_name FROM public.profiles WHERE user_id = p_child_id;
```

To:
```sql
SELECT display_name INTO v_child_name FROM public.profiles WHERE user_id = p_child_id;
```

### 2. Updated API Endpoint
**File**: `/apps/web/src/app/api/guardians/send-invite/route.ts`

Changed inviter profile query from:
```typescript
.select('username')
```

To:
```typescript
.select('display_name')
```

Changed child profile query from:
```typescript
.select('username')
```

To:
```typescript
.select('display_name')
```

Updated all references to use `.display_name` instead of `.username`:
- Email sending function parameters
- Notification body
- Notification data object

### 3. Deployed Database Functions
Executed SQL to recreate both functions with `display_name` instead of `username`:
- `create_guardian_invitation(UUID, UUID, TEXT)`
- `accept_guardian_invitation(TEXT)`

Both functions now:
- Query `display_name` from profiles table
- No longer fail when username is NULL
- Use existing, populated data

## Files Changed
1. `/supabase/migrations/20241113_guardian_email_invitations.sql` - 3 changes
2. `/apps/web/src/app/api/guardians/send-invite/route.ts` - 5 changes
3. Created `/fix_guardian_invitation_display_name.sql` - deployment script

## Testing
The invitation system should now work because:
- ✅ All profiles have `display_name` populated
- ✅ API endpoint queries `display_name` instead of `username`
- ✅ Database functions query `display_name` instead of `username`
- ✅ Functions deployed successfully to production database
- ✅ Permissions granted (EXECUTE to authenticated role)

## Next Steps
User should test the invitation flow:
1. Navigate to child profile page
2. Enter email address to invite second guardian
3. Verify invitation is created without errors
4. Check email delivery
5. Check in-app notification (if user exists)

## Alternative Solution (For Future Consideration)
If `username` needs to be populated for other features:
```sql
-- Backfill username from display_name for all existing profiles
UPDATE profiles
SET username = LOWER(REPLACE(display_name, ' ', '_'))
WHERE username IS NULL AND display_name IS NOT NULL;
```

However, this is NOT needed for the invitation system to work since we now use `display_name`.
