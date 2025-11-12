# Smart Scrolling Strategy for Chat Rooms

## Problem
Loading thousands of messages and scrolling to the last read position is inefficient and causes performance issues.

## Solution: Pagination with Smart Loading

### 1. **Initial Load Strategy**
When entering a chat room:
- Query the `read_receipts` table for the user's last read message
- If found: Load 50 messages centered around that message (25 before, 25 after)
- If not found or is latest: Load last 50 messages and scroll to bottom
- Show "Jump to latest" button if not at the latest messages

### 2. **Infinite Scroll Implementation**
- **Scroll Up**: Load 50 older messages when reaching top
- **Scroll Down**: Load 50 newer messages when reaching bottom
- Use `IntersectionObserver` for efficient scroll detection

### 3. **Database Query Optimization**
```sql
-- Get last read message for user
SELECT message_id, read_at 
FROM read_receipts 
WHERE user_id = $1 AND room_id = $2
ORDER BY read_at DESC 
LIMIT 1;

-- Load messages around last read (centered pagination)
WITH last_read AS (
  SELECT message_id FROM read_receipts 
  WHERE user_id = $1 AND room_id = $2
  ORDER BY read_at DESC LIMIT 1
),
before_messages AS (
  SELECT * FROM messages 
  WHERE room_id = $2 AND id < (SELECT message_id FROM last_read)
  ORDER BY created_at DESC LIMIT 25
),
after_messages AS (
  SELECT * FROM messages 
  WHERE room_id = $2 AND id >= (SELECT message_id FROM last_read)
  ORDER BY created_at ASC LIMIT 25
)
SELECT * FROM before_messages
UNION ALL
SELECT * FROM after_messages
ORDER BY created_at ASC;
```

### 4. **UI/UX Elements**
- **Unread Indicator**: Show a divider line at the last read message
- **Jump to Latest Button**: Fixed button to quickly scroll to newest messages
- **Loading Spinners**: Show when loading more messages at top/bottom
- **Message Count Badge**: Show number of unread messages on "Jump to latest" button

### 5. **Real-time Updates**
- New messages always append to the end
- If user is at bottom: auto-scroll to new messages
- If user is scrolled up: show badge with count of new messages

### 6. **Implementation Steps**

#### Step 1: Update `useRoomMessages` Hook
Add pagination support:
```typescript
interface UseRoomMessagesOptions {
  initialAnchor?: number; // Message ID to load around
  pageSize?: number; // Default 50
}

function useRoomMessages(roomId: string, options: UseRoomMessagesOptions) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [hasMoreBefore, setHasMoreBefore] = useState(true);
  const [hasMoreAfter, setHasMoreAfter] = useState(false);
  const [isLoadingBefore, setIsLoadingBefore] = useState(false);
  const [isLoadingAfter, setIsLoadingAfter] = useState(false);
  
  // Load initial messages (centered around anchor or latest)
  const loadInitialMessages = async () => { ... };
  
  // Load more messages before the current earliest
  const loadMoreBefore = async () => { ... };
  
  // Load more messages after the current latest
  const loadMoreAfter = async () => { ... };
  
  return {
    messages,
    hasMoreBefore,
    hasMoreAfter,
    isLoadingBefore,
    isLoadingAfter,
    loadMoreBefore,
    loadMoreAfter,
  };
}
```

#### Step 2: Update `ChatRoom` Component
```tsx
// Get last read message ID
const { data: lastRead } = await supabase
  .from('read_receipts')
  .select('message_id')
  .eq('user_id', user.id)
  .eq('room_id', roomId)
  .order('read_at', { ascending: false })
  .limit(1)
  .single();

// Use it as anchor
const { messages, loadMoreBefore, loadMoreAfter, hasMoreAfter } = useRoomMessages(roomId, {
  initialAnchor: lastRead?.message_id,
});

// Show "Jump to Latest" if not at the end
{hasMoreAfter && (
  <button onClick={scrollToLatest}>
    Jump to Latest {unreadCount > 0 && `(${unreadCount})`}
  </button>
)}
```

#### Step 3: Add Infinite Scroll Observers
```tsx
// Detect when scrolling near top
const topSentinel = useRef<HTMLDivElement>(null);
useEffect(() => {
  const observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting && hasMoreBefore && !isLoadingBefore) {
        loadMoreBefore();
      }
    },
    { threshold: 0.1 }
  );
  
  if (topSentinel.current) {
    observer.observe(topSentinel.current);
  }
  
  return () => observer.disconnect();
}, [hasMoreBefore, isLoadingBefore, loadMoreBefore]);
```

### 7. **Benefits**
- ✅ Only loads 50-100 messages at a time (vs thousands)
- ✅ Fast initial load
- ✅ Smooth scrolling to last read position
- ✅ Scalable to millions of messages
- ✅ Good UX with loading indicators
- ✅ Real-time updates still work

### 8. **Edge Cases to Handle**
- User has never read any messages → Load latest 50
- Last read message was deleted → Find nearest message
- Room has < 50 messages → Load all, no pagination needed
- User jumps between old and new messages → Cache both ranges

## Next Steps
1. Implement paginated message loading in `useRoomMessages`
2. Add IntersectionObserver for infinite scroll
3. Update ChatRoom component to use new hook API
4. Add "Jump to Latest" button with unread count
5. Test with large message dataset (10,000+ messages)
