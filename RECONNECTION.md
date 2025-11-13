# Graceful Reconnection System

This document explains the graceful reconnection system implemented for KlasseChatten's real-time chat functionality.

## Problem

When users are idle or away from their computer/device for a while, the Supabase Realtime WebSocket connection times out. Previously, this would result in error messages being displayed to users:

```
Subscription status: CHANNEL_ERROR undefined
Error subscribing to room: undefined
Subscription timed out for room: undefined
```

## Solution

We've implemented an automatic reconnection system with exponential backoff that gracefully handles connection failures without showing error messages to users.

## Key Features

### 1. **Automatic Reconnection**
- Detects `CHANNEL_ERROR` and `TIMED_OUT` events
- Automatically attempts to reconnect without user intervention
- Silently handles most connection issues

### 2. **Exponential Backoff**
- First retry: ~1 second delay
- Second retry: ~2 seconds delay
- Third retry: ~4 seconds delay
- Fourth retry: ~8 seconds delay
- Fifth retry: ~16 seconds delay
- Maximum delay capped at 30 seconds
- Adds random jitter (0-1s) to prevent thundering herd

### 3. **Smart Retry Logic**
- Maximum of 5 retry attempts by default
- Resets retry count on successful connection
- Cleans up pending retries on component unmount
- Prevents multiple concurrent reconnection attempts

### 4. **State Management**
- `isConnected`: Boolean indicating current connection status
- `isReconnecting`: Boolean indicating if reconnection is in progress
- `error`: Only set after max retries exhausted (user-facing)

### 5. **Data Consistency**
- Reloads messages after successful reconnection
- Ensures no messages are lost during downtime
- Optimistic updates continue to work during reconnection

## Implementation Details

### Hooks Updated

#### Web App (`apps/web/src/hooks/`)
- ✅ `useRoomMessages.ts` - Message subscription with reconnection
- ✅ `useRoomPresence.ts` - Presence tracking with reconnection

#### Mobile App (`apps/mobile/hooks/`)
- ✅ `useRoomMessages.ts` - Message subscription with reconnection
- ✅ `useRoomPresence.ts` - Presence tracking with reconnection

### Code Structure

Each hook now includes:

```typescript
// State tracking
const [isConnected, setIsConnected] = useState(false);
const [isReconnecting, setIsReconnecting] = useState(false);

// Reconnection state refs
const retryCountRef = useRef(0);
const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
const isReconnectingRef = useRef(false);

// Configuration
const maxRetries = 5;
const baseDelay = 1000; // ms
```

### Exponential Backoff Formula

```typescript
const delay = Math.min(baseDelay * Math.pow(2, retryCount), 30000);
const jitter = Math.random() * 1000;
const totalDelay = delay + jitter;
```

### Subscription Status Handling

```typescript
.subscribe((status) => {
  if (status === 'SUBSCRIBED') {
    // ✅ Connected successfully
    setIsConnected(true);
    setIsReconnecting(false);
    retryCountRef.current = 0; // Reset retry count
    clearRetryTimeout();
  } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
    // ⚠️ Connection lost - attempt reconnection silently
    setIsConnected(false);
    attemptReconnect(channel);
  } else if (status === 'CLOSED') {
    // 🔌 Channel closed
    setIsConnected(false);
  }
});
```

## UI Components

### Web (`apps/web/src/components/ConnectionStatus.tsx`)

```tsx
<ConnectionStatus 
  isConnected={isConnected}
  isReconnecting={isReconnecting}
  position="top" // or "bottom"
  showWhenConnected={false} // optional: briefly show connected state
/>
```

Features:
- DaisyUI themed banner
- Semantic colors (error, warning, success)
- Auto-hides after reconnection
- Accessible with ARIA labels

### Mobile (`apps/mobile/components/ConnectionStatus.tsx`)

```tsx
<ConnectionStatus 
  isConnected={isConnected}
  isReconnecting={isReconnecting}
  position="top" // or "bottom"
/>
```

Features:
- Animated slide in/out
- Native styling
- Status colors matching states

## Usage Example

### In a Chat Component (Web)

