# Manual Deployment Guide - Notification System

Since the automated script requires local Supabase setup, here's the manual deployment process (5 minutes):

## Step 1: Deploy Database Migrations (2 min)

### Option A: Via Supabase Dashboard (Recommended)

1. Go to: https://supabase.com/dashboard/project/uxdmqhgilcynzxjpbfui/sql/new

2. Copy and paste the content of these files in order:
   - `supabase/migrations/20241114_notifications_system.sql`
   - `supabase/migrations/20241114_notification_triggers.sql`

3. Click **Run** for each one

### Option B: Via Supabase CLI

```bash
# Link to project
supabase link --project-ref uxdmqhgilcynzxjpbfui

# Push migrations
supabase db push --linked
```

## Step 2: Deploy Edge Function (1 min)

```bash
supabase functions deploy send_notification --project-ref uxdmqhgilcynzxjpbfui
```

## Step 3: Configure Database Webhook (1 min)

1. Go to: https://supabase.com/dashboard/project/uxdmqhgilcynzxjpbfui/database/hooks

2. Click **Create a new hook**

3. Fill in:
   - **Name**: `send_notification_webhook`
   - **Table**: `notifications`
   - **Events**: Check **Insert** ✓
   - **Type**: `HTTP Request`
   - **HTTP Method**: `POST`
   - **URL**: `https://uxdmqhgilcynzxjpbfui.supabase.co/functions/v1/send_notification`

4. Click **Add header**:
   - **Key**: `Authorization`
   - **Value**: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4ZG1xaGdpbGN5bnp4anBiZnVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzEzMjQ1MjIsImV4cCI6MjA0NjkwMDUyMn0.HqmQUCJxSfWx6kDdcr4NWPyPVYX5A7OJzIoWKVFkE0g`

5. Click **Add header** again:
   - **Key**: `Content-Type`
   - **Value**: `application/json`

6. **Payload** (HTTP Request Body):
   ```json
   {"type":"{{event.type}}","record":{{event.record}}}
   ```

7. Click **Create hook**

## Step 4: Verify (1 min)

### Check Tables Exist

Run in SQL Editor:

```sql
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
AND (tablename LIKE 'notification%' OR tablename = 'push_tokens')
ORDER BY tablename;
```

Should return:
- `notification_delivery_log`
- `notification_preferences`
- `notifications`
- `push_tokens`

### Check Functions Exist

```sql
SELECT proname 
FROM pg_proc 
WHERE proname LIKE '%notification%'
ORDER BY proname;
```

Should include:
- `mark_all_notifications_read`
- `mark_notification_read`
- `notify_mention`
- `notify_moderation`
- `notify_new_message`
- `notify_reaction`
- `should_send_notification`

### Check Edge Function

```bash
supabase functions list --project-ref uxdmqhgilcynzxjpbfui
```

Should show `send_notification` with status `ACTIVE`

## Step 5: Test (2 min)

### Test In-App Notifications (Web)

1. Open web app: http://localhost:3000 (if running dev server)
2. Look for bell icon 🔔 in header
3. Open another browser/incognito window
4. Send a message
5. Notification should appear in bell dropdown!

### Test Database Insert

Run in SQL Editor:

```sql
-- Insert test notification
INSERT INTO notifications (
  user_id,
  type,
  title,
  body
) VALUES (
  (SELECT id FROM profiles LIMIT 1), -- Your user ID
  'system',
  'Test Notification',
  'This is a test notification'
);

-- Check it was created
SELECT * FROM notifications ORDER BY created_at DESC LIMIT 1;

-- Check delivery log (if webhook is configured)
SELECT * FROM notification_delivery_log ORDER BY created_at DESC LIMIT 1;
```

## Troubleshooting

### "Table does not exist" error
- Make sure Step 1 migrations ran successfully
- Check for errors in SQL Editor output

### Edge Function not deploying
- Make sure you're logged in: `supabase login`
- Check you have access to the project

### Webhook not triggering
- Verify webhook is enabled in Supabase Dashboard
- Check Edge Function logs: `supabase functions logs send_notification --project-ref uxdmqhgilcynzxjpbfui`
- Verify Authorization header has correct anon key

### Notifications created but no push delivery
- Normal if no mobile devices registered yet
- Check `push_tokens` table: `SELECT * FROM push_tokens WHERE is_valid = true;`
- Mobile setup required (see NOTIFICATIONS_QUICKSTART.md)

## Next: Mobile Setup

After database and Edge Function are deployed, follow mobile setup in:
`NOTIFICATIONS_QUICKSTART.md` → Section 3 (2 minutes)

## Full Documentation

See `NOTIFICATIONS.md` for complete reference.
