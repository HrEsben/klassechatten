# KlasseChatten Notification System

Complete cross-platform notification system for KlasseChatten with push notifications (mobile) and in-app notifications (web + mobile).

## 📋 Architecture Overview

### Single Source of Truth

All notifications are stored in the `notifications` table, which serves as:
- **In-app feed**: Realtime updates via Supabase Realtime
- **Push notification source**: Triggers webhook → Edge Function → APNs/FCM/Expo

```
┌─────────────┐
│  Message    │
│  Created    │
└──────┬──────┘
       │
       ▼
┌──────────────────┐
│  DB Trigger      │
│  notify_*()      │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐     ┌────────────────┐
│  notifications   │────▶│  Realtime      │
│  table (INSERT)  │     │  (in-app feed) │
└──────┬───────────┘     └────────────────┘
       │
       ▼
┌──────────────────┐
│  Database        │
│  Webhook         │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│  Edge Function   │
│  send_notification│
└──────┬───────────┘
       │
       ├─────────────────┐
       ▼                 ▼
┌──────────────┐   ┌─────────────┐
│  Expo Push   │   │  APNs/FCM   │
│  Service     │   │  (future)   │
└──────────────┘   └─────────────┘
```

## 🗄️ Database Schema

### Tables

#### `notifications`
Single source of truth for all notifications.

```sql
- id: UUID (PK)
- user_id: UUID (FK → profiles)
- type: TEXT ('new_message' | 'mention' | 'reaction' | 'system' | 'moderation')
- title: TEXT
- body: TEXT
- room_id: UUID (FK → rooms, nullable)
- message_id: UUID (FK → messages, nullable)
- class_id: UUID (FK → classes, nullable)
- data: JSONB (additional context)
- read: BOOLEAN (default false)
- read_at: TIMESTAMPTZ
- delivered: BOOLEAN (default false)
- delivered_at: TIMESTAMPTZ
- idempotency_key: TEXT (unique, prevents duplicates)
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

#### `push_tokens`
Device tokens for push notifications.

```sql
- id: UUID (PK)
- user_id: UUID (FK → profiles)
- token: TEXT (Expo/APNs/FCM token)
- platform: TEXT ('ios' | 'android' | 'web')
- provider: TEXT ('expo' | 'apns' | 'fcm' | 'web-push')
- device_id: TEXT (unique per device)
- device_name: TEXT (e.g., "iPhone 14 Pro")
- app_version: TEXT
- is_valid: BOOLEAN (default true)
- last_used_at: TIMESTAMPTZ
- invalid_at: TIMESTAMPTZ
- error_count: INTEGER
- last_error: TEXT
- UNIQUE(user_id, device_id, platform)
```

#### `notification_preferences`
Per-user notification settings.

```sql
- id: UUID (PK)
- user_id: UUID (FK → profiles, unique)
- push_enabled: BOOLEAN (default true)
- in_app_enabled: BOOLEAN (default true)
- notify_new_messages: BOOLEAN (default true)
- notify_mentions: BOOLEAN (default true)
- notify_reactions: BOOLEAN (default true)
- notify_system: BOOLEAN (default true)
- notify_moderation: BOOLEAN (default true)
- quiet_hours_enabled: BOOLEAN (default false)
- quiet_hours_start: TIME (e.g., '22:00')
- quiet_hours_end: TIME (e.g., '07:00')
- max_notifications_per_hour: INTEGER (default 60)
- muted_rooms: JSONB (array of room IDs)
- muted_classes: JSONB (array of class IDs)
```

#### `notification_delivery_log`
Tracks push notification delivery for observability.

```sql
- id: UUID (PK)
- notification_id: UUID (FK → notifications)
- push_token_id: UUID (FK → push_tokens)
- status: TEXT ('pending' | 'sent' | 'delivered' | 'failed' | 'retry')
- provider: TEXT ('expo' | 'apns' | 'fcm')
- provider_response: JSONB
- error_code: TEXT
- error_message: TEXT
- retry_count: INTEGER
- sent_at: TIMESTAMPTZ
- delivered_at: TIMESTAMPTZ
- failed_at: TIMESTAMPTZ
```

### Database Functions

#### `should_send_notification(user_id, type, room_id?, class_id?)`
Checks user preferences before creating notification. Returns `BOOLEAN`.

Checks:
- Global push/in-app toggles
- Per-type preferences
- Muted rooms/classes
- Quiet hours (timezone-aware)
- Rate limits (max per hour)

#### `mark_notification_read(notification_id)`
Marks a single notification as read.

#### `mark_all_notifications_read()`
Marks all notifications for current user as read.

#### `cleanup_invalid_push_tokens()`
Deletes tokens invalid for >30 days. Returns count deleted.

### Database Triggers

#### `trigger_notify_new_message`
Creates notifications when message is inserted (after moderation).

#### `trigger_notify_mention`
Creates notifications when user is @mentioned in message.

#### `trigger_notify_reaction`
Creates notifications when someone reacts to user's message.

#### `trigger_notify_moderation`
Creates notifications when message is flagged/blocked.

## 🚀 Edge Function: `send_notification`

### Purpose
Receives webhook from notifications INSERT → sends push notifications.

### Flow
1. Receive webhook payload (notification record)
2. Fetch user's valid push tokens
3. Group by provider (Expo, APNs, FCM)
4. Send batch requests with retry logic
5. Handle responses:
   - **Success**: Log delivery, update token `last_used_at`
   - **Failure**: Log error, increment error count
   - **Token error**: Invalidate token
6. Update notification `delivered` status

### Retry Logic
- Max retries: 3
- Delays: 1s, 5s, 15s (exponential backoff)
- Idempotent (same notification_id)

### Token Hygiene
Invalid tokens if:
- `DeviceNotRegistered`
- `InvalidCredentials`
- `MessageTooBig`
- `MessageRateExceeded`

Auto-cleanup after 30 days via function.

### Expo Push API
- Endpoint: `https://exp.host/--/api/v2/push/send`
- Batch limit: 100 messages
- Rate limit: ~600 messages/second