```tsx
import { useRoomMessages } from '@/hooks/useRoomMessages';
import { ConnectionStatus } from '@/components/ConnectionStatus';

export function ChatRoom({ roomId }: { roomId: string }) {
  const { 
    messages, 
    loading, 
    error,
    isConnected, 
    isReconnecting 
  } = useRoomMessages({ roomId });

  return (
    <div>
      <ConnectionStatus 
        isConnected={isConnected}
        isReconnecting={isReconnecting}
      />
      
      {/* Chat UI */}
      {messages.map(msg => (
        <div key={msg.id}>{msg.body}</div>
      ))}
      
      {/* Only show error after max retries */}
      {error && (
        <div className="alert alert-error">
          {error}
          <button onClick={() => window.location.reload()}>
            Genindlæs side
          </button>
        </div>
      )}
    </div>
  );
}
```

### In a Chat Component (Mobile)

```tsx
import { useRoomMessages } from '../hooks/useRoomMessages';
import { ConnectionStatus } from '../components/ConnectionStatus';

export function ChatRoom({ roomId }: { roomId: string }) {
  const { 
    messages, 
    loading,
    error, 
    isConnected, 
    isReconnecting 
  } = useRoomMessages({ roomId });

  return (
    <View style={styles.container}>
      <ConnectionStatus 
        isConnected={isConnected}
        isReconnecting={isReconnecting}
      />
      
      <FlatList
        data={messages}
        renderItem={({ item }) => <Message message={item} />}
      />
    </View>
  );
}
```

## Logging

The system uses emoji-prefixed console logs for easy debugging:

- 🔌 `Setting up channel / Unsubscribing`
- 📡 `Subscription status updates`
- ✅ `Successful operations`
- ⚠️ `Warnings (attempting reconnection)`
- ❌ `Errors`
- 🔄 `Reconnection attempts`
- ⏱️ `Timeouts and delays`
- 👥 `Presence events`

Example console output during reconnection:

```
📡 Subscription status: TIMED_OUT
⚠️ Connection timed out for room xxx, attempting reconnection...
🔄 Attempting reconnection (1/5)...
✅ Reconnection successful, messages reloaded
📡 Subscription status: SUBSCRIBED
✅ Successfully subscribed to room xxx
```

## Configuration

You can adjust reconnection behavior by modifying these constants in each hook:

```typescript
const maxRetries = 5;        // Max reconnection attempts
const baseDelay = 1000;      // Initial delay in ms
const maxDelay = 30000;      // Cap delay at 30 seconds
```

## Error Handling

### Silent Errors (Handled Gracefully)
- ✅ `CHANNEL_ERROR` - Network issues
- ✅ `TIMED_OUT` - Connection timeout
- ✅ Temporary network drops
- ✅ WebSocket disconnections

### User-Facing Errors (After Max Retries)
- ❌ Persistent connection failures
- ❌ Server unavailable
- ❌ Authentication issues

## Testing

### Test Reconnection

1. **Simulate network disconnect:**
   - Chrome DevTools → Network → Throttling → Offline
   - Wait for timeout (~30 seconds)
   - Re-enable network
   - Observe automatic reconnection

2. **Simulate slow connection:**
   - Throttling → Slow 3G
   - Messages should still sync, albeit slowly

3. **Simulate long idle:**
   - Leave tab open for 5+ minutes
   - Switch back to tab
   - Should reconnect automatically

### Expected Behavior

✅ **Good:**
- No error messages displayed immediately
- Subtle reconnecting indicator shown
- Messages reload after reconnection
- Chat continues working normally

❌ **Bad:**
- Error dialog blocks the UI
- Messages don't reload
- User must refresh manually
- Multiple error messages stack up

## Benefits

1. **Better UX**: Users aren't interrupted by technical errors
2. **Automatic Recovery**: No manual refresh needed in most cases
3. **Data Consistency**: Messages reload after reconnection
4. **Network Resilient**: Handles temporary network issues gracefully
5. **Battery Efficient**: Exponential backoff reduces battery drain
6. **Server Friendly**: Jitter prevents all clients reconnecting simultaneously

## Future Improvements

- [ ] Configurable retry strategy per hook
- [ ] Offline mode with local queue
- [ ] Background sync for mobile
- [ ] Adaptive retry based on network conditions
- [ ] Metrics for connection quality
- [ ] User preference for connection indicator

## Related Files

- `apps/web/src/hooks/useRoomMessages.ts`
- `apps/web/src/hooks/useRoomPresence.ts`
- `apps/web/src/components/ConnectionStatus.tsx`
- `apps/mobile/hooks/useRoomMessages.ts`
- `apps/mobile/hooks/useRoomPresence.ts`
- `apps/mobile/components/ConnectionStatus.tsx`
- `apps/web/src/hooks/useReconnection.ts` (standalone hook for reference)
