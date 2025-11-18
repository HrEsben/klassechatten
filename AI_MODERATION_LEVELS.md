# AI Moderation Levels - Deployment Guide

## Overview
This feature allows class admins and global admins to fine-tune AI moderation per class with three levels:
- **Strict**: Low thresholds (0.3-0.5) - Best for younger students (grades 0-4)
- **Moderate**: Balanced thresholds (0.5-0.7) - Recommended for most classes (grades 5-9) - DEFAULT
- **Relaxed**: Higher thresholds (0.7-0.9) - For older students with more maturity (grades 8-9)

## What Changed

### 1. Database Migration
**File**: `supabase/migrations/20241115_add_moderation_level.sql`
- Added `moderation_level` enum type with values: `strict`, `moderate`, `relaxed`
- Added `moderation_level` column to `classes` table with default `moderate`
- Created index for performance

### 2. Edge Function Update
**File**: `supabase/functions/create_message/index.ts`
- Fetches class's `moderation_level` when processing messages
- Adjusts AI moderation thresholds dynamically based on level:
  - **Strict**: Critical 0.2 (death threats, sexual/minors, graphic violence), High severity 0.4, Moderate 0.3
  - **Moderate**: Critical 0.3 (death threats, sexual/minors), High severity 0.6, Moderate 0.5 (DEFAULT)
  - **Relaxed**: Critical 0.5 (death threats, sexual/minors), High severity 0.8, Moderate 0.7
- **IMPORTANT**: Death threats are categorized as "hate/threatening" by OpenAI and trigger high_severity flags
- Two severity tiers for notifications:
  - **high_severity**: Death threats, sexual/minors, graphic violence, severe violence/sexual content
  - **moderate_severity**: General harassment, hate speech, illicit content
- Danish profanity filter remains active at all levels

**Updated**: November 18, 2025 - Lowered critical thresholds to properly flag death threats as high severity

### 3. Settings UI
**File**: `apps/web/src/app/class/[id]/settings/page.tsx`
- Added AI Moderation section with radio button selector
- Clear descriptions for each level with age recommendations
- Info box explaining that Danish profanity is always blocked

### 4. API Route
**File**: `apps/web/src/app/api/classes/[id]/route.ts`
- Updated PATCH endpoint to accept `moderation_level`
- Validates input against allowed values
- Requires admin or class_admin permission

### 5. Data Layer
**File**: `apps/web/src/hooks/useUserClasses.ts`
- Updated to fetch and return `moderation_level` for each class
- Defaults to `moderate` if not set

## Deployment Steps

### Step 1: Deploy Database Migration
```bash
cd /Users/esbenpro/Documents/KlasseChatten

# Option A: Using Supabase CLI
supabase db push

# Option B: Manual (in Supabase Dashboard SQL Editor)
# Copy and paste content from:
# supabase/migrations/20241115_add_moderation_level.sql
```

### Step 2: Verify Migration
```sql
-- Check that column exists
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'classes' AND column_name = 'moderation_level';

-- Check all classes have default value
SELECT id, label, moderation_level FROM classes;
```

### Step 3: Deploy Edge Function
```bash
# Deploy the updated create_message function
supabase functions deploy create_message

# Verify deployment
supabase functions list
```

### Step 4: Test Edge Function
```bash
# Create a test message to verify moderation levels work
curl -X POST https://uxdmqhgilcynzxjpbfui.supabase.co/functions/v1/create_message \
  -H "Authorization: Bearer YOUR_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "room_id": "YOUR_ROOM_ID",
    "body": "Test message"
  }'
```

### Step 5: Deploy Web App
```bash
cd apps/web
npm run build

# If using Vercel
vercel --prod

# Or your preferred deployment method
```

### Step 6: Test in UI
1. Log in as a class admin or global admin
2. Navigate to a class lobby
3. Click the settings (gear) icon
4. Verify both sections appear:
   - **Klassenavn** (Class nickname)
   - **AI-Moderation** (AI Moderation)
5. Select a moderation level and save
6. Test sending messages with different levels

## Testing Scenarios

### Test 1: Strict Mode
1. Set a class to "Streng" (Strict)
2. Send message: "Du er dum" (mild insult)
3. **Expected**: Should be flagged or blocked (threshold 0.3)

### Test 2: Moderate Mode
1. Set a class to "Moderat" (Moderate) 
2. Send message: "Du er dum"
3. **Expected**: Might be flagged (threshold 0.5)

### Test 3: Relaxed Mode
1. Set a class to "Afslappet" (Relaxed)
2. Send message: "Du er dum"
3. **Expected**: Likely passes through (threshold 0.7)

### Test 4: Danish Profanity (All Levels)
1. Try any level
2. Send message: "fuck dig" or similar
3. **Expected**: Always blocked regardless of level

## Rollback Plan

If issues occur:

### Rollback Database
```sql
-- Remove column
ALTER TABLE classes DROP COLUMN IF EXISTS moderation_level;

-- Drop enum type
DROP TYPE IF EXISTS moderation_level;
```

### Rollback Edge Function
```bash
# Revert the file changes
git checkout HEAD~1 supabase/functions/create_message/index.ts

# Redeploy
supabase functions deploy create_message
```

### Rollback Web App
```bash
# Revert changes and redeploy
git revert HEAD
# Then redeploy your web app
```

## Monitoring

After deployment, monitor:
1. **Supabase Logs**: Check Edge Function logs for moderation decisions
2. **Moderation Events**: Query `moderation_events` table for patterns
3. **User Feedback**: Listen for complaints about over/under-blocking

```sql
-- View recent moderation events by level
SELECT 
  c.label,
  c.moderation_level,
  m.status,
  m.rule,
  COUNT(*) as count
FROM moderation_events m
JOIN classes c ON m.class_id = c.id
WHERE m.created_at > NOW() - INTERVAL '7 days'
GROUP BY c.label, c.moderation_level, m.status, m.rule
ORDER BY count DESC;
```

## Notes

- Default is `moderate` for all existing and new classes
- Only admins and class admins can change moderation levels
- Changes take effect immediately for new messages
- Danish profanity filter is NOT affected by moderation level
- Consider reviewing settings with teachers before deploying to production
