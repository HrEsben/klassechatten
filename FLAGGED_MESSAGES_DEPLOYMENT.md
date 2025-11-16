# Flagged Messages with Parent Notifications - Deployment Guide

## Overview

This system replaces message blocking with flagging. All messages are sent but inappropriate ones are flagged for review and parents are automatically notified with context.

## Key Changes

### 1. **No More Blocking** ✅
- All messages are inserted into the database
- Inappropriate messages are marked with `is_flagged = true`
- User sees warning: "Din besked blev sendt, men markeret til gennemgang"

### 2. **Automatic Parent Notifications** ✅
- Parents receive email when their child's message is flagged
- Includes previous 8 messages for context
- Batches multiple flags within 5 minutes into one email
- Uses professional Danish email templates

### 3. **UI Indicators** ✅
- Flagged messages show warning badge (yellow alert)
- Only visible to message sender
- Berlin Edgy design with warning color

## Deployment Steps

### Step 1: Deploy Database Migration

```bash
# Run the migration SQL
psql $DATABASE_URL < supabase/migrations/20241116_flagged_messages_parent_notifications.sql

# Or via Supabase Dashboard:
# 1. Open SQL Editor
# 2. Paste contents of 20241116_flagged_messages_parent_notifications.sql
# 3. Run migration
```

**What this does:**
- Adds `is_flagged` column to `messages` table
- Adds `severity` column to `moderation_events` table  
- Creates `parent_notification_queue` table for batching
- Creates trigger that automatically queues parent notifications
- Creates functions for processing and sending notifications

### Step 2: Deploy Edge Functions

```bash
# Deploy updated create_message function
cd supabase
supabase functions deploy create_message

# Deploy new parent notification function
supabase functions deploy notify_parents_flagged
```

### Step 3: Set Up Email Service (Resend)

```bash
# Get API key from https://resend.com
# Set secret in Supabase
supabase secrets set RESEND_API_KEY=re_...
```

### Step 4: Set Up Cron Job

Add to Supabase Dashboard → Database → Cron Jobs:

```sql
-- Run every 2 minutes to process queued notifications
SELECT cron.schedule(
  'process-parent-notifications',
  '*/2 * * * *',  -- Every 2 minutes
  $$
  SELECT net.http_post(
    url := 'https://uxdmqhgilcynzxjpbfui.supabase.co/functions/v1/notify_parents_flagged',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    )
  );
  $$
);
```

**Alternative:** Use Supabase Edge Function scheduler or external cron service

### Step 5: Test the System

1. **Send a flagged message:**
   ```bash
   # As a student account, send: "Du er dum"
   # Message should appear in chat with warning badge
   ```

2. **Check notification queue:**
   ```sql
   SELECT * FROM parent_notification_queue WHERE status = 'pending';
   ```

3. **Manually trigger notification:**
   ```bash
   curl -X POST \
     https://uxdmqhgilcynzxjpbfui.supabase.co/functions/v1/notify_parents_flagged \
     -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
   ```

4. **Verify email sent:**
   - Check guardian email inbox
   - Email should include flagged message + 8 previous messages

## How It Works

### Message Flow

```
User sends message
  ↓
Edge Function: create_message
  ↓
OpenAI Moderation Check
  ↓
Is inappropriate? → Set is_flagged = true
  ↓
Insert message to database
  ↓
Database Trigger: queue_parent_notification
  ↓
Check for recent queue entry (5 min window)
  ↓
Exists? → Add to batch (multiple flags)
  ↓
Doesn't exist? → Create new queue entry
  ↓
Cron job runs every 2 minutes
  ↓
Edge Function: notify_parents_flagged
  ↓
Process pending notifications (30 sec wait for batching)
  ↓
Fetch guardian emails via guardian_links
  ↓
Send email with flagged messages + context
  ↓
Mark as sent in queue
```

### Batching Logic

- **5-minute window**: Multiple flags from same child in same room batch together
- **30-second delay**: Wait before sending to allow more flags to accumulate
- **Result**: Parents get 1 email with multiple flagged messages instead of spam

### Context Messages

- **Previous 8 messages**: Shows conversation leading up to flag
- **Includes authors**: Parents see who said what
- **Chronological order**: Most recent first
- **Purpose**: Helps parents understand situation

