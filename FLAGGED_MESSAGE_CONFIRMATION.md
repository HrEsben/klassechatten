# Flagged Message Confirmation Flow

## Overview
When a user sends a message that is flagged by AI moderation, they now see a confirmation modal before the message is sent. This gives users control and awareness of potentially inappropriate content.

## Two-Step Flow

### Step 1: Check Content
1. User types message and clicks "Send"
2. `handleSend()` called with `forceSend = false` (default)
3. Message sent to Edge Function with:
   - `check_only: true`
   - `force_send: false`
4. Edge Function runs AI moderation check
5. If flagged, returns:
   ```json
   {
     "status": "requires_confirmation",
     "flagged": true,
     "warning": "Din besked indeholder muligt upassende indhold.",
     "suggested": "Alternative phrasing...",
     "original_message": "User's message"
   }
   ```

### Step 2: User Confirmation
6. Frontend shows confirmation modal with:
   - Warning message from AI
   - Original message text
   - Suggested alternative (if available)
   - Info box explaining flagging behavior
   - "Annuller" and "Send alligevel" buttons

7. User chooses:
   - **Cancel**: Modal closes, message stays in input for editing
   - **Confirm**: Message sent again with `force_send: true`

### Step 3: Force Send
8. If user confirms, `handleConfirmFlaggedMessage()` calls `handleSend(true)`
9. Message sent to Edge Function with:
   - `check_only: false`
   - `force_send: true`
10. Edge Function **skips** the confirmation check
11. Message is inserted into database with `flagged: true`
12. Message appears in chat with flag icon

## Key Implementation Details

### Edge Function (`create_message/index.ts`)
```typescript
// Extract parameters
const { check_only = false, force_send = false } = await req.json();

// ... run AI moderation ...

// Early return for confirmation flow
if (check_only && !force_send && flagged) {
  return new Response(
    JSON.stringify({
      status: "requires_confirmation",
      flagged: true,
      warning: "...",
      suggested: suggestedText !== "BLOCK" ? suggestedText : undefined,
      original_message: body
    }),
    { headers: { "Content-Type": "application/json" } }
  );
}

// Continue with actual insert...
```

### Hook (`useSendMessage.ts`)
```typescript
export const useSendMessage = () => {
  const sendMessage = async (
    roomId: string,
    body?: string,
    imageUrl?: string,
    replyTo?: string,
    onOptimisticMessageCreated?: (message: Message) => void,
    onOptimisticMessageUpdate?: (tempId: string, realId: string) => void,
    forceSend = false  // New parameter
  ) => {
    // First call with check_only
    const response = await fetch('/api/messages', {
      body: JSON.stringify({
        room_id: roomId,
        body,
        image_url: imageUrl,
        reply_to: replyTo,
        check_only: !forceSend,  // Check first time, skip check when forcing
        force_send: forceSend     // Force send on second attempt
      })
    });

    // Early return if confirmation needed
    if (result.status === 'requires_confirmation') {
      setSending(false);
      return result;
    }

    // Only add optimistic message after confirmation (or if not flagged)
    if (onOptimisticMessageCreated) {
      onOptimisticMessageCreated(optimisticMessage);
    }
  };
};
```

### Component (`ChatRoom.tsx`)
```typescript
// State for confirmation flow
const [showFlagConfirmation, setShowFlagConfirmation] = useState<{
  warning: string;
  suggested?: string;
  originalMessage: string;
} | null>(null);

const [pendingMessage, setPendingMessage] = useState<{
  text?: string;
  imageUrl?: string;
} | null>(null);

// Modified send handler
const handleSend = async (forceSend = false) => {
  // ... upload image ...

  const result = await sendMessage(
    roomId,
    messageText.trim() || undefined,
    imageUrl || undefined,
    undefined,
    (message) => { /* optimistic update */ },
    updateOptimisticMessage,
    forceSend  // Pass force_send flag
  );

  // Show confirmation modal if required
  if (result.status === 'requires_confirmation') {
    setShowFlagConfirmation({
      warning: result.warning || 'Din besked indeholder muligt upassende indhold.',
      suggested: result.suggested,
      originalMessage: result.original_message || messageText.trim()
    });
    setPendingMessage({
      text: messageText.trim() || undefined,
      imageUrl: imageUrl || undefined
    });
    return;
  }
};

// Confirmation handler
const handleConfirmFlaggedMessage = async () => {
  if (!pendingMessage) return;
  setShowFlagConfirmation(null);
  await handleSend(true);  // Force send
  setPendingMessage(null);
};

// Cancel handler
const handleCancelFlaggedMessage = () => {
  setShowFlagConfirmation(null);
  setPendingMessage(null);
  // Message text stays in input for editing
};
```

## User Experience

### Normal Message
1. User types: "Hej alle sammen!"
2. User clicks "Send"
3. Message appears immediately (no moderation flag)

### Flagged Message - User Confirms
1. User types: "Du er en idiot"
2. User clicks "Send"
3. Modal appears:
   - ⚠️ Warning: "Din besked indeholder stødende sprog."
   - Original: "Du er en idiot"
   - Suggested: "Jeg er uenig med dig"
   - Info: "Hvis du sender beskeden, vil den blive markeret til gennemgang..."
4. User clicks "Send alligevel"
5. Message appears with 🚩 flag icon
6. Teachers see flag indicator

### Flagged Message - User Cancels
1. User types: "Du er en idiot"
2. User clicks "Send"
3. Modal appears with warning
4. User clicks "Annuller"
5. Modal closes
6. Message text still in input field
7. User can edit: "Jeg er uenig med dig"
8. User clicks "Send"
9. Message sent normally (no flag)

## Benefits

1. **User Control**: Users decide whether to send flagged content
2. **Education**: Users see why content is flagged
3. **Suggestions**: AI offers better phrasing
4. **Transparency**: Clear explanation of what happens when flagged
5. **Non-Blocking**: Messages are never blocked, only flagged
6. **Edit Opportunity**: Users can improve their message before sending

## Testing Checklist

- [ ] Send normal message → no modal, message appears immediately
- [ ] Send profanity → modal appears with warning
- [ ] Click "Annuller" → modal closes, text stays in input
- [ ] Edit and resend → message sends normally
- [ ] Send profanity and click "Send alligevel" → message sent with flag
- [ ] Check flag icon appears for sender
- [ ] Check teachers can see flagged messages
- [ ] Test with image + flagged text
- [ ] Test suggested alternative displays correctly
- [ ] Test with message that has no suggestion (only warning)

## Related Files

- `/supabase/functions/create_message/index.ts` - Edge Function with check/force logic
- `/apps/web/src/hooks/useSendMessage.ts` - Hook with two-step flow
- `/apps/web/src/components/ChatRoom.tsx` - UI with confirmation modal
- `/apps/web/src/components/Message.tsx` - Flag indicator (left side)
- `/packages/types/src/index.ts` - SendMessageResult types

## Next Steps (Optional Enhancements)

1. Add animation to modal appearance
2. Show typing indicator while checking content
3. Add "Learn more" link about content policies
4. Track user acceptance rate of suggestions
5. Add option to report false positives
6. Localize all text strings
7. Add keyboard shortcuts (ESC to cancel, Enter to confirm)