## 📱 Mobile Integration (Expo)

### Setup

1. **Install dependencies**:
```bash
cd apps/mobile
npx expo install expo-notifications expo-device expo-constants
```

2. **Add Expo project ID to `app.json`**:
```json
{
  "expo": {
    "extra": {
      "eas": {
        "projectId": "your-project-id-here"
      }
    }
  }
}
```

3. **Initialize on app start** (in `_layout.tsx`):
```typescript
import { initializePushNotifications, addNotificationResponseReceivedListener } from '@/utils/pushNotifications';

useEffect(() => {
  if (user) {
    initializePushNotifications(user.id).then(result => {
      if (result.success) {
        console.log('Push notifications initialized');
      }
    });

    // Handle notification taps
    const subscription = addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      // Navigate to relevant screen
      if (data.room_id && data.class_id) {
        router.push(`/chat/${data.class_id}/${data.room_id}`);
      }
    });

    return () => subscription.remove();
  }
}, [user]);
```

### Push Notification Utilities

Located in `apps/mobile/utils/pushNotifications.ts`:

- `requestPushPermissions()`: Ask user for permission
- `getExpoPushToken()`: Get Expo push token
- `registerPushToken(userId, token)`: Register with backend
- `unregisterPushToken(token)`: Remove token
- `setBadgeCount(count)`: Update app badge
- `clearAllNotifications()`: Dismiss all
- `parseDeepLink(data)`: Extract navigation info

## 🌐 Web Integration

### In-App Notifications

**Component**: `NotificationBell.tsx`

Features:
- Real-time updates via Supabase Realtime
- Dropdown with notification list
- Unread badge indicator
- Mark as read on click
- Navigate to relevant chat room
- Mark all as read button

**Usage**:
```tsx
import NotificationBell from '@/components/NotificationBell';

<NotificationBell />
```

### Hooks

#### `useNotifications()`
```typescript
const {
  notifications,      // Notification[]
  unreadCount,        // number
  isLoading,          // boolean
  error,              // Error | null
  markAsRead,         // (id: string) => Promise<void>
  markAllAsRead,      // () => Promise<void>
  deleteNotification, // (id: string) => Promise<void>
  refresh,            // () => Promise<void>
} = useNotifications();
```

