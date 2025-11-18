# Flagged Message Administration Dashboard

## Overview
The Flagged Message Administration Dashboard provides a read-only observational view for teachers, admins, and parents to monitor AI-flagged messages. This feature enables supervision without direct intervention capabilities.

## Features

### 1. **Role-Based Access Control**
- **Admin/Teacher**: View all flagged messages across all classes
- **Parents**: View only their own children's flagged messages (filtered via `guardian_links` table)

### 2. **Message Context**
Each flagged message displays:
- The flagged message itself (highlighted with error background)
- Up to 3 messages **before** the flagged message
- Up to 3 messages **after** the flagged message
- Author information (name, avatar) for all messages
- Timestamps for context

### 3. **Filtering Options**
- **Severity Filter**: All / High / Moderate / Low
- Real-time filter updates without page refresh

### 4. **AI Moderation Details**
For each flagged message, the dashboard shows:
- **Severity Level**: high_severity, moderate_severity, low_severity
- **Labels**: Categories detected by OpenAI moderation (e.g., hate, harassment, violence)
- **Rule**: The moderation rule that triggered the flag
- **Score**: Confidence score (0-1) from AI moderation

### 5. **Real-Time Updates**
- Supabase Realtime subscription to `moderation_events` table
- New flagged messages appear instantly without refresh
- Channel: `moderation_events_changes`

## Files Created/Modified

### 1. API Route
**File**: `/apps/web/src/app/api/moderation/flagged-messages/route.ts`

**Endpoint**: `GET /api/moderation/flagged-messages`

**Query Parameters**:
- `class_id` (optional): Filter by specific class
- `severity` (optional): Filter by severity level
- `user_id` (optional): Filter by specific user

**Authentication**: Requires Bearer token in Authorization header

**Response Format**:
```typescript
{
  flagged_messages: [
    {
      event_id: string;
      message_id: number;
      class_id: string;
      rule: string;
      score: number;
      labels: string[];
      severity: string;
      created_at: string;
      message: {
        id: number;
        body: string;
        user_id: string;
        created_at: string;
        author: {
          user_id: string;
          display_name: string;
          avatar_url?: string;
          avatar_color?: string;
        };
      };
      context: {
        before: ContextMessage[];
        after: ContextMessage[];
      };
    }
  ]
}
```

**Permission Logic**:
```typescript
// Admin/Teacher: See all flagged messages
if (isAdminOrTeacher) {
  // No additional filtering
}

// Parent: Only see their children's messages
if (isParent) {
  // 1. Fetch child_user_ids from guardian_links
  // 2. Filter messages.user_id IN (child_user_ids)
}
```

### 2. Admin Page
**File**: `/apps/web/src/app/admin/moderation/page.tsx`

**Route**: `/admin/moderation`

**Features**:
- Fetches flagged messages from API with session token
- Severity filter (All, High, Moderate, Low)
- Expandable context view (toggle per message)
- Real-time subscription to new flagged messages
- Mobile-responsive layout
- Berlin Edgy design system compliance

## UI Design

