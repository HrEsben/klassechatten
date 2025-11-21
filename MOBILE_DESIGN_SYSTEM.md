# Mobile App Design System & Refactoring Guide

## 🎯 Overview

This document describes the mobile app's Berlin Edgy design system implementation and provides guidelines for maintaining consistency across all components.

**Status**: ✅ Foundation Complete - Shared components created, LoginForm refactored  
**Date**: November 21, 2025

---

## 📐 Design System Principles

### Berlin Edgy Aesthetic

The mobile app follows the same Berlin Edgy aesthetic as the web app:

1. **No Rounded Corners** - All UI elements use sharp corners (borderRadius: 0)
   - Exception: Bottom sheets can have 12px top corners for native feel
2. **Strong Borders** - All borders use 2px width
3. **Bold Typography** - Font weights: 900 (black), 700 (bold), 500 (medium only)
4. **Uppercase Text** - Titles, labels, and buttons use uppercase
5. **Consistent Spacing** - 4/8/12/16/24/32/48px scale
6. **Sharp Icons** - Square linecaps and miter linejoins
7. **High Contrast** - Strong foreground/background contrast
8. **Danish Language** - All user-facing text in Danish

---

## 🎨 Color Palette (Funkyfred Theme)

Defined in `/apps/mobile/constants/theme.ts`:

### Brand Colors
```typescript
primary: '#ff3fa4'        // Pink - CTAs, accents, active states
secondary: '#ffb347'      // Orange - Highlights, secondary actions
accent: '#7fdb8f'         // Green - Success states, positive feedback
info: '#6b9bd1'           // Blue - Informational messages
warning: '#ffd966'        // Yellow - Warning states
error: '#e86b6b'          // Red - Error states, destructive actions
neutral: '#6247f5'        // Purple - Neutral elements
```

### Background Colors
```typescript
base100: '#f8f8f8'        // Main backgrounds
base200: '#e5e5e5'        // Elevated surfaces
base300: '#d8d8d8'        // Page backgrounds
baseContent: '#1a1a1a'    // Text/foreground
```

### Opacity Helpers
```typescript
opacity: {
  10: 'rgba(26, 26, 26, 0.1)',   // Subtle borders
  20: 'rgba(26, 26, 26, 0.2)',   // Light backgrounds
  30: 'rgba(26, 26, 26, 0.3)',   // Inactive accents
  40: 'rgba(26, 26, 26, 0.4)',   // Muted text
  50: 'rgba(26, 26, 26, 0.5)',   // Secondary text
  60: 'rgba(26, 26, 26, 0.6)',   // Tertiary text
}
```

---

## 📦 Shared Components Library

Location: `/apps/mobile/components/shared/`

### 1. LoadingSpinner

**Purpose**: Consistent loading states across the app

**Props**:
- `size`: 'xs' | 'sm' | 'md' | 'lg' | 'xl' (default: 'md')
- `text`: Optional loading text
- `fullScreen`: Boolean - fills entire screen (default: false)

**Usage**:
```tsx
import { LoadingSpinner } from '../components/shared';

// Simple spinner
<LoadingSpinner />

// With text
<LoadingSpinner size="lg" text="Indlæser beskeder..." />

// Full screen
<LoadingSpinner size="xl" text="Vent venligst..." fullScreen />
```

