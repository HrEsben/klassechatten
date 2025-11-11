# Realtime Chat Implementation

This document explains the realtime chat system with backfill in KlasseChatten.

## Architecture

### Channel Design

Each chat room has its own realtime channel:
```
realtime:room.{room_id}
```

This provides:
- ✅ Isolated channels per room
- ✅ Automatic presence tracking
- ✅ Scalable architecture
- ✅ Easy subscription management

## Client Flow

### 1. On App Start / Room Enter

**Backfill last N messages:**
```typescript
const { data } = await supabase
  .from('messages')
  .select('*')
  .eq('room_id', roomId)
  .is('deleted_at', null)
  .order('created_at', { ascending: false })
  .limit(50);
```

### 2. Subscribe to Realtime

**Listen for new messages:**
```typescript
supabase
  .channel(`realtime:room.${roomId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'messages',
    filter: `room_id=eq.${roomId}`
  }, (payload) => {
    // Add new message to UI
  })
  .subscribe();
```

### 3. Send Message

**Call Edge Function (not direct insert):**
```typescript
await fetch(`${SUPABASE_URL}/functions/v1/create_message`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ room_id: roomId, body: text })
});
```

This ensures:
- ✅ Moderation happens before insert
- ✅ Realtime broadcast after insert
- ✅ All clients see moderated content

## Hooks Created

### Web: `useRoomMessages`
**File:** `apps/web/src/hooks/useRoomMessages.ts`

```typescript
const { 
  messages,      // Array of messages
  loading,       // Initial load state
  error,         // Error message
  refresh,       // Manual refresh function
  isConnected    // Realtime connection status
} = useRoomMessages({ 
  roomId: 'uuid',
  limit: 50,      // Number of messages to backfill
  enabled: true   // Enable/disable subscription
});
```

### Mobile: `useRoomMessages`
**File:** `apps/mobile/hooks/useRoomMessages.ts`

Same API as web version, works with React Native.

## Components Created

### Web: `ChatRoom`
**File:** `apps/web/src/components/ChatRoom.tsx`

Features:
- ✅ Real-time message updates
- ✅ Connection status indicator
- ✅ Moderation suggestion dialog
- ✅ Auto-scroll on new messages
- ✅ Danish UI

### Mobile: `ChatRoom`
**File:** `apps/mobile/components/ChatRoom.tsx`

Features:
- ✅ Real-time message updates
- ✅ Connection status indicator
- ✅ Moderation suggestion modal
- ✅ Auto-scroll on new messages
- ✅ Keyboard handling
- ✅ Danish UI

## Realtime Events Handled

### INSERT
New message added to room → append to UI

### UPDATE
Message edited → update in UI (or remove if soft-deleted)

### DELETE
Message hard-deleted → remove from UI

## Database Requirements

### Enable Realtime on Messages Table

Run this in Supabase SQL Editor:

```sql
-- Enable realtime on messages table
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- Optional: Enable for other tables
ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE class_members;
```

### Verify Realtime is Enabled

In Supabase Dashboard:
1. Go to **Database** → **Replication**
2. Check that `messages` table is listed
3. Ensure replication is enabled

## Usage Examples

### Web Page Example

```typescript
// app/rooms/[roomId]/page.tsx
'use client';

import { useParams } from 'next/navigation';
import ChatRoom from '@/components/ChatRoom';

export default function RoomPage() {
  const params = useParams();
  const roomId = params.roomId as string;

  return <ChatRoom roomId={roomId} />;
}
```

### Mobile Screen Example

```typescript
// app/room/[id].tsx
import { useLocalSearchParams } from 'expo-router';
import ChatRoom from '../components/ChatRoom';

export default function RoomScreen() {
  const { id } = useLocalSearchParams();
  const roomId = id as string;

  return <ChatRoom roomId={roomId} />;
}
```

## Performance Optimization

### Backfill Limits
- Default: 50 messages
- Can be adjusted per room
- Consider pagination for large rooms

### Connection Management
- Auto-reconnect on disconnect
- Graceful degradation if realtime unavailable
- Manual refresh option

### Memory Management
- Messages kept in state
- Consider implementing message pruning for very long chats
- Virtual scrolling for mobile performance

## Testing Realtime

### Test in Browser Console

```javascript
// Web
const { supabase } = await import('./src/lib/supabase');

const channel = supabase
  .channel('test-room.abc-123')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'messages',
    filter: 'room_id=eq.abc-123'
  }, (payload) => {
    console.log('New message:', payload);
  })
  .subscribe();
```

### Test Message Flow

1. Open app in two browsers/devices
2. Send message from one
3. Verify it appears in the other
4. Check moderation suggestions appear correctly
5. Verify blocked messages don't appear

## Troubleshooting

### Messages Not Appearing in Realtime

**Check:**
1. Realtime enabled on table: `ALTER PUBLICATION supabase_realtime ADD TABLE messages;`
2. RLS policies allow SELECT
3. Correct room_id in filter
4. Channel subscribed successfully

### Connection Issues

**Check:**
1. WebSocket connection in Network tab
2. Supabase project not paused
3. Valid JWT token
4. CORS settings

### Performance Issues

**Check:**
1. Too many messages in backfill
2. Too many realtime subscriptions
3. Need to implement pagination
4. Consider message pruning

## Security

- ✅ RLS policies enforced on realtime
- ✅ Users only see messages in their classes
- ✅ Moderation happens before broadcast
- ✅ Deleted messages filtered out
- ✅ JWT validated on subscription

## Cost Considerations

### Supabase Realtime Pricing
- **Free tier**: 500K realtime messages/month
- **Pro tier**: $25/month includes 5M messages
- **Typical usage**: ~1M messages/month for 1000 active users

### Optimization Tips
1. Unsubscribe when leaving room
2. Use single channel per room
3. Filter messages at database level
4. Consider broadcast for high-traffic rooms

## Next Steps

1. ✅ Enable realtime on messages table
2. ✅ Test message flow
3. Implement typing indicators
4. Add presence (who's online)
5. Add read receipts
6. Implement message reactions
7. Add image/file attachments
