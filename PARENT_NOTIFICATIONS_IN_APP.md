# In-App Parent Notifications Setup

## Overview
When a message is flagged by AI moderation, parents/guardians are notified via the **in-app notification system** (not email). Notifications are batched within a 30-second window to avoid spam.

## Architecture

### Flow
1. Child sends message → `create_message` Edge Function
2. AI moderation flags message → inserts with `is_flagged = true`
3. Trigger `queue_parent_notification()` adds to `parent_notification_queue`
4. After 30 seconds, `process_parent_notifications()` creates in-app notifications
5. Guardians see notifications in their notification feed

### Batching Logic
- **Grouping window**: 30 seconds after first flagged message
- **Multiple messages**: Batched into single notification per guardian
- **Context**: Includes 8 previous messages for context
- **Idempotency**: Prevents duplicate notifications

## Database Tables

### `parent_notification_queue`
Temporary queue for batching flagged messages before sending notifications.

```sql
CREATE TABLE parent_notification_queue (
  id UUID PRIMARY KEY,
  child_user_id UUID,
  flagged_message_ids UUID[], -- Array of flagged message IDs
  context_message_ids UUID[], -- Previous 8 messages for context
  class_id UUID,
  room_id UUID,
  severity TEXT, -- 'high_severity' or 'moderate_severity'
  status TEXT, -- 'pending' or 'sent'
  created_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ
);
```

### `notifications` (existing table)
Standard notification table. Moderation notifications stored with:
- `type`: `'moderation'`
- `data`: JSONB containing flagged messages, context, severity
- `idempotency_key`: Prevents duplicates

## SQL Functions

### `queue_parent_notification()`
**Trigger**: Runs on `messages` INSERT when `is_flagged = true`
**Purpose**: Adds flagged message to queue or updates existing batch

### `process_parent_notifications()`
**Called by**: Edge Function or pg_cron
**Purpose**: Processes queue and creates in-app notifications
**Returns**: Integer (number of notifications created)

```sql
-- Manual execution
SELECT process_parent_notifications();
```

## Deployment

### 1. Apply Database Migration
```bash
cd /Users/esbenpro/Documents/KlasseChatten

# Apply the original migration (if not already applied)
supabase db push --file supabase/migrations/20241116_flagged_messages_parent_notifications.sql

# Apply the in-app notification migration
supabase db push --file supabase/migrations/20241117_parent_notifications_in_app.sql
```

### 2. Setup Automatic Processing

**Option A: pg_cron (Recommended)**
```sql
-- Enable pg_cron extension (run in Supabase SQL editor)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule processing every minute
SELECT cron.schedule(
  'process-parent-notifications',
  '* * * * *',
  $$SELECT process_parent_notifications();$$
);

-- Verify cron job
SELECT * FROM cron.job;
```

**Option B: Edge Function + Scheduled Invoke**
If pg_cron is not available, create a simple Edge Function:

```typescript
// supabase/functions/process_notifications/index.ts
import { createClient } from 'jsr:@supabase/supabase-js@2';

Deno.serve(async (_req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { data, error } = await supabase.rpc('process_parent_notifications');

  if (error) {
    console.error('Error processing notifications:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  console.log(`Created ${data} notifications`);
  return new Response(JSON.stringify({ count: data }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

Deploy:
```bash
supabase functions deploy process_notifications
```

Setup cron (Supabase Dashboard → Edge Functions → Crons):
- Function: `process_notifications`
- Schedule: `* * * * *` (every minute)

## Testing

### 1. Verify Queue System
```sql
-- Check pending notifications
SELECT * FROM parent_notification_queue WHERE status = 'pending';

-- Check sent notifications
SELECT * FROM parent_notification_queue WHERE status = 'sent' ORDER BY sent_at DESC LIMIT 10;
```

### 2. Trigger Test Notification
```sql
-- Create a test flagged message (assuming you have a child user and room)
INSERT INTO messages (user_id, room_id, body, is_flagged)
VALUES (
  '{child_user_id}', -- Replace with actual child user ID
  '{room_id}',       -- Replace with actual room ID
  'Test flagged message',
  true
);

-- Wait 30 seconds, then process
SELECT process_parent_notifications();

