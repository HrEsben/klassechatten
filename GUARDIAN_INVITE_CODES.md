# Guardian Invite Code System - Deployment Guide

## Overview
This feature allows Guardian #1 (parent who created the child account) to generate invite codes for Guardian #2 (second parent) to establish a relationship with the child account.

## Components

### 1. Database Changes
**File:** `supabase/migrations/20241119_guardian_invite_codes.sql`

**What it does:**
- Adds `invite_code`, `code_generated_at`, `code_used_at`, `max_guardians` columns to `guardian_links` table
- Creates function `generate_guardian_invite_code()` - Guardian #1 generates unique 8-char code
- Creates function `claim_guardian_invite_code()` - Guardian #2 uses code to link to child
- Creates function `get_guardian_children_with_codes()` - View children with their invite codes

**Deploy:**
```bash
# Via Supabase Dashboard
1. Open SQL Editor
2. Copy contents of migration file
3. Run migration

# Via Supabase CLI
supabase db push
```

### 2. API Routes

**Created files:**
- `/apps/web/src/app/api/guardians/generate-invite/route.ts` - Generate invite code
- `/apps/web/src/app/api/guardians/claim-invite/route.ts` - Claim invite code
- `/apps/web/src/app/api/guardians/my-children/route.ts` - List children with codes

**Deploy:** No action needed - deployed with Next.js app

### 3. UI Components

**Modified:**
- `/apps/web/src/app/create-child/page.tsx` - Added "Inviter Anden Forælder" section after child creation
- `/apps/web/src/app/onboarding/page.tsx` - Added "Forældre-Kode" card and claim form

**New:**
- `/apps/web/src/app/my-children/page.tsx` - Page to manage children and invite codes

**Deploy:** No action needed - deployed with Next.js app

## User Flow

### Guardian #1 (Parent who creates the child)
1. Goes to `/create-child` and creates child account
2. After creation, sees "Inviter Anden Forælder" section
3. Clicks "Generer Forældre-Kode" button
4. Receives unique 8-character code (e.g., "ABC12XYZ")
5. Shares code with Guardian #2 via SMS, email, etc.

**Alternative:** Guardian #1 can also manage codes from `/my-children` page

### Guardian #2 (Second parent)
1. Signs up on KlasseChatten as normal guardian
2. After signup, redirected to `/onboarding`
3. Sees three options: "Opret Klasse", "Brug Invitation", "Forældre-Kode"
4. Clicks "Forældre-Kode" card
5. Enters 8-character code received from Guardian #1
6. Clicks "Tilknyt Elev"
7. System creates `guardian_link` entry
8. System adds Guardian #2 to child's classes automatically
9. Guardian #2 now has access to child's data

## Security Features

1. **Code uniqueness** - 8 characters, uppercase, no confusing characters (0O1IL replaced)
2. **Single use** - Code marked as used after claimed
3. **Authorization check** - Only linked guardian can generate codes
4. **Max guardians** - Enforced limit of 2 guardians per child
5. **Consent tracking** - Timestamps for code generation and usage

## Testing Checklist

### Database Functions
```sql
-- Test 1: Generate code as Guardian #1
SELECT generate_guardian_invite_code(
  '<child_user_id>',
  '<guardian_1_user_id>'
);
-- Should return 8-char code

-- Test 2: Claim code as Guardian #2
SELECT claim_guardian_invite_code(
  'ABC12XYZ',
  '<guardian_2_user_id>'
);
-- Should return success JSON with child info

-- Test 3: Try to claim used code
SELECT claim_guardian_invite_code(
  'ABC12XYZ',
  '<guardian_3_user_id>'
);
-- Should raise exception: "Invalid or already used invite code"

-- Test 4: Try to add 3rd guardian
-- Should raise exception: "Maximum guardians (2) already linked"

-- Test 5: View children with codes
SELECT * FROM get_guardian_children_with_codes('<guardian_1_user_id>');
-- Should return all children with invite code status
```

### UI Testing

**Guardian #1 Flow:**
- [ ] Create child account successfully
- [ ] See "Inviter Anden Forælder" section
- [ ] Click "Generer Forældre-Kode" button
- [ ] Code appears with copy button
- [ ] Copy button works and shows checkmark
- [ ] Warning message is visible
- [ ] Visit `/my-children` page
- [ ] See all children listed
- [ ] Generate code from this page
- [ ] See code status (unused/used)