**Design Notes**:
- Uses pink primary color (#ff3fa4)
- Text uses opacity[60] for secondary appearance
- Spacing scales with size

---

### 2. EmptyState

**Purpose**: Consistent empty states with icons and actions

**Props**:
- `title`: Main heading (required)
- `description`: Optional subtitle text
- `actionLabel`: Button text (optional)
- `onAction`: Button callback (optional)
- `icon`: 'inbox' | 'users' | 'message' | 'alert' | 'search' (default: 'inbox')

**Usage**:
```tsx
import { EmptyState } from '../components/shared';

<EmptyState
  icon="users"
  title="INGEN BRUGERE ENDNU"
  description="Der er ingen medlemmer i dette chatrum"
  actionLabel="INVITER BRUGERE"
  onAction={() => console.log('Invite clicked')}
/>
```

**Design Notes**:
- Title: XL size, black weight, uppercase
- Description: SM size, uppercase, wider letter-spacing
- Icon: 64x64px with opacity[40] color
- Button: 48px height, primary color
- All text uppercase for Berlin Edgy feel

---

### 3. ErrorState

**Purpose**: Consistent error displays with retry capability

**Props**:
- `title`: Error heading (default: 'FEJL')
- `message`: Error message (required)
- `onRetry`: Retry callback (optional)
- `retryLabel`: Retry button text (default: 'Prøv igen')

**Usage**:
```tsx
import { ErrorState } from '../components/shared';

<ErrorState
  message="Kunne ikke indlæse beskeder"
  onRetry={() => refetch()}
/>

// Custom title
<ErrorState
  title="NETVÆRKSFEJL"
  message="Ingen internetforbindelse"
  onRetry={() => retry()}
  retryLabel="PRØV IGEN"
/>
```

**Design Notes**:
- Title: XL size, black weight, uppercase, error color
- Message: MD size, medium weight, opacity[60]
- Icon: Red circle with alert symbol (64x64px)
- Button: Error color background, white text

---

### 4. Button

**Purpose**: Consistent buttons matching Berlin Edgy design

**Props**:
- `label`: Button text (required)
- `onPress`: Click handler (required)
- `variant`: 'primary' | 'secondary' | 'ghost' | 'outline' | 'error' (default: 'primary')
- `size`: 'xs' | 'sm' | 'md' | 'lg' (default: 'md')
- `disabled`: Boolean (default: false)
- `loading`: Boolean - shows spinner (default: false)
- `fullWidth`: Boolean - 100% width (default: false)

**Variants**:
```typescript
primary     // baseContent background, white text
secondary   // primary color background, white text
ghost       // transparent background, baseContent text
outline     // transparent bg, baseContent border/text
error       // error color background, white text
```

**Usage**:
```tsx
import { Button } from '../components/shared';

// Primary button
<Button
  label="GEM ÆNDRINGER"
  onPress={handleSave}
  variant="primary"
  size="lg"
  fullWidth
/>

// Ghost button
<Button
  label="ANNULLER"
  onPress={handleCancel}
  variant="ghost"
/>

// Loading state
<Button
  label="SENDER..."
  onPress={handleSubmit}
  loading={isLoading}
  disabled={isLoading}
/>
```

**Design Notes**:
- All text uppercase
- Bold font weight (700)
- Border width: 2px
- Border radius: 0 (sharp corners)
- Sizes: xs=24px, sm=32px, md=48px, lg=56px height
- 50% opacity when disabled/loading
- ActivityIndicator shown during loading

---

### 5. Input

**Purpose**: Consistent form inputs with labels and validation

**Props**:
- `label`: Field label (optional)
- `error`: Error message (optional)
- `helperText`: Helper text (optional)
- `variant`: 'default' | 'error' | 'success' (default: 'default')
- `containerStyle`: Additional container styles
- ...all TextInput props (placeholder, value, onChangeText, etc.)

**Usage**:
```tsx
import { Input } from '../components/shared';

// Basic input
<Input
  label="Email"
  value={email}
  onChangeText={setEmail}
  placeholder="din@email.dk"
  keyboardType="email-address"
  autoCapitalize="none"
/>

// With error
<Input
  label="Password"
  value={password}
  onChangeText={setPassword}
  error="Password skal være mindst 6 tegn"
  variant="error"
  secureTextEntry
/>

// With helper text
<Input
  label="Navn"
  value={name}
  onChangeText={setName}
  helperText="Dit fulde navn som det vises til andre"
/>
```

**Design Notes**:
- Label: SM size, bold, uppercase, widest letter-spacing
- Input: 48px height, MD font, border-2
- Border radius: 0 (sharp corners)
- Error border: Red color
- Success border: Accent green
- Error text: Red, SM size
- Helper text: Opacity[50], SM size

---

## 🎯 Typography System

From `/apps/mobile/constants/theme.ts`:

### Font Weights
```typescript
black: '900'   // Headings, strong emphasis
bold: '700'    // Labels, button text
medium: '500'  // Body text
```

### Font Sizes
```typescript
xs: 10    // Small badges
sm: 12    // Labels, secondary text
md: 14    // Body text, buttons
lg: 16    // Larger body text
xl: 20    // Section titles, card titles (H2, H3)
xxl: 28   // Page titles (H1)
```

### Letter Spacing
```typescript
tight: -0.5   // Large headings
wider: 1      // Descriptions
widest: 2     // Small caps labels
```

### Usage Patterns

**Page Title (H1)**:
```tsx
<Text style={{
  fontSize: typography.sizes.xxl,
  fontWeight: typography.weights.black,
  textTransform: 'uppercase',
  letterSpacing: typography.letterSpacing.tight,
  color: colors.baseContent,
}}>
  KLASSECHATTEN
</Text>
```

**Section Title (H2)**:
```tsx
<Text style={{
  fontSize: typography.sizes.xl,
  fontWeight: typography.weights.black,
  textTransform: 'uppercase',
  letterSpacing: typography.letterSpacing.tight,
  color: colors.baseContent,
}}>
  MINE KLASSER
</Text>
```

**Label Text**:
```tsx
<Text style={{
  fontSize: typography.sizes.sm,
  fontWeight: typography.weights.bold,
  textTransform: 'uppercase',
  letterSpacing: typography.letterSpacing.widest,
  color: colors.opacity[50],
}}>
  BRUGERNAVN
</Text>
```

**Body Text**:
```tsx
<Text style={{
  fontSize: typography.sizes.md,
  fontWeight: typography.weights.medium,
  color: colors.baseContent,
}}>
  Dette er brødtekst
</Text>
```

---

## 📏 Spacing System

From `/apps/mobile/constants/theme.ts`:

```typescript
xs: 4     // Tight spacing (title/subtitle)
sm: 8     // Small gaps, accent bars
md: 12    // Medium spacing, icon gaps
lg: 16    // Standard spacing, form elements
xl: 24    // Large gaps, sections
xxl: 32   // Extra large spacing
xxxl: 48  // Major sections
```

### Usage Guidelines

- **Between title and content**: `spacing.xl` (24px)
- **Between form fields**: `spacing.lg` (16px)
- **Between sections**: `spacing.xxxl` (48px)
- **Icon to text**: `spacing.md` (12px)
- **Button padding horizontal**: `spacing.lg` (16px)
- **Card padding**: `spacing.xl` (24px)
- **Screen padding**: `spacing.xl` (24px) or `spacing.xxxl` (48px)

---

## 🔲 Border System

From `/apps/mobile/constants/theme.ts`:

```typescript
borders: {
  width: {
    standard: 2,      // All borders
    accentBar: 4,     // Vertical accent bars
    accentBarWide: 8, // Wider accent bars
  },
  radius: {
    none: 0,          // Standard (sharp corners)
    bottomSheet: 12,  // ONLY for bottom sheet top corners
  },
}
```

### Rules

1. **Always use 2px borders** - `borderWidth: borders.width.standard`
2. **Never round corners** - `borderRadius: borders.radius.none` (always 0)
3. **Exception**: Bottom sheets can have `borderTopLeftRadius: 12` and `borderTopRightRadius: 12` for native feel
4. **Border colors**:
   - Default: `borders.color.default` (opacity[10])
   - Hover: `borders.color.hover` (primaryOpacity[50])
   - Active: `borders.color.active` (primary)

---

## 🎭 Component Examples

### LoginForm (Refactored)

**Before** (207 lines with inline styles):
```tsx
<View style={styles.inputContainer}>
  <Text style={styles.label}>Email</Text>
  <TextInput
    style={styles.input}
    value={email}
    onChangeText={setEmail}
    placeholder="din@email.dk"
  />
</View>

<TouchableOpacity style={styles.button} onPress={handleSubmit}>
  <Text style={styles.buttonText}>Log ind</Text>
</TouchableOpacity>
```

**After** (134 lines with shared components):
```tsx
<Input
  label="Email"
  value={email}
  onChangeText={setEmail}
  placeholder="din@email.dk"
  keyboardType="email-address"
  autoCapitalize="none"
/>

<Button
  label="LOG IND"
  onPress={handleSubmit}
  variant="primary"
  size="lg"
  fullWidth
/>
```

**Improvements**:
- **35% fewer lines** (207 → 134 lines)
- **Consistent styling** via shared components
- **Better maintainability** - update once, apply everywhere
- **Berlin Edgy compliance** enforced by components

---

## 🚀 Migration Guide

### Replacing Loading States

**Before**:
```tsx
if (loading) {
  return (
    <View style={styles.centerContainer}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.loadingText}>Indlæser...</Text>
    </View>
  );
}
```

**After**:
```tsx
if (loading) {
  return <LoadingSpinner size="lg" text="Indlæser..." fullScreen />;
}
```

---

### Replacing Empty States

**Before**:
```tsx
if (items.length === 0) {
  return (
    <View style={styles.centerContainer}>
      <Text style={styles.emptyTitle}>Ingen data</Text>
      <Text style={styles.emptySubtitle}>Beskrivelse</Text>
    </View>
  );
}
```

**After**:
```tsx
if (items.length === 0) {
  return (
    <EmptyState
      icon="inbox"
      title="INGEN DATA"
      description="Beskrivelse af hvorfor der ikke er data"
      actionLabel="TILFØJ DATA"
      onAction={() => handleAdd()}
    />
  );
}
```

---

### Replacing Error States

**Before**:
```tsx
if (error) {
  return (
    <View style={styles.centerContainer}>
      <Text style={styles.errorText}>Fejl: {error}</Text>
    </View>
  );
}
```

**After**:
```tsx
if (error) {
  return (
    <ErrorState
      message={error}
      onRetry={() => refetch()}
    />
  );
}
```

---

### Replacing Buttons

**Before**:
```tsx
<TouchableOpacity
  style={[styles.button, loading && styles.buttonDisabled]}
  onPress={handleSave}
  disabled={loading}
>
  <Text style={styles.buttonText}>
    {loading ? 'Gemmer...' : 'Gem'}
  </Text>
</TouchableOpacity>
```

**After**:
```tsx
<Button
  label={loading ? 'GEMMER...' : 'GEM'}
  onPress={handleSave}
  loading={loading}
  disabled={loading}
  variant="primary"
  fullWidth
/>
```

---

### Replacing Inputs

**Before**:
```tsx
<View style={styles.inputContainer}>
  <Text style={styles.label}>Email</Text>
  <TextInput
    style={[styles.input, error && styles.inputError]}
    value={email}
    onChangeText={setEmail}
    placeholder="din@email.dk"
  />
  {error && <Text style={styles.errorText}>{error}</Text>}
</View>
```

**After**:
```tsx
<Input
  label="Email"
  value={email}
  onChangeText={setEmail}
  placeholder="din@email.dk"
  error={error}
  variant={error ? 'error' : 'default'}
/>
```

---

## ✅ Refactoring Checklist

When refactoring a component:

### 1. Import Shared Components
```tsx
import { Button, Input, LoadingSpinner, EmptyState, ErrorState } from '../components/shared';
```

### 2. Replace Loading States
- [ ] Find all `<ActivityIndicator>` usages
- [ ] Replace with `<LoadingSpinner>`
- [ ] Use `fullScreen` prop if needed
- [ ] Add descriptive `text` prop

### 3. Replace Empty States
- [ ] Find all empty list conditions
- [ ] Replace with `<EmptyState>`
- [ ] Choose appropriate icon
- [ ] Add action button if applicable

### 4. Replace Error States
- [ ] Find all error displays
- [ ] Replace with `<ErrorState>`
- [ ] Add `onRetry` if refetch available
- [ ] Use descriptive error messages

### 5. Replace Buttons
- [ ] Find all `<TouchableOpacity>` button patterns
- [ ] Replace with `<Button>` component
- [ ] Uppercase all button text
- [ ] Choose appropriate variant
- [ ] Add `fullWidth` if needed

### 6. Replace Inputs
- [ ] Find all `<TextInput>` with labels
- [ ] Replace with `<Input>` component
- [ ] Move error/helper text to props
- [ ] Uppercase all label text

### 7. Update Typography
- [ ] Ensure titles use `textTransform: 'uppercase'`
- [ ] Use theme font weights (black/bold/medium)
- [ ] Use theme font sizes
- [ ] Add appropriate letter-spacing

### 8. Update Spacing
- [ ] Replace magic numbers with `spacing` constants
- [ ] Use spacing scale (xs/sm/md/lg/xl/xxl/xxxl)

### 9. Update Borders
- [ ] Set all `borderWidth` to `borders.width.standard` (2px)
- [ ] Set all `borderRadius` to `borders.radius.none` (0)
- [ ] Use `borders.color.*` for border colors

### 10. Test
- [ ] Component renders correctly
- [ ] Buttons work as expected
- [ ] Inputs accept text properly
- [ ] Loading states show/hide correctly
- [ ] Empty/error states display properly
- [ ] Design matches Berlin Edgy aesthetic

---

## 📊 Progress Tracker

### ✅ Completed
- [x] Shared components library created (5 components)
- [x] Theme constants documented
- [x] LoginForm refactored (207 → 134 lines, -35%)
- [x] Design system documented

### 🚧 In Progress
- [ ] ClassRoomBrowser refactoring
- [ ] ChatRoom component breakdown (1196 lines → smaller components)

### 📋 Remaining
- [ ] Avatar component refactor
- [ ] MessageItem component refactor
- [ ] UsersList component refactor
- [ ] ReactionPicker component refactor
- [ ] ConnectionStatus component refactor
- [ ] ProtectedRoute component refactor

---

## 📚 Additional Resources

- **Web App Design**: See `.github/copilot-instructions.md` for web app Berlin Edgy guidelines
- **Theme Constants**: `/apps/mobile/constants/theme.ts`
- **Shared Components**: `/apps/mobile/components/shared/`
- **Refactored Example**: `/apps/mobile/components/LoginForm.tsx`

---

## 🎯 Next Steps

1. ✅ **Refactor ClassRoomBrowser**: Replace loading/empty/error states with shared components
2. 🔄 **Break down ChatRoom**: Create MessageList, MessageInput, ChatHeader sub-components (IN PROGRESS)
3. **Test on device**: Verify design looks correct on iOS/Android
4. **Create example screens**: Build showcase of all shared components
5. **Performance testing**: Measure render times, optimize if needed

---

## 🔧 ChatRoom Refactoring Plan (Task 2)

### Current State
- **File**: `/apps/mobile/components/ChatRoom.tsx`
- **Size**: 1196 lines
- **Complexity**: High - handles messages, typing, presence, reactions, images, drafts, scrolling
- **Issues**: Monolithic component, difficult to test, hard to maintain

### Refactoring Strategy

#### Phase 1: Use Shared Components ✅
Replace inline loading/error states with shared components:
- ✅ Loading state → `<LoadingSpinner size="lg" text="Indlæser beskeder..." fullScreen />`
- ✅ Error state → `<ErrorState message={error} />`

#### Phase 2: Extract Sub-Components 🔄
Break down ChatRoom into focused components:

**1. ChatHeader Component** (NEW)
- **Responsibility**: Display room name, online count, users button, connection status
- **Props**: roomName, onlineCount, onUsersPress, isConnected
- **Size**: ~80 lines
- **Benefits**: Isolated header logic, reusable pattern

**2. MessageInput Component** (NEW)
- **Responsibility**: Text input, image picker, send button, draft management
- **Props**: roomId, onSend, onImagePick, sending, uploading
- **State**: messageText, selectedImageUri, showSuggestion
- **Size**: ~200 lines
- **Benefits**: Isolated input logic, easier testing

**3. TypingIndicator Component** (NEW)
- **Responsibility**: Show who's typing
- **Props**: typingUsers[]
- **Size**: ~30 lines
- **Benefits**: Simple, reusable

**4. JumpToBottomButton Component** (NEW)
- **Responsibility**: Floating button to scroll to latest messages
- **Props**: visible, unreadCount, onPress
- **Size**: ~50 lines
- **Benefits**: Isolated scroll logic

**5. ImageViewer Component** (NEW)
- **Responsibility**: Full-screen image modal
- **Props**: imageUri, visible, onClose
- **Size**: ~60 lines
- **Benefits**: Reusable across app

**6. MessageList Component** (Refactored)
- **Responsibility**: FlatList of messages with infinite scroll
- **Props**: messages, loading, hasMore, onLoadMore, onScroll, currentUserId
- **Size**: ~150 lines
- **Benefits**: Isolated list logic

#### Phase 3: Simplify Main Component
After extraction, ChatRoom.tsx becomes:
- Container for all sub-components
- Data fetching (hooks)
- Coordination logic
- **Target size**: ~300-400 lines (70% reduction)

### Implementation Plan

```typescript
// NEW: /apps/mobile/components/chat/ChatHeader.tsx
interface ChatHeaderProps {
  roomName: string;
  onlineCount: number;
  totalUsers: number;
  isConnected: boolean;
  onUsersPress: () => void;
}

// NEW: /apps/mobile/components/chat/MessageInput.tsx
interface MessageInputProps {
  roomId: string;
  onSend: (text: string, imageUri?: string) => Promise<void>;
  sending: boolean;
  uploading: boolean;
  onImagePick: () => void;
}

// NEW: /apps/mobile/components/chat/TypingIndicator.tsx
interface TypingIndicatorProps {
  typingUsers: Array<{ display_name: string }>;
}

// NEW: /apps/mobile/components/chat/JumpToBottomButton.tsx
interface JumpToBottomButtonProps {
  visible: boolean;
  unreadCount: number;
  onPress: () => void;
}

// NEW: /apps/mobile/components/chat/ImageViewer.tsx
interface ImageViewerProps {
  imageUri: string | null;
  visible: boolean;
  onClose: () => void;
}

// REFACTORED: /apps/mobile/components/ChatRoom.tsx
export default function ChatRoom({ roomId, showHeader }: ChatRoomProps) {
  // Hooks for data
  const { messages, loading, error, ... } = useRoomMessages({ roomId });
  const { sendMessage, ... } = useSendMessage();
  
  // Render sub-components
  return (
    <View>
      {loading && <LoadingSpinner ... />}
      {error && <ErrorState message={error} />}
      {showHeader && <ChatHeader ... />}
      <MessageList messages={messages} ... />
      <TypingIndicator typingUsers={typingUsers} />
      <MessageInput roomId={roomId} onSend={handleSend} ... />
      <JumpToBottomButton ... />
      <ImageViewer ... />
    </View>
  );
}
```

### Benefits of Refactoring

1. **Maintainability**: Each component has single responsibility
2. **Testability**: Smaller components easier to unit test
3. **Reusability**: Components can be used in other contexts
4. **Performance**: Memoization easier with smaller components
5. **Readability**: Clear separation of concerns
6. **Developer Experience**: Easier onboarding, faster debugging

### File Structure After Refactoring

```
/apps/mobile/components/
  /chat/
    ChatHeader.tsx          (~80 lines)
    MessageInput.tsx        (~200 lines)
    MessageList.tsx         (~150 lines)
    TypingIndicator.tsx     (~30 lines)
    JumpToBottomButton.tsx  (~50 lines)
    ImageViewer.tsx         (~60 lines)
    index.ts                (exports)
  ChatRoom.tsx              (~350 lines, down from 1196)
  MessageItem.tsx           (existing, no changes)
  Avatar.tsx                (existing, no changes)
  ReactionPickerWithHook.tsx (existing, no changes)
```

### Timeline Estimate

- **Phase 1**: 30 minutes (use shared components) ✅
- **Phase 2**: 2-3 hours (extract sub-components)
- **Phase 3**: 1 hour (refactor main component, testing)
- **Total**: 3.5-4.5 hours

### Testing Strategy

1. **Unit tests**: Each sub-component tested independently
2. **Integration tests**: ChatRoom with all sub-components
3. **Manual testing**: iOS/Android devices, verify all functionality
4. **Regression testing**: Ensure no broken features

---

**Last Updated**: November 21, 2025  
**Maintainer**: Development Team  
**Status**: Task 2 Phase 1 complete (shared components), Phase 2 in progress
