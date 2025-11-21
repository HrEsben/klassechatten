# Mobile Component Examples

This file demonstrates proper usage of all shared and chat components with Berlin Edgy design compliance.

---

## 🎨 Shared Components

### LoadingSpinner

**Basic Usage:**
```tsx
import { LoadingSpinner } from './components/shared';

// Simple spinner
<LoadingSpinner />

// With text
<LoadingSpinner text="Indlæser beskeder..." />

// Different sizes
<LoadingSpinner size="xs" />
<LoadingSpinner size="sm" />
<LoadingSpinner size="md" /> // default
<LoadingSpinner size="lg" />
<LoadingSpinner size="xl" />

// Full screen centered
<LoadingSpinner size="lg" text="Indlæser..." fullScreen />
```

**Real Example (ClassRoomBrowser):**
```tsx
if (loading) {
  return <LoadingSpinner size="lg" text="Indlæser klasser..." fullScreen />;
}
```

---

### EmptyState

**Basic Usage:**
```tsx
import { EmptyState } from './components/shared';

// Simple empty state
<EmptyState 
  icon="inbox" 
  title="INGEN BESKEDER" 
  description="Der er ingen beskeder at vise endnu"
/>

// Available icons
<EmptyState icon="inbox" title="TOMT" />
<EmptyState icon="users" title="INGEN BRUGERE" />
<EmptyState icon="message" title="INGEN BESKEDER" />
<EmptyState icon="alert" title="INGEN DATA" />
<EmptyState icon="search" title="INGEN RESULTATER" />

// With action button
<EmptyState
  icon="users"
  title="INGEN KLASSER ENDNU"
  description="Du er ikke medlem af nogen klasser"
  actionLabel="OPRET KLASSE"
  onAction={() => navigation.navigate('CreateClass')}
/>
```

**Real Example (ClassRoomBrowser):**
```tsx
if (classes.length === 0) {
  return (
    <EmptyState
      icon="inbox"
      title="INGEN KLASSER ENDNU"
      description="Du er ikke medlem af nogen klasser. Kontakt din lærer for at blive tilføjet."
    />
  );
}
```

---

### ErrorState

**Basic Usage:**
```tsx
import { ErrorState } from './components/shared';

// Simple error
<ErrorState message="Der opstod en fejl" />

// With retry button
<ErrorState 
  message="Kunne ikke indlæse data" 
  onRetry={() => refetch()}
/>
```

**Real Example (ChatRoom):**
```tsx
if (error) {
  return (
    <ErrorState 
      message={error} 
      onRetry={() => {
        setError(null);
        fetchMessages();
      }}
    />
  );
}
```

---

### Button

**Basic Usage:**
```tsx
import { Button } from './components/shared';

// Primary button (default)
<Button label="GEM" onPress={handleSave} />

// Variants
<Button label="PRIMÆR" variant="primary" onPress={handlePrimary} />
<Button label="SEKUNDÆR" variant="secondary" onPress={handleSecondary} />
<Button label="GHOST" variant="ghost" onPress={handleGhost} />
<Button label="OUTLINE" variant="outline" onPress={handleOutline} />
<Button label="SLET" variant="error" onPress={handleDelete} />

// Sizes
<Button label="EKSTRA LILLE" size="xs" onPress={handlePress} />
<Button label="LILLE" size="sm" onPress={handlePress} />
<Button label="MELLEM" size="md" onPress={handlePress} /> // default
<Button label="STOR" size="lg" onPress={handlePress} />

// States
<Button label="LOADING" loading onPress={handlePress} />
<Button label="DISABLED" disabled onPress={handlePress} />

// Full width
<Button label="FULD BREDDE" fullWidth onPress={handlePress} />
```

**Real Example (LoginForm):**
```tsx
<Button
  label={isLoginMode ? 'LOG IND' : 'OPRET KONTO'}
  onPress={handleSubmit}
  variant="primary"
  size="lg"
  loading={loading}
  fullWidth
/>

<Button
  label={isLoginMode ? 'Har du ikke en konto? Opret en' : 'Har du allerede en konto? Log ind'}
  onPress={() => setIsLoginMode(!isLoginMode)}
  variant="ghost"
  size="md"
/>
```

---

### Input

**Basic Usage:**
```tsx
import { Input } from './components/shared';

// Simple input
<Input
  value={name}
  onChangeText={setName}
  placeholder="Indtast navn"
/>

// With label
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
  placeholder="Mindst 6 tegn"
  secureTextEntry
  error="Password skal være mindst 6 tegn"
/>

// With helper text
<Input
  label="Brugernavn"
  value={username}
  onChangeText={setUsername}
  helper="Skal være unikt"
/>
```

**Real Example (LoginForm):**
```tsx
{!isLoginMode && (
  <Input
    label="Fulde navn"
    value={displayName}
    onChangeText={setDisplayName}
    placeholder="Dit fulde navn"
    autoCapitalize="words"
  />
)}

<Input
  label="Email"
  value={email}
  onChangeText={setEmail}
  placeholder="din@email.dk"
  keyboardType="email-address"
  autoCapitalize="none"
/>

<Input
  label="Password"
  value={password}
  onChangeText={setPassword}
  placeholder="Mindst 6 tegn"
  secureTextEntry
/>
```