#### `useNotificationPreferences()`
```typescript
const {
  preferences,       // NotificationPreferences | null
  isLoading,         // boolean
  error,             // Error | null
  updatePreferences, // (updates) => Promise<void>
  toggleMuteRoom,    // (roomId) => Promise<void>
  toggleMuteClass,   // (classId) => Promise<void>
} = useNotificationPreferences();
```

## 🔐 Security & Privacy

### RLS Policies

All tables have Row Level Security enabled:

- **notifications**: Users see only their own
- **push_tokens**: Users manage only their own
- **notification_preferences**: Users manage only their own
- **notification_delivery_log**: Admin-only visibility

### Minimal Payload

Push notifications contain minimal PII:
- Title: Class/room name + sender name
- Body: Message preview (max 100 chars)
- Data: IDs for deep linking

Full message content is fetched after user taps notification.

### Secrets

Never expose in client code:
- Supabase service role key (Edge Function only)
- APNs key (future)
- FCM server key (future)

## ⚙️ Configuration

### Notification Preferences

Users can control:
- **Global toggles**: Push enabled, in-app enabled
- **Per-type**: New messages, mentions, reactions, system, moderation
- **Quiet hours**: Start/end time (local timezone)
- **Rate limits**: Max notifications per hour
- **Muting**: Specific rooms or classes

### Quiet Hours

Stored as `TIME` (no timezone):
- Interpreted in user's local time
- Handles overnight (e.g., 22:00 - 07:00)
- Checked before inserting notification

### Rate Limiting

Default: 60 notifications/hour per user.

Prevents spam if:
- User in very active room
- System sends burst of notifications

## 📊 Observability

### Metrics to Track

1. **Delivery success rate**: `sent / total`
2. **Error rate**: `failed / total`
3. **Invalid token rate**: `invalidated / total_tokens`
4. **Notification types**: Distribution of types
5. **User engagement**: Read rate, time-to-read

### Logs

**Edge Function logs**:
```bash
supabase functions logs send_notification --project-ref uxdmqhgilcynzxjpbfui
```

**Database queries**:
```sql
-- Recent notifications
SELECT * FROM notifications ORDER BY created_at DESC LIMIT 100;

-- Delivery stats (last 24h)
SELECT 
  status,
  COUNT(*) as count,
  AVG(retry_count) as avg_retries
FROM notification_delivery_log
WHERE created_at > now() - interval '24 hours'
GROUP BY status;

-- Invalid tokens
SELECT * FROM push_tokens WHERE is_valid = FALSE;

-- Most active notification types
SELECT type, COUNT(*) as count
FROM notifications
WHERE created_at > now() - interval '7 days'
GROUP BY type
ORDER BY count DESC;
```

## 🧪 Testing

### Test Checklist

#### iOS
- [ ] Foreground notification (alert shown)
- [ ] Background notification (tray notification)
- [ ] Killed app notification (tray + cold start)
- [ ] Tap notification → deep link works
- [ ] Badge count updates
- [ ] Sound plays

#### Android
- [ ] Foreground notification (alert shown)
- [ ] Background notification (tray notification)
- [ ] Killed app notification (tray + cold start)
- [ ] Tap notification → deep link works
- [ ] Badge count updates
- [ ] Sound plays
- [ ] Notification channel works

#### Web
- [ ] In-app notifications appear in real-time
- [ ] Unread badge updates
- [ ] Mark as read works
- [ ] Mark all as read works
- [ ] Deep link navigation works
- [ ] Realtime updates when notification arrives

#### Edge Cases
- [ ] Network offline → online (queued notifications)
- [ ] Token invalidated (graceful degradation)
- [ ] Quiet hours (notifications blocked)
- [ ] Muted room (notifications blocked)
- [ ] Rate limit exceeded (notifications blocked)
- [ ] Duplicate notifications (idempotency key prevents)

### Manual Testing