### Layout
```
┌─────────────────────────────────────────────────┐
│ [←] FLAGGEDE BESKEDER                          │
│     ════                                        │
├─────────────────────────────────────────────────┤
│ Filtrer efter alvorlighed: [×] Alle Høj Mo... │
├─────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────┐ │
│ │ [Avatar] Display Name           [Høj] [hate]│ │
│ │         2024-11-18 15:30       Vis kontekst │ │
│ ├─────────────────────────────────────────────┤ │
│ │ Flagget besked:                             │ │
│ │ [Message body with red background]          │ │
│ ├─────────────────────────────────────────────┤ │
│ │ (Expandable context)                        │ │
│ │ Beskeder før: [3 messages]                  │ │
│ │ Beskeder efter: [3 messages]                │ │
│ ├─────────────────────────────────────────────┤ │
│ │ AI Moderation detaljer:                     │ │
│ │ Regel: sexual/minors                        │ │
│ │ Score: 87.45%                               │ │
│ └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

### Color Coding
- **High Severity**: Red badge (`badge-error`)
- **Moderate Severity**: Yellow badge (`badge-warning`)
- **Low Severity**: Blue badge (`badge-info`)
- **Flagged Message Background**: Light red (`bg-error/10`)
- **Context Messages**: Normal background
- **AI Details**: Light gray background (`bg-base-200/50`)

## Database Schema

### Tables Used
1. **moderation_events**
   ```sql
   - id: uuid
   - subject_type: text ('message')
   - subject_id: text (message ID)
   - class_id: uuid
   - rule: text
   - score: numeric
   - labels: text[]
   - status: text ('flagged')
   - severity: text
   - created_at: timestamptz
   ```

2. **messages**
   ```sql
   - id: bigint
   - room_id: uuid
   - class_id: uuid
   - user_id: uuid
   - body: text
   - created_at: timestamptz
   ```

3. **guardian_links**
   ```sql
   - child_user_id: uuid
   - guardian_user_id: uuid
   - relationship: text
   - consent_status: text
   ```

4. **profiles**
   ```sql
   - user_id: uuid
   - display_name: text
   - avatar_url: text
   - avatar_color: text
   - role: text ('admin', 'adult', 'guardian', 'child')
   ```

## Security Considerations

1. **Row Level Security (RLS)**: API uses `supabaseAdmin` to bypass RLS, but implements custom permission checks
2. **Session Validation**: All requests require valid Supabase session token
3. **Parent Isolation**: Parents can only see their own children's messages (enforced via `guardian_links`)
4. **No Actions**: Dashboard is strictly observational - no approve/delete/warn actions

## Testing Checklist

- [ ] Admin can view all flagged messages
- [ ] Teacher can view all flagged messages in their classes
- [ ] Parent can only view their own children's flagged messages
- [ ] Severity filter works correctly
- [ ] Context messages display correctly (before/after)
- [ ] Real-time updates work when new message is flagged
- [ ] Mobile responsive layout
- [ ] Loading state displays correctly
- [ ] Empty state displays when no flagged messages
- [ ] Expand/collapse context works
- [ ] Avatar colors display correctly
- [ ] Timestamps format correctly (Danish locale)

## Future Enhancements

1. **Export Functionality**: Download flagged messages as CSV/PDF
2. **Search**: Full-text search within flagged messages
3. **Date Range Filter**: Filter by time period
4. **User Filter**: Filter by specific student (for admins/teachers)
5. **Class Filter**: Filter by specific class (for admins/teachers)
6. **Notification**: Email/push notification when child's message is flagged (for parents)
7. **Analytics**: Dashboard with flagged message statistics and trends
8. **Message Thread View**: Show full conversation thread, not just ±3 messages

## Usage

### For Admins/Teachers:
1. Navigate to `/admin/moderation`
2. View all flagged messages across all classes
3. Use severity filter to prioritize high-risk messages
4. Click "Vis kontekst" to see conversation context
5. Monitor AI moderation details for each flag

### For Parents:
1. Navigate to `/admin/moderation` (same route)
2. View only your children's flagged messages
3. Understand context of flagged messages
4. Monitor AI moderation reasoning

## Technical Notes

### Performance Optimizations
- Context messages fetched separately per flagged message (could be optimized with batch query)
- Real-time subscription only refetches on INSERT, not on every change
- Filters are applied server-side to reduce data transfer

### Known Limitations
- Context messages limited to 3 before and 3 after (configurable)
- No pagination implemented yet (could be issue with 1000+ flagged messages)
- No export functionality
- No message thread view (just ±3 messages)

## Deployment

1. Ensure Edge Function `create_message` is deployed with `severity` field in moderation_events insert
2. Verify Supabase Realtime is enabled for `moderation_events` table:
   ```sql
   ALTER PUBLICATION supabase_realtime ADD TABLE moderation_events;
   ```
3. Deploy Next.js app to Vercel/production
4. Test with different user roles (admin, teacher, parent)

## Related Documentation
- `IMPROVEMENT_ROADMAP.md` - Phase 4 completion
- `AI_MODERATION_LEVELS.md` - Severity level definitions
- `README.md` - Overall project structure
- `SUPABASE_SETUP.md` - Database setup

## Design System Compliance ✅

### Berlin Edgy Aesthetic
- ✅ **No rounded corners**: All components use sharp corners (`border-2`, no `rounded-*`)
- ✅ **Bold typography**: Headings use `font-black` with `uppercase` and `tracking-tight`
- ✅ **2px borders**: All cards use `border-2` (never `border-1`)
- ✅ **Solid borders**: Only solid borders, no dashed/dotted
- ✅ **Color palette**: Uses approved colors (primary, secondary, error, warning, info)
- ✅ **No emojis**: Text labels only (all Danish)
- ✅ **Shadow system**: Only `shadow-lg` used for elevated cards
- ✅ **Spacing system**: Uses 4/8/12/16/24px scale (Tailwind `gap-*`, `p-*`, `space-*`)

### Component Breakdown
1. **Header Section**
   - ✅ Back button: `btn btn-ghost btn-square` with arrow SVG
   - ✅ Title: `text-3xl font-black uppercase tracking-tight`
   - ✅ Accent bar: `h-1 w-24 bg-primary mt-2`
   - ✅ Layout: `flex items-center gap-4`

2. **Filter Section**
   - ✅ Card container: `bg-base-100 border-2 border-base-content/10 shadow-lg p-6`
   - ✅ Label: `text-xs font-bold uppercase tracking-widest text-base-content/50`
   - ✅ Button group: `flex flex-wrap gap-2`
   - ✅ Buttons: `btn btn-sm font-bold uppercase` with conditional colors
   - ✅ Responsive: `flex-col md:flex-row` for mobile/desktop

3. **Empty State Card**
   - ✅ Container: `bg-base-100 border-2 border-base-content/10 shadow-lg p-12 text-center space-y-4`
   - ✅ Icon: `w-16 h-16 stroke-current text-success mx-auto` (64x64px)
   - ✅ Heading: `text-2xl font-black uppercase tracking-tight`
   - ✅ Description: `text-base-content/60`

4. **Message Card**
   - ✅ Container: `bg-base-100 border-2 border-base-content/10 shadow-lg overflow-hidden`
   - ✅ Header section: `p-6 border-b-2 border-base-content/10`
   - ✅ Flex layout: `flex items-start justify-between gap-4`
   - ✅ Avatar: DaisyUI `avatar placeholder` with color background
   - ✅ Badges: `badge badge-sm font-bold uppercase` (severity color-coded)
   - ✅ Button: `btn btn-sm btn-ghost border-2 border-base-content/10` with hover effects

5. **Flagged Message Section**
   - ✅ Background: `bg-error/10` (light red, 10% opacity)
   - ✅ Label: `text-xs font-bold uppercase tracking-widest text-base-content/50`
   - ✅ Body: `text-sm font-medium text-base-content`

6. **Context Messages**
   - ✅ Container: `p-6 border-t-2 border-base-content/10 space-y-4`
   - ✅ Section label: `text-xs font-bold uppercase tracking-widest text-base-content/50 mb-3`
   - ✅ Message layout: `flex gap-3`
   - ✅ Small avatar: `w-8 h-8` (32px)
   - ✅ Name: `text-xs font-bold text-base-content mb-1`
   - ✅ Body: `text-sm text-base-content/80`

7. **AI Details Section**
   - ✅ Background: `bg-base-200/50` (light gray)
   - ✅ Border: `border-t-2 border-base-content/10`
   - ✅ Label: `text-xs font-bold uppercase tracking-widest text-base-content/50 mb-2`
   - ✅ Content: `text-xs font-mono text-base-content/80`

### Color Usage
- **Primary (Hot Pink)**: `bg-primary`, `text-primary`, `btn-primary` - for accents and CTAs
- **Error (Red)**: `text-error`, `btn-error`, `bg-error/10` - for high severity alerts
- **Warning (Yellow)**: `text-warning`, `btn-warning` - for moderate severity
- **Info (Blue)**: `text-info`, `btn-info` - for low severity
- **Neutral (Purple)**: Used for tag badges
- **Base colors**: `bg-base-100`, `text-base-content`, `border-base-content/10`

### Loading & Empty States
- ✅ Loading spinner: `loading loading-ball loading-lg text-primary`
- ✅ Empty state card: Check mark icon with "Ingen flaggede beskeder"
- ✅ Text: "Alle beskeder er godkendt af AI-moderation" (when no filter)

### Typography Consistency
- ✅ All headings: `font-black uppercase tracking-tight`
- ✅ Labels: `text-xs font-bold uppercase tracking-widest`
- ✅ Body text: `text-sm font-medium`
- ✅ Secondary text: `text-xs text-base-content/60` or `/80`
- ✅ Monospace: `font-mono` for code/AI details

### Interactive Elements
- ✅ Buttons: Always have border or filled background
- ✅ Hover states: Use `:hover:border-primary/50` or color transitions
- ✅ Transitions: `transition-all duration-200` for smooth effects
- ✅ No rounded elements: All `border-radius: 0`

### Responsiveness
- ✅ Filter section: `flex-col md:flex-row` for mobile/desktop
- ✅ Message cards: Full width, padding scales appropriately
- ✅ Avatars: Scale from 32px to 64px
- ✅ Mobile-friendly: No horizontal scroll, proper touch targets

## Completion Status
✅ API endpoint created with permission logic
✅ Admin page component built with Berlin Edgy design
✅ Message context display implemented
✅ Real-time updates enabled on `moderation_events` table
✅ Severity filtering with color-coded buttons
✅ Design system compliance verified
✅ All typography and spacing correct
✅ No emojis, sharp corners, solid borders
✅ DaisyUI components properly used
✅ Responsive layout for mobile/desktop