---

## 💬 Chat Components

### ChatHeader

**Basic Usage:**
```tsx
import { ChatHeader } from './components/chat';

<ChatHeader
  roomName="Klasse 7A - Almindelig chat"
  onlineCount={5}
  totalUsers={23}
  isConnected={true}
  onUsersPress={() => setUsersListVisible(true)}
/>

// Disconnected state
<ChatHeader
  roomName="Klasse 8B - Gruppechat"
  onlineCount={0}
  totalUsers={18}
  isConnected={false}
  onUsersPress={() => setUsersListVisible(true)}
/>
```

**Real Example (ChatRoom):**
```tsx
{showHeader && (
  <ChatHeader
    roomName={roomName}
    onlineCount={onlineCount}
    totalUsers={allRoomUsers.length}
    isConnected={isConnected}
    onUsersPress={() => setUsersListVisible(true)}
  />
)}
```

**Features:**
- Uppercase room name with bold font
- Green/yellow connection status indicator (8x8px square)
- Users button with SVG icon and badge showing total count
- Online count badge on users button
- Border-bottom 2px for separation
- Sharp corners (border-radius: 0)

---

### TypingIndicator

**Basic Usage:**
```tsx
import { TypingIndicator } from './components/chat';

// No one typing (renders null)
<TypingIndicator typingUsers={[]} />

// One person typing
<TypingIndicator 
  typingUsers={[{ display_name: 'Anders' }]} 
/>
// Output: "Anders skriver..."

// Two people typing
<TypingIndicator 
  typingUsers={[
    { display_name: 'Anders' }, 
    { display_name: 'Maria' }
  ]} 
/>
// Output: "Anders og Maria skriver..."

// Many people typing
<TypingIndicator 
  typingUsers={[
    { display_name: 'Anders' }, 
    { display_name: 'Maria' },
    { display_name: 'Peter' }
  ]} 
/>
// Output: "3 personer skriver..."
```

**Real Example (ChatRoom):**
```tsx
<TypingIndicator typingUsers={typingUsers} />
```

**Features:**
- Smart formatting based on number of typing users
- Italic text style
- 60% opacity for subtle appearance
- Returns null when empty (clean, no extra elements)
- Padding for proper spacing

---

### JumpToBottomButton

**Basic Usage:**
```tsx
import { JumpToBottomButton } from './components/chat';

// Hidden (not visible)
<JumpToBottomButton
  visible={false}
  unreadCount={0}
  onPress={() => scrollToBottom()}
/>

// Visible without unread
<JumpToBottomButton
  visible={true}
  unreadCount={0}
  onPress={() => scrollToBottom()}
/>

// Visible with unread count
<JumpToBottomButton
  visible={true}
  unreadCount={5}
  onPress={() => scrollToBottom()}
/>

// Visible with many unread (shows 99+)
<JumpToBottomButton
  visible={true}
  unreadCount={125}
  onPress={() => scrollToBottom()}
/>
```

**Real Example (ChatRoom):**
```tsx
<JumpToBottomButton
  visible={showJumpToBottom}
  unreadCount={unreadCount}
  onPress={() => {
    flatListRef.current?.scrollToEnd({ animated: true });
    setShowJumpToBottom(false);
    setUnreadCount(0);
  }}
/>
```

