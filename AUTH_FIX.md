# Authentication Fix - Authorization Header Pattern

## Problem
Users were getting "Unauthorized" errors when trying to create/join classes after signing up, even though they were logged in on the client side.

## Root Cause
- **Client-side auth**: Supabase stores session in localStorage/cookies (client-side only)
- **Server-side API routes**: Cannot reliably access client-side cookies in Next.js 16
- **Cookie storage adapter**: `document.cookie` only works client-side, not accessible from server
- **Next.js 16 middleware**: Deprecated pattern, can't use to sync cookies

## Solution
Changed authentication pattern from **cookie-based** to **Authorization header**:

### Client-side (Onboarding)
```typescript
// Get current session
const { data: { session } } = await supabase.auth.getSession();

// Pass token in Authorization header
const response = await fetch('/api/classes/create', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`,
  },
  body: JSON.stringify({ ... }),
});
```

### Server-side (API Routes)
```typescript
// Get token from Authorization header
const authHeader = request.headers.get('authorization');
const token = authHeader?.replace('Bearer ', '');

// Verify token with Supabase
const authClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const { data: { user }, error } = await authClient.auth.getUser(token);
```

## Benefits
✅ Works regardless of email confirmation status
✅ No dependency on cookie storage
✅ Standard REST API authentication pattern
✅ Works with Next.js 16 without deprecated middleware
✅ Explicit token passing - no hidden state

## Files Modified
- `/apps/web/src/app/onboarding/page.tsx` - Pass token in Authorization header
- `/apps/web/src/app/api/classes/create/route.ts` - Verify token from header
- `/apps/web/src/app/api/classes/join/route.ts` - Verify token from header

## Files No Longer Needed
- `/apps/web/src/lib/supabase-auth.ts` - Cookie-based auth helper (can be removed)
- Custom cookie storage in `/apps/web/src/lib/supabase.ts` - Can revert to default localStorage

## Testing
1. Sign up as a new user (email doesn't need to be confirmed)
2. Go to onboarding page
3. Create a class → Should work now! ✨
4. Token is automatically included in API requests

## Email Confirmation
Email confirmation is **not required** for this flow because:
- Supabase creates a valid session immediately on signup
- The access token is valid even before email confirmation
- Users can complete onboarding right away
- Email confirmation can happen in the background
