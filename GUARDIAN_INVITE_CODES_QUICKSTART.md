# Guardian Invite Code System - Quick Reference

## Problem Solved
How to link a second parent (Guardian #2) to a child account created by the first parent (Guardian #1).

## Solution
**Child-specific signup codes** - Each child gets a unique 8-character invite code that Guardian #1 shares with Guardian #2.

## Key Files Created

### Database
- `supabase/migrations/20241119_guardian_invite_codes.sql` - Database schema + functions

### API Routes
- `/apps/web/src/app/api/guardians/generate-invite/route.ts` - Generate code
- `/apps/web/src/app/api/guardians/claim-invite/route.ts` - Use code
- `/apps/web/src/app/api/guardians/my-children/route.ts` - List children

### UI Pages
- `/apps/web/src/app/my-children/page.tsx` - Manage children & codes (NEW)
- `/apps/web/src/app/create-child/page.tsx` - Added invite section (MODIFIED)
- `/apps/web/src/app/onboarding/page.tsx` - Added claim option (MODIFIED)

## How It Works

### Guardian #1
1. Creates child account at `/create-child`
2. Clicks "Generer Forældre-Kode"
3. Gets unique code like `ABC12XYZ`
4. Shares code with Guardian #2 (SMS/email/etc)

### Guardian #2
1. Signs up as guardian
2. Goes to `/onboarding`
3. Selects "Forældre-Kode" card
4. Enters code from Guardian #1
5. Gets linked to child + added to child's classes

## Security
- ✅ Unique 8-char codes (no confusing characters)
- ✅ Single use only
- ✅ Max 2 guardians per child
- ✅ Authorization checks
- ✅ Audit trail (timestamps)

## Deployment

```bash
# 1. Run database migration
supabase db push

# 2. Deploy Next.js app
npm run build

# 3. Test both flows
```

See `GUARDIAN_INVITE_CODES.md` for complete deployment guide.

## Why This Approach?

### ✅ Advantages
- Simple UX (just enter a code)
- Privacy-preserving (no child selection list)
- Secure (consent via code sharing)
- Async (Guardian #2 can join anytime)
- Familiar pattern (like class invite codes)

### ❌ Alternative (Selection) Would Have
- Privacy concerns (showing list of children)
- Complex auth state (sign up, then select)
- Verification needed (how to prove relationship?)
- Race conditions (multiple claimants)

## Quick Test

```sql
-- Generate code as Guardian #1
SELECT generate_guardian_invite_code(
  'child-uuid-here',
  'guardian-1-uuid-here'
);

-- Claim code as Guardian #2  
SELECT claim_guardian_invite_code(
  'ABC12XYZ',
  'guardian-2-uuid-here'
);
```

## Pages to Test

1. `/create-child` - Create child, generate code
2. `/my-children` - View all children, manage codes
3. `/onboarding` - Claim code as new guardian
4. `/` - Verify Guardian #2 sees child's classes