**Send test notification**:
```typescript
// In web app console or mobile app
await supabase.from('notifications').insert({
  user_id: 'your-user-id',
  type: 'system',
  title: 'Test Notification',
  body: 'This is a test notification',
});
```

**Check delivery**:
```sql
SELECT * FROM notification_delivery_log 
WHERE notification_id = 'your-notification-id';
```

## 🚀 Deployment

### Prerequisites

1. Supabase CLI installed: `npm install -g supabase`
2. Logged in: `supabase login`
3. Project linked: `supabase link --project-ref uxdmqhgilcynzxjpbfui`

### Automated Deployment

```bash
chmod +x deploy-notifications.sh
./deploy-notifications.sh
```

This script will:
1. Deploy database migrations
2. Deploy Edge Function
3. Guide you through webhook configuration

### Manual Steps

#### 1. Deploy Migrations

```bash
supabase db push
```

Or via Supabase Dashboard → SQL Editor:
- Run `supabase/migrations/20241114_notifications_system.sql`
- Run `supabase/migrations/20241114_notification_triggers.sql`

#### 2. Deploy Edge Function

```bash
supabase functions deploy send_notification
```

#### 3. Configure Database Webhook

Go to: https://supabase.com/dashboard/project/uxdmqhgilcynzxjpbfui/database/hooks

Create webhook:
- **Name**: `send_notification_webhook`
- **Table**: `notifications`
- **Events**: `INSERT`
- **Type**: HTTP Request
- **Method**: POST
- **URL**: `https://uxdmqhgilcynzxjpbfui.supabase.co/functions/v1/send_notification`
- **Headers**:
  - `Authorization: Bearer [ANON_KEY]`
  - `Content-Type: application/json`
- **Payload**: `{"type":"{{event.type}}","record":{{event.record}}}`

#### 4. Enable Realtime

Already done in migration, but verify:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
```

## 🔧 Maintenance

### Regular Tasks

**Weekly**:
- Check error rates in delivery logs
- Review invalid token count
- Monitor Edge Function errors

**Monthly**:
- Clean up old invalid tokens: `SELECT cleanup_invalid_push_tokens();`
- Archive old notifications (if needed)
- Review and optimize trigger performance

### Troubleshooting

#### Notifications not received

1. **Check notifications table**: Was notification created?
   ```sql
   SELECT * FROM notifications WHERE user_id = 'user-id' ORDER BY created_at DESC LIMIT 10;
   ```

2. **Check push tokens**: Does user have valid token?
   ```sql
   SELECT * FROM push_tokens WHERE user_id = 'user-id' AND is_valid = true;
   ```

3. **Check delivery logs**: Did push send?
   ```sql
   SELECT * FROM notification_delivery_log WHERE notification_id = 'notification-id';
   ```

4. **Check Edge Function logs**:
   ```bash
   supabase functions logs send_notification
   ```

#### Token invalidated

- User may have uninstalled/reinstalled app
- App may have revoked notification permission
- Device may have changed
- Solution: Re-register token on next app open

#### High error rate

- Check Expo status page: https://status.expo.dev/
- Verify project ID in `app.json`
- Check token format (should start with `ExponentPushToken[...]`)

## 📚 Additional Resources

- [Expo Push Notifications Guide](https://docs.expo.dev/push-notifications/overview/)
- [Supabase Realtime Documentation](https://supabase.com/docs/guides/realtime)
- [Supabase Database Webhooks](https://supabase.com/docs/guides/database/webhooks)
- [APNs Provider API](https://developer.apple.com/documentation/usernotifications)
- [FCM HTTP v1 API](https://firebase.google.com/docs/cloud-messaging/http-server-ref)

## 🎯 Future Enhancements

- [ ] Web Push notifications (Push API)
- [ ] Native APNs integration (bypass Expo)
- [ ] Native FCM integration (bypass Expo)
- [ ] Notification grouping/threading
- [ ] Rich media notifications (images, actions)
- [ ] Notification scheduling
- [ ] Analytics dashboard
- [ ] A/B testing for notification content
- [ ] Machine learning for optimal send times
- [ ] Push notification templates
