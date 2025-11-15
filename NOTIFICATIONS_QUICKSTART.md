# Notification System Quick Start Guide

## 🚀 Quick Setup (5 minutes)

### 1. Deploy to Supabase (2 min)

```bash
# Run deployment script
chmod +x deploy-notifications.sh
./deploy-notifications.sh
```

This will:
- ✅ Deploy database tables, functions, and triggers
- ✅ Deploy Edge Function for push delivery
- ✅ Guide you through webhook configuration

### 2. Configure Database Webhook (1 min)

Go to Supabase Dashboard → Database → Webhooks:

https://supabase.com/dashboard/project/uxdmqhgilcynzxjpbfui/database/hooks

**Create New Webhook:**
- Name: `send_notification_webhook`
- Table: `notifications`
- Events: `INSERT` ✓
- Type: `HTTP Request`
- Method: `POST`
- URL: `https://uxdmqhgilcynzxjpbfui.supabase.co/functions/v1/send_notification`
- Headers:
  ```
  Authorization: Bearer eyJhbGci... (your ANON KEY)
  Content-Type: application/json
  ```
- Payload:
  ```json
  {"type":"{{event.type}}","record":{{event.record}}}
  ```

### 3. Mobile App Setup (2 min)

**Add Expo project ID** to `apps/mobile/app.json`:

```json
{
  "expo": {
    "extra": {
      "eas": {
        "projectId": "YOUR-PROJECT-ID-HERE"
      }
    }
  }
}
```

Get your project ID from: https://expo.dev/accounts/[username]/projects

**Initialize notifications** in `apps/mobile/app/_layout.tsx`:

```typescript
import { initializePushNotifications, addNotificationResponseReceivedListener } from '@/utils/pushNotifications';

// Inside root component
useEffect(() => {
  if (user) {
    // Initialize push notifications
    initializePushNotifications(user.id).then(result => {
      if (!result.success) {
        console.error('Push notification setup failed:', result.error);
      }
    });

    // Handle notification taps
    const subscription = addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      if (data.room_id && data.class_id) {
        // Navigate to chat
        router.push(`/?class=${data.class_id}&room=${data.room_id}`);
      }
    });

    return () => subscription.remove();
  }
}, [user]);
```

## ✅ Verification (1 min)

### Test in-app notifications (Web)

1. Open web app
2. Look for bell icon 🔔 in header (next to logout button)
3. Send a message in another browser/device
4. Notification should appear in real-time!

### Test push notifications (Mobile)

**Prerequisites**: Physical device (push doesn't work in simulator)

1. Build and install app on physical device:
   ```bash
   cd apps/mobile
   npx expo run:ios  # or run:android
   ```

2. Grant notification permission when prompted

3. Send message from another device

4. Notification should appear in system tray!

### Verify Database

Run in Supabase SQL Editor:

```sql
-- Check notifications are being created
SELECT * FROM notifications ORDER BY created_at DESC LIMIT 10;

-- Check push tokens are registered
SELECT user_id, platform, is_valid FROM push_tokens;

-- Check delivery logs
SELECT status, COUNT(*) FROM notification_delivery_log GROUP BY status;
```

## 🎨 Customization

### Change notification triggers

Edit `supabase/migrations/20241114_notification_triggers.sql`:

- Modify `notify_new_message()` to change when message notifications are sent
- Adjust `notify_mention()` mention detection pattern
- Update `notify_reaction()` for different reaction behavior

### Add new notification types

1. Add type to enum in `packages/types/src/notifications.ts`:
   ```typescript
   export type NotificationType = 
     | 'new_message'
     | 'mention'
     | 'reaction'
     | 'system'
     | 'moderation'
     | 'your_new_type';  // Add here
   ```

2. Create trigger function:
   ```sql
   CREATE OR REPLACE FUNCTION notify_your_new_type()
   RETURNS TRIGGER AS $$
   BEGIN
     -- Your logic here
     INSERT INTO notifications (user_id, type, title, body, ...)
     VALUES (...);
     RETURN NEW;
   END;
   $$ LANGUAGE plpgsql;
   ```

3. Create trigger:
   ```sql
   CREATE TRIGGER trigger_notify_your_new_type
     AFTER INSERT ON your_table
     FOR EACH ROW
     EXECUTE FUNCTION notify_your_new_type();
   ```

### Customize notification appearance

**Mobile**:
Edit `apps/mobile/utils/pushNotifications.ts` → `setNotificationHandler`:

```typescript
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,     // Change this
    shouldSetBadge: true,
    priority: 'high',          // Add this
  }),
});
```

**Web**:
Edit `apps/web/src/components/NotificationBell.tsx`:
- Change colors in `getNotificationIcon()`
- Modify dropdown layout
- Adjust notification item design

## 🔧 Common Issues

### "No push token" error

**Cause**: App doesn't have Expo project ID or permission denied.

**Fix**:
1. Add project ID to `app.json`
2. Uninstall and reinstall app
3. Grant permission when prompted

### Notifications created but not delivered

**Cause**: Webhook not configured or Edge Function error.

**Fix**:
1. Check webhook exists in Supabase Dashboard
2. Check Edge Function logs:
   ```bash
   supabase functions logs send_notification
   ```
3. Verify webhook URL is correct

### "Token invalid" errors

**Cause**: Device uninstalled app or revoked permission.

**Fix**: Token will be re-registered on next app open. Invalid tokens auto-cleanup after 30 days.

### Notifications not real-time on web

**Cause**: Realtime not enabled on notifications table.

**Fix**:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
```

## 📚 Documentation

- **Full Documentation**: See `NOTIFICATIONS.md`
- **API Reference**: See `packages/types/src/notifications.ts`
- **Examples**: See `apps/web/src/components/NotificationBell.tsx`

## 💡 Pro Tips

1. **Test on physical device**: Push notifications don't work in iOS Simulator
2. **Check Edge Function logs** first when debugging delivery issues
3. **Use idempotency keys** to prevent duplicate notifications
4. **Monitor delivery logs** to track success rates
5. **Set up quiet hours** for better user experience
6. **Rate limit** prevents notification spam

## 🎯 Next Steps

1. ✅ Test basic notifications
2. ⬜ Build notification settings page (see TODO #7)
3. ⬜ Add notification preferences UI
4. ⬜ Implement notification grouping
5. ⬜ Add rich media support (images)
6. ⬜ Set up analytics/monitoring

## 🆘 Need Help?

- Read full documentation: `cat NOTIFICATIONS.md`
- Check Edge Function logs: `supabase functions logs send_notification`
- Inspect database: Open SQL Editor in Supabase Dashboard
- Test manually: Insert notification via SQL