**Guardian #2 Flow:**
- [ ] Sign up as new guardian
- [ ] Redirected to onboarding
- [ ] See "Forældre-Kode" card (3rd option)
- [ ] Click card and see form
- [ ] Enter valid code
- [ ] Submit successfully
- [ ] See success message with child name
- [ ] Redirected to dashboard
- [ ] See child's classes in class list
- [ ] Can access child's chat messages
- [ ] Can see flagged messages for child

**Error Cases:**
- [ ] Invalid code shows error message
- [ ] Already used code shows error
- [ ] Expired/non-existent code shows error
- [ ] Already linked guardian sees appropriate error
- [ ] Max guardians (2) enforced

## Database Verification

After deployment, verify:

```sql
-- Check new columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'guardian_links';

-- Check functions exist
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%guardian%invite%';

-- Check permissions
SELECT grantee, privilege_type 
FROM information_schema.routine_privileges 
WHERE routine_name = 'generate_guardian_invite_code';
```

## Rollback Plan

If issues occur:

```sql
-- Remove new columns (will lose invite code data)
ALTER TABLE guardian_links 
DROP COLUMN IF EXISTS invite_code,
DROP COLUMN IF EXISTS code_generated_at,
DROP COLUMN IF EXISTS code_used_at,
DROP COLUMN IF EXISTS max_guardians;

-- Drop new functions
DROP FUNCTION IF EXISTS generate_guardian_invite_code;
DROP FUNCTION IF EXISTS claim_guardian_invite_code;
DROP FUNCTION IF EXISTS get_guardian_children_with_codes;

-- Drop index
DROP INDEX IF EXISTS idx_guardian_links_invite_code;
```

## Monitoring

**Metrics to track:**
- Number of invite codes generated
- Number of codes successfully claimed
- Average time between code generation and claim
- Failed claim attempts (security concern if high)

**Queries:**
```sql
-- Active (unused) codes
SELECT COUNT(*) 
FROM guardian_links 
WHERE invite_code IS NOT NULL 
AND code_used_at IS NULL;

-- Used codes in last 7 days
SELECT COUNT(*) 
FROM guardian_links 
WHERE code_used_at > NOW() - INTERVAL '7 days';

-- Children with single guardian (potential for code generation)
SELECT COUNT(DISTINCT child_user_id)
FROM guardian_links
GROUP BY child_user_id
HAVING COUNT(*) = 1;
```

## Future Enhancements

Potential improvements:
1. **Code expiration** - Add `code_expires_at` column (e.g., 7 days)
2. **Code regeneration** - Allow Guardian #1 to regenerate if lost
3. **Email invitation** - Send code via email directly
4. **SMS invitation** - Send code via SMS
5. **Revocation** - Allow Guardian #1 to revoke Guardian #2's access
6. **Activity log** - Track when guardians access child data

## Support

**Common Issues:**

**Q: Guardian #2 can't find the "Forældre-Kode" option**
A: Make sure they're on `/onboarding` page after signup. If they've already completed onboarding, they need to use the direct claim URL or contact support.

**Q: Code says "already used" but Guardian #2 never claimed it**
A: Check `code_used_at` timestamp. If it's recent, someone else claimed it. Guardian #1 needs to generate a new code.

**Q: Guardian #2 can't see child's classes**
A: Verify `guardian_links` entry exists and check `class_members` has entries for Guardian #2 in child's classes. The claim function should add these automatically.

**Q: How to add a 3rd guardian?**
A: Current system limits to 2 guardians. Would require database schema change and new business logic.

## Deployment Command

```bash
# 1. Deploy database migration
supabase db push

# 2. Deploy Next.js app (if not auto-deployed)
npm run build
# Deploy to Vercel/hosting

# 3. Verify deployment
# - Test code generation
# - Test code claiming
# - Check error handling
```

## Success Criteria

✅ Guardian #1 can generate codes after creating child
✅ Guardian #2 can claim codes during onboarding
✅ System enforces max 2 guardians per child
✅ Codes are single-use only
✅ Guardian #2 automatically added to child's classes
✅ Both guardians can view child's messages
✅ `/my-children` page shows all children with code status
✅ No security vulnerabilities (code guessing, unauthorized access)