## Configuration

### Moderation Levels

Classes can have different moderation levels (set in class settings):

- **Strict**: Lower thresholds, flags more content
- **Moderate** (default): Balanced approach
- **Relaxed**: Higher thresholds, allows more content

### Severity Levels

Flagged messages have severity:

- **High**: Sexual/minors, hate/threatening, graphic violence
- **Moderate**: Harassment, hate speech, illicit content  
- **Low**: Minor issues

Severity determines email urgency (future: could route differently)

## Monitoring

### Check Queue Status

```sql
-- Pending notifications
SELECT 
  pn.*,
  p.display_name as child_name,
  c.label as class_name,
  r.name as room_name
FROM parent_notification_queue pn
LEFT JOIN profiles p ON p.id = pn.child_user_id
LEFT JOIN classes c ON c.id = pn.class_id
LEFT JOIN rooms r ON r.id = pn.room_id
WHERE pn.status = 'pending'
ORDER BY pn.created_at DESC;
```

### Check Flagged Messages

```sql
-- Recent flagged messages
SELECT 
  m.id,
  m.body,
  m.created_at,
  p.display_name as sender,
  r.name as room,
  c.label as class
FROM messages m
LEFT JOIN profiles p ON p.id = m.user_id
LEFT JOIN rooms r ON r.id = m.room_id
LEFT JOIN classes c ON c.id = m.class_id
WHERE m.is_flagged = TRUE
ORDER BY m.created_at DESC
LIMIT 50;
```

### Check Notification Success

```sql
-- Sent notifications in last 24 hours
SELECT 
  pn.*,
  p.display_name as child_name,
  pn.sent_at,
  array_length(pn.flagged_message_ids, 1) as message_count
FROM parent_notification_queue pn
LEFT JOIN profiles p ON p.id = pn.child_user_id
WHERE pn.status = 'sent'
  AND pn.sent_at >= NOW() - INTERVAL '24 hours'
ORDER BY pn.sent_at DESC;
```

## Troubleshooting

### Notifications not sending

1. Check cron job is running:
   ```sql
   SELECT * FROM cron.job WHERE jobname = 'process-parent-notifications';
   ```

2. Check Edge Function logs:
   ```bash
   supabase functions logs notify_parents_flagged --tail
   ```

3. Check for pending notifications:
   ```sql
   SELECT * FROM parent_notification_queue WHERE status = 'pending';
   ```

### Emails not received

1. Verify Resend API key:
   ```bash
   supabase secrets list
   ```

2. Check guardian_links exist:
   ```sql
   SELECT * FROM guardian_links WHERE child_user_id = 'USER_ID';
   ```

3. Check Resend dashboard for delivery status

### Messages not flagged

1. Check OpenAI moderation is running:
   ```bash
   supabase functions logs create_message --tail
   ```

2. Test moderation manually:
   ```bash
   curl -X POST https://api.openai.com/v1/moderations \
     -H "Authorization: Bearer $OPENAI_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"input": "test message"}'
   ```

## Future Enhancements

- [ ] Teacher dashboard to review flagged messages
- [ ] Mobile push notifications for parents
- [ ] Configurable batching windows per class
- [ ] Parent reply/acknowledgment system
- [ ] Weekly digest option instead of immediate
- [ ] SMS notifications for high-severity flags
- [ ] Multilingual email templates

## Rollback Plan

If needed to revert:

```sql
-- 1. Drop trigger
DROP TRIGGER IF EXISTS trigger_queue_parent_notification ON messages;

-- 2. Set all messages to unflagged
UPDATE messages SET is_flagged = FALSE WHERE is_flagged = TRUE;

-- 3. Optional: Drop new tables
-- DROP TABLE parent_notification_queue;

-- 4. Redeploy old Edge Function
-- supabase functions deploy create_message (from backup)
```

## Summary

✅ All messages are sent (no blocking)
✅ Inappropriate messages are flagged  
✅ Users are informed their message was flagged
✅ Parents receive automatic email notifications
✅ Context (8 previous messages) included
✅ Multiple flags batched into one email
✅ Berlin Edgy design maintained
✅ Danish language throughout
