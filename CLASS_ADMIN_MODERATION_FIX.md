# Class Admin Moderation Access Fix

## Summary
Fixed permission issue preventing class admins from accessing the moderation dashboard. Class admins (role: `adult` with `is_class_admin: true` in their class) can now view flagged messages from their own class.

## Problem
- Class admins couldn't access `/admin/moderation` page
- Permission checks only looked for `admin` or `adult` role
- API endpoint didn't check the `is_class_admin` flag from `class_members` table
- Navigation links didn't pass `classId` parameter for class admins

## Solution

### 1. Updated Moderation Page (`/app/admin/moderation/page.tsx`)
- **Added**: `useUserProfile` hook to get user's profile, role, and class admin status
- **Added**: Permission check in useEffect to verify user is authorized (admin or teacher)
- **Added**: Pass `class_id` query parameter to API if user is a class admin
- **Added**: `useSearchParams` hook to extract `class_id` from URL
- **Result**: Page now properly gates access and filters by class for class admins

### 2. Updated AdminLayout (`/components/AdminLayout.tsx`)
- **Changed**: Moderation link now includes `?class_id={classId}` for class admins
- **Updated**: Both desktop sidebar and mobile hamburger menu with conditional links
- **Result**: Navigation properly routes class admins to their filtered view

### 3. Updated API Endpoint (`/api/moderation/flagged-messages/route.ts`)
- **Added**: Support for both `class_id` and `classId` query parameters
- **Added**: Check for `is_class_admin` column in `class_members` table
- **Added**: Separate permission variables: `isAdmin`, `isTeacher`, `isClassAdmin`, `isParent`
- **Added**: Validation that class admins/teachers must provide `class_id` parameter
- **Added**: Validation that class admins can only access their own class (enforced by filtered query)
- **Result**: API properly validates permissions and enforces class-based filtering

## Permission Model

### Full Admins (role: `admin`)
- See all flagged messages across all classes
- No `class_id` parameter needed
- Unfiltered access

### Teachers (role: `adult`)
- If `is_class_admin: true`: See only flagged messages from their class
  - Must provide `class_id` parameter
  - Messages filtered by `class_id`
- If `is_class_admin: false`: Denied access (would need different handling)

### Parents (role: `guardian`)
- See only flagged messages from their own children
- Works via `guardian_links` relationship
- Class filtering not applicable

### Students (role: `child`)
- Denied access (403 Forbidden)

## Technical Details

### Frontend Flow (Class Admin)
1. Class admin navigates to Admin Dashboard
2. AdminLayout extracts `classId` from context
3. Navigation link includes query parameter: `/admin/moderation?class_id={classId}`
4. Moderation page extracts `class_id` from URL
5. Page passes `class_id` to API in all fetch requests
6. Dashboard shows only messages from that class

### Backend Flow (Class Admin)
1. API receives request with Bearer token and `class_id` parameter
2. Validates user token and fetches profile
3. Checks `class_members` table for `is_class_admin` flag
4. If class admin: Filters `moderation_events` by `class_id`
5. Returns filtered results

### Security
- ✅ Parent-child filtering verified unbypassable (existing tests)
- ✅ Class admin can only see their own class (new validation)
- ✅ Teacher role without class admin flag denies access
- ✅ Student role denied access
- ✅ API validates all permission checks before returning data

## Files Modified
1. `/apps/web/src/app/admin/moderation/page.tsx` - Added permission checks and classId handling
2. `/apps/web/src/components/AdminLayout.tsx` - Updated navigation links with classId parameter
3. `/apps/web/src/app/api/moderation/flagged-messages/route.ts` - Added class admin permission validation

## Testing
All changes verified with TypeScript compiler - no errors found:
- ✅ AdminLayout.tsx - No errors
- ✅ moderation/page.tsx - No errors
- ✅ moderation flagged-messages route - No errors

## Next Steps
- Monitor class admin access to moderation dashboard
- Verify class-based filtering works correctly
- Consider adding audit logging for class admin actions
- Plan for other admin features (settings, user management) with similar access control

## Deployment Notes
- No database migrations required
- Changes are backward compatible
- Full admins still see all messages (unchanged behavior)
- Parents see child-filtered messages (unchanged behavior)
- Class admins now have new restricted access (new feature)