**Features:**
- Positioned absolute (bottom: 80, right: 16)
- Primary pink background (#ff3fa4)
- 56x56px circular button with sharp corners (0 radius for Berlin Edgy)
- Arrow icon pointing down
- Error color badge for unread count
- Shows "99+" when count > 99
- Shadow for elevation
- Returns null when not visible

---

### ImageViewer

**Basic Usage:**
```tsx
import { ImageViewer } from './components/chat';

// Closed (not visible)
<ImageViewer
  imageUri={null}
  visible={false}
  onClose={() => {}}
/>

// Open with image
<ImageViewer
  imageUri="https://example.com/image.jpg"
  visible={true}
  onClose={() => setImageViewerVisible(false)}
/>
```

**Real Example (ChatRoom):**
```tsx
const [selectedImage, setSelectedImage] = useState<string | null>(null);

// In message item
<TouchableOpacity onPress={() => setSelectedImage(message.image_url)}>
  <Image source={{ uri: message.image_url }} style={styles.messageImage} />
</TouchableOpacity>

// Image viewer component
<ImageViewer
  imageUri={selectedImage}
  visible={selectedImage !== null}
  onClose={() => setSelectedImage(null)}
/>
```

**Features:**
- Full-screen Modal with fade animation
- Dark overlay (90% opacity black)
- Tap anywhere to close
- Image with "contain" resize mode (maintains aspect ratio)
- Pinch-to-zoom support (native Image behavior)
- Returns null when not visible

---

## 🎨 Berlin Edgy Design Patterns

### Layout Example
```tsx
import { View, Text, ScrollView } from 'react-native';
import { theme } from '../constants/theme';

<View style={{
  flex: 1,
  backgroundColor: theme.colors.background,
}}>
  {/* Header */}
  <View style={{
    padding: theme.spacing.lg,
    borderBottomWidth: theme.borders.width,
    borderBottomColor: theme.colors.border,
    borderRadius: 0, // Sharp corners!
  }}>
    <Text style={{
      fontSize: theme.typography.sizes.xl,
      fontWeight: theme.typography.weights.black,
      textTransform: 'uppercase',
      letterSpacing: theme.typography.letterSpacing.tight,
      color: theme.colors.foreground,
    }}>
      PAGE TITLE
    </Text>
  </View>

  {/* Content */}
  <ScrollView style={{ flex: 1 }}>
    {/* Content here */}
  </ScrollView>
</View>
```

### Card Example
```tsx
<View style={{
  backgroundColor: theme.colors.card,
  borderWidth: theme.borders.width, // 2px
  borderColor: theme.colors.border,
  borderRadius: 0, // Sharp corners!
  padding: theme.spacing.lg,
  marginBottom: theme.spacing.md,
}}>
  <Text style={{
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
    textTransform: 'uppercase',
    color: theme.colors.foreground,
    marginBottom: theme.spacing.xs,
  }}>
    CARD TITLE
  </Text>
  <Text style={{
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.mutedForeground,
  }}>
    Card description text
  </Text>
</View>
```

### Accent Bar Example
```tsx
<View style={{ position: 'relative' }}>
  {/* Accent bar */}
  <View style={{
    position: 'absolute',
    left: 0,
    top: 0,
    width: theme.borders.accentWidth, // 4px
    height: '100%',
    backgroundColor: theme.colors.primary,
  }} />
  
  {/* Content */}
  <View style={{ paddingLeft: theme.spacing.lg }}>
    <Text>Content with accent bar</Text>
  </View>
</View>
```

### Status Indicator Example
```tsx
// Connection status
<View style={{
  width: 8,
  height: 8,
  backgroundColor: isConnected ? theme.colors.accent : theme.colors.warning,
  borderRadius: 0, // Sharp square!
  marginRight: theme.spacing.xs,
}} />

// Online indicator
<View style={{
  width: 12,
  height: 12,
  backgroundColor: theme.colors.accent,
  borderRadius: 0, // Sharp square!
  borderWidth: 2,
  borderColor: theme.colors.background,
  position: 'absolute',
  top: 0,
  right: 0,
}} />
```

---

## 🧪 Testing Scenarios

### Scenario 1: New User Login
```tsx
// 1. Start with LoginForm
<LoginForm />

// 2. User enters credentials and sees loading state
<Button label="LOG IND" loading />

// 3. On success, navigate to ClassRoomBrowser
<ClassRoomBrowser />
```

### Scenario 2: Empty State
```tsx
// User with no classes sees empty state
<EmptyState
  icon="inbox"
  title="INGEN KLASSER ENDNU"
  description="Du er ikke medlem af nogen klasser"
/>
```

### Scenario 3: Chat Flow
```tsx
// 1. Select class and room from ClassRoomBrowser
<ClassRoomBrowser />

// 2. ChatRoom loads
<LoadingSpinner size="lg" text="Indlæser beskeder..." fullScreen />

// 3. Chat displays with header and messages
<ChatHeader ... />
<FlatList ... />
<TypingIndicator typingUsers={[...]} />

// 4. User scrolls up, new message arrives
<JumpToBottomButton visible unreadCount={1} />

// 5. User taps image
<ImageViewer imageUri="..." visible />
```

---

## 📱 Component Inventory

### Shared Components (5)
1. ✅ LoadingSpinner - 75 lines
2. ✅ EmptyState - 170 lines
3. ✅ ErrorState - 80 lines
4. ✅ Button - 115 lines
5. ✅ Input - 65 lines

### Chat Sub-Components (4)
1. ✅ ChatHeader - 129 lines
2. ✅ TypingIndicator - 45 lines
3. ✅ JumpToBottomButton - 69 lines
4. ✅ ImageViewer - 52 lines

### Refactored Components (3)
1. ✅ LoginForm - 134 lines (was 207)
2. ✅ ClassRoomBrowser - ~256 lines (removed ~60 lines duplicate)
3. ✅ ChatRoom - 1130 lines (was 1196)

**Total Reusable Code**: ~800 lines  
**Total Code Removed**: ~200 lines

---

## 🎯 Next Steps

1. **Run manual tests** following MOBILE_TESTING_GUIDE.md
2. **Verify Berlin Edgy compliance** on all screens
3. **Test on real devices** (iOS + Android)
4. **Document any issues** found during testing
5. **Create GitHub issues** for bugs/improvements
6. **Consider unit tests** for critical components
7. **Performance profiling** if needed

**Status**: ✅ EXAMPLES COMPLETE - READY FOR TESTING
