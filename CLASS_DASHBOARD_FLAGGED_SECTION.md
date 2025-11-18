# Class Dashboard Flagged Messages Section

**Date:** 18. November 2025  
**Status:** ✅ **COMPLETE** - Build passes, tests pass, feature implemented

## What Was Added

A new **Flagged Messages Section** has been added to the class dashboard (the main class view when you select a class without selecting a room).

### Location
- **URL:** `https://klassechatten.vercel.app/?class=c83dcedb-7cea-4d4e-9f14-31bd7bf524f1`
- **Position:** Below the class header, above the channels grid
- **Visibility:** Only visible to admins and class admins

## Features

### 1. Flagged Messages Display
- **Shows:** Top 5 high-severity flagged messages
- **Count Badge:** Red badge showing total number of flagged messages
- **Empty State:** Checkmark icon with success message when no flagged messages

### 2. Message Information
Each flagged message displays:
- ✅ Severity level (Høj/Lav) as a badge
- ✅ Message author name
- ✅ Violation rule (e.g., "sexual", "hate", "violence")
- ✅ Original message text with word wrapping
- ✅ Hover state with background color change

### 3. Call-to-Action
- **"Se Alt" Button:** Blue primary button linking to `/admin/moderation`
- **Automatic Class Filter:** When a class admin clicks "Se Alt", they're redirected to moderation dashboard with `class_id` parameter pre-filled
- **Arrow Icon:** Visual indicator showing navigation action

### 4. Loading States
- **Loading Spinner:** Shows while fetching data from API
- **Error Handling:** Displays error message if fetch fails

## Implementation Details

### New Files
**`src/components/FlaggedMessagesSection.tsx`** (103 lines)
- React client component
- Hooks: `useUserProfile`, `useAuth`, `useRouter`
- Fetches flagged messages from `/api/moderation/flagged-messages` API
- Respects permission rules:
  - Full admins see all classes
  - Class admins see only their class (via `class_id` parameter)
- Filters by `high_severity` only

### Modified Files
**`src/components/ClassRoomBrowser.tsx`**
- Added import: `FlaggedMessagesSection`
- Added component rendering: `<FlaggedMessagesSection classId={selectedClass.id} />`
- Positioned below class header, above channels grid

## API Integration

The component uses the existing API endpoint:
```
GET /api/moderation/flagged-messages?severity=high_severity&class_id={classId}
```

**Headers:** Authorization Bearer token (from Supabase session)

**Responses:**
- ✅ 200 OK: Returns `{ flagged_messages: [...] }`
- ✅ 401 Unauthorized: Shows error message
- ✅ 403 Forbidden: Hides section entirely
- ✅ 500 Server Error: Shows error message

## Security

✅ **Permission-based visibility:**
- Only admins and class admins see the section
- Class admins can only see their own class's flagged messages
- Uses same permission model as `/admin/moderation` page

✅ **Token validation:**
- Requires valid Supabase session
- Bearer token passed with API request

## Design System Compliance

✅ **Berlin Edgy Aesthetic:**
- No rounded corners
- 2px solid borders throughout
- Sharp, bold typography (uppercase, font-black)
- Accent badges and icons
- Berlin Edgy color scheme (primary, error, success)
- Hover states with primary accent

✅ **Responsive Design:**
- Adapts to mobile and desktop
- Proper spacing and padding
- Text wrapping for long messages

✅ **All text in Danish:**
- "Flaggede Beskeder" (Flagged Messages)
- "AI-modererede beskeder der kræver opmærksomhed" (AI-moderated messages requiring attention)
- "Se Alt" (See All)
- "Ingen flaggede beskeder" (No flagged messages)
- Severity labels: "Høj" (High), "Lav" (Low)

## Build & Tests

✅ **Build:** Exit code 0 (successful)  
✅ **Tests:** 32/32 passing (class admin permission tests)  
✅ **TypeScript:** No compilation errors  

## User Experience Flow

**For Class Admin:**
1. Navigate to class dashboard: `?class={classId}`
2. See "Flaggede Beskeder" section with count badge
3. View up to 5 high-severity messages
4. Click "Se Alt" to go to full moderation dashboard
5. Automatically filtered to their class

**For Full Admin:**
1. Navigate to class dashboard: `?class={classId}`
2. See "Flaggede Beskeder" section
3. View up to 5 high-severity messages (all classes)
4. Click "Se Alt" to go to full moderation dashboard
5. Can see all classes' messages

**For Regular Users:**
- Section not visible (no permission)

## Testing

To test the feature:

```bash
# 1. Build the app
npm run build

# 2. Run tests
npm test -- --testPathPatterns="class-admin-moderation-permissions"

# 3. Manually test
# - Log in as class admin
# - Navigate to class dashboard
# - Verify Flagged Messages section appears
# - Verify message count and content
# - Click "Se Alt" button
# - Verify moderation page loads with class_id filter
```

## Future Enhancements

Potential improvements:
- [ ] Real-time updates when new messages are flagged
- [ ] Inline moderation actions (approve/reject without leaving dashboard)
- [ ] Filter by severity level
- [ ] Pagination for viewing more messages
- [ ] Quick preview modal for message context

---

**Status:** ✅ Ready for production  
**User Testing:** Recommended before deployment
