# Reaction Button Position Fix

## Issue
The "Tilføj reaktion +" button was appearing above the avatar instead of attached to the message bubble, and clicking it did nothing.

## Root Cause
1. **Positioning**: The `ReactionsDisplay` component was wrapped in an extra `<div>` with flex layout and padding that separated it from the message bubble in the DaisyUI chat component structure.

2. **Missing Picker**: The `ReactionPicker` component was accidentally removed during editing, so clicking the "+" button did nothing.

## Solution

### Web (`apps/web/src/components/Message.tsx`)

**Before:**
```tsx
{/* Reactions */}
{messageId && !isOptimistic && (
  <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} px-4`}>
    <ReactionsDisplay
      reactions={reactionGroups}
      onToggle={toggleReaction}
      onAddClick={handleAddReactionClick}
    />
  </div>
)}

{/* ReactionPicker was missing here! */}

<div className="chat-footer opacity-90">
```

**After:**
```tsx
{/* Reactions - positioned right after the bubble */}
{messageId && !isOptimistic && (
  <ReactionsDisplay
    reactions={reactionGroups}
    onToggle={toggleReaction}
    onAddClick={handleAddReactionClick}
  />
)}

{/* Reaction Picker */}
{showReactionPicker && pickerPosition && (
  <ReactionPicker
    onSelect={handleReactionSelect}
    onClose={() => setShowReactionPicker(false)}
    position={pickerPosition}
  />
)}

<div className="chat-footer opacity-90">
```

### Changes Made
1. ✅ Removed wrapper `<div>` around `ReactionsDisplay` - now renders directly as a sibling to `chat-bubble`
2. ✅ Added back the `ReactionPicker` component that was accidentally removed
3. ✅ Reactions now properly attach to the message bubble in DaisyUI's chat component layout

### Mobile Version
The mobile version (`apps/mobile/components/MessageItem.tsx`) already had the correct structure:
- `ReactionsDisplay` renders directly inside the message content
- `ReactionPickerWithHook` is managed at the ChatRoom level (better for modals in React Native)

## DaisyUI Chat Component Structure
```html
<div class="chat chat-start|chat-end">
  <div class="chat-image avatar">...</div>
  <div class="chat-header">...</div>
  <div class="chat-bubble">Message content</div>
  <!-- ReactionsDisplay should go here as a direct sibling -->
  <ReactionsDisplay />
  <div class="chat-footer">...</div>
</div>
```

## Testing
1. Open chat with existing messages
2. Click the "+" button on a message
3. Emoji picker modal should appear
4. Select an emoji
5. Reaction should appear below the message bubble (not above avatar)
6. Click the reaction again to remove it
7. Verify realtime sync across browser tabs

## Files Changed
- `/apps/web/src/components/Message.tsx` - Fixed ReactionsDisplay positioning and re-added ReactionPicker