-- Check if notifications were created
SELECT * FROM notifications WHERE type = 'moderation' ORDER BY created_at DESC LIMIT 5;
```

### 3. View Guardian Notifications
```sql
-- Get notifications for a specific guardian
SELECT 
  n.title,
  n.body,
  n.created_at,
  n.read,
  n.data->>'child_display_name' as child_name,
  n.data->>'flagged_count' as flagged_count,
  n.data->'flagged_messages' as flagged_messages,
  n.data->'context_messages' as context_messages
FROM notifications n
WHERE user_id = '{guardian_user_id}' -- Replace with guardian user ID
  AND type = 'moderation'
ORDER BY created_at DESC;
```

## Notification Data Structure

Each notification includes:
```json
{
  "type": "moderation",
  "title": "Barnets navn - 2 beskeder markeret",
  "body": "2 beskeder fra Barnets navn i Klasse 7A blev markeret som potentielt upassende",
  "data": {
    "child_user_id": "uuid",
    "child_display_name": "Barnets navn",
    "flagged_count": 2,
    "severity": "moderate_severity",
    "room_name": "Klasse 7A",
    "class_name": "7. klasse",
    "flagged_messages": [
      {
        "id": 123,
        "body": "Flagged message text",
        "image_url": null,
        "created_at": "2024-01-01T12:00:00Z"
      }
    ],
    "context_messages": [
      {
        "id": 122,
        "body": "Previous message 1",
        "user_name": "Elev navn",
        "created_at": "2024-01-01T11:59:00Z"
      },
      {
        "id": 121,
        "body": "Previous message 2",
        "user_name": "Anden elev",
        "created_at": "2024-01-01T11:58:00Z"
      }
      // ... up to 8 previous messages
    ]
  }
}
```

## Monitoring

### Check Queue Health
```sql
-- Pending notifications older than 5 minutes (might be stuck)
SELECT * FROM parent_notification_queue 
WHERE status = 'pending' 
  AND created_at < NOW() - INTERVAL '5 minutes';

-- Average batch size
SELECT AVG(array_length(flagged_message_ids, 1)) as avg_batch_size
FROM parent_notification_queue
WHERE status = 'sent';

-- Notifications sent today
SELECT COUNT(*) as notifications_today
FROM parent_notification_queue
WHERE status = 'sent'
  AND sent_at >= CURRENT_DATE;
```

### Check Notification Delivery
```sql
-- Unread moderation notifications
SELECT COUNT(*) FROM notifications 
WHERE type = 'moderation' AND read = false;

-- Moderation notifications by child
SELECT 
  data->>'child_display_name' as child,
  COUNT(*) as notification_count,
  MAX(created_at) as last_notification
FROM notifications
WHERE type = 'moderation'
GROUP BY data->>'child_display_name'
ORDER BY notification_count DESC;
```

## Troubleshooting

### No Notifications Being Created
1. Check if queue is populating:
   ```sql
   SELECT * FROM parent_notification_queue WHERE status = 'pending';
   ```
2. Check if guardian links exist:
   ```sql
   SELECT * FROM guardian_links WHERE child_user_id = '{user_id}';
   ```
3. Check if cron job is running:
   ```sql
   SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
   ```
4. Manually trigger processing:
   ```sql
   SELECT process_parent_notifications();
   ```

### Duplicate Notifications
- Idempotency keys prevent duplicates
- Check for duplicate queue entries:
  ```sql
  SELECT child_user_id, COUNT(*)
  FROM parent_notification_queue
  WHERE status = 'pending'
  GROUP BY child_user_id
  HAVING COUNT(*) > 1;
  ```

### Notifications Not Batching
- Check if messages are within 30-second window
- Verify `created_at` timestamps on queue entries:
  ```sql
  SELECT id, child_user_id, created_at, 
         NOW() - created_at as age
  FROM parent_notification_queue
  WHERE status = 'pending';
  ```

## Next Steps

### Frontend Integration
1. **Display moderation notifications** in parent dashboard
2. **Show flagged messages + context** in a modal/drawer
3. **Mark as read** when parent reviews
4. **Navigate to room** to see full conversation

### Future Enhancements
- **Email fallback** for critical flags (high_severity)
- **Weekly digest** for unread moderation notifications
- **Threshold alerts** if child has multiple flags
- **Analytics** for moderation trends
