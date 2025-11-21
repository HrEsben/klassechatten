# Mobile App Testing Guide

## 🎯 Testing Status: Ready for Device Testing

**Date**: November 21, 2025  
**Components Refactored**: LoginForm, ClassRoomBrowser, ChatRoom  
**Shared Components**: 5 (LoadingSpinner, EmptyState, ErrorState, Button, Input)  
**Chat Sub-Components**: 4 (ChatHeader, TypingIndicator, JumpToBottomButton, ImageViewer)

---

## ✅ Pre-Testing Checklist

### Code Compilation
- [x] All TypeScript types correct
- [x] No import errors
- [x] All components export properly
- [x] Theme constants imported correctly

### Component Inventory
- [x] Shared components: 5/5 created
- [x] Chat components: 4/4 created
- [x] LoginForm: Refactored
- [x] ClassRoomBrowser: Refactored
- [x] ChatRoom: Refactored

---

## 🧪 Testing Checklist

### 1. Shared Components Testing

#### LoadingSpinner
- [ ] **Size variants**: Test xs, sm, md, lg, xl
- [ ] **With text**: Verify "Indlæser..." appears correctly
- [ ] **Full screen**: Verify centered on screen
- [ ] **Color**: Verify primary pink color (#ff3fa4)
- [ ] **Animation**: Verify smooth spinning animation
- [ ] **Berlin Edgy**: Verify sharp design (no rounded elements)

**Test Locations:**
- LoginForm loading state
- ClassRoomBrowser initial load
- ChatRoom initial load

#### EmptyState
- [ ] **Icon rendering**: Verify inbox SVG icon displays
- [ ] **Title**: Verify uppercase title style
- [ ] **Description**: Verify readable secondary text
- [ ] **Layout**: Verify centered on screen
- [ ] **Berlin Edgy**: Verify 64x64px icon, uppercase text

**Test Locations:**
- ClassRoomBrowser when no classes
- Could add to ChatRoom when no messages (currently custom)

#### ErrorState
- [ ] **Error message**: Verify displays correctly
- [ ] **Icon**: Verify red error circle icon
- [ ] **Retry button**: Verify appears and works (if provided)
- [ ] **Berlin Edgy**: Verify error color, sharp corners

**Test Locations:**
- ClassRoomBrowser on API error
- ChatRoom on connection error

#### Button
- [ ] **Variants**: Test primary, secondary, ghost, outline, error
- [ ] **Sizes**: Test xs, sm, md, lg
- [ ] **Loading state**: Verify spinner appears, text hidden
- [ ] **Disabled state**: Verify 50% opacity, no press
- [ ] **Full width**: Verify stretches to container
- [ ] **Berlin Edgy**: Verify uppercase text, sharp corners, bold weight

**Test Locations:**
- LoginForm (primary lg, ghost md buttons)
- Could add to other forms

#### Input
- [ ] **Label**: Verify uppercase small label
- [ ] **Placeholder**: Verify appears correctly
- [ ] **Value**: Verify typing works
- [ ] **Error state**: Verify error border and message
- [ ] **Success state**: Verify success border
- [ ] **Secure entry**: Verify password masking
- [ ] **Berlin Edgy**: Verify 48px height, sharp corners, uppercase label

**Test Locations:**
- LoginForm (3 inputs: name, email, password)

---

### 2. Chat Components Testing

#### ChatHeader
- [ ] **Room name**: Verify displays correctly, uppercase
- [ ] **Online count**: Verify updates in real-time
- [ ] **Users button**: Verify opens user list modal
- [ ] **User badge**: Verify shows total user count
- [ ] **Connection status**: Verify green (connected) / yellow (disconnected)
- [ ] **Berlin Edgy**: Verify sharp corners, border-2, proper spacing
- [ ] **Icon**: Verify users icon with square linecaps

**Test in ChatRoom:**
1. Join a room
2. Check header displays room name
3. Verify online count matches
4. Tap users button → verify modal opens
5. Disconnect internet → verify status changes to yellow

#### TypingIndicator
- [ ] **Single user**: Verify "Navn skriver..." format
- [ ] **Two users**: Verify "Navn og navn skriver..." format
- [ ] **Multiple users**: Verify "3 personer skriver..." format
- [ ] **Hidden when empty**: Verify doesn't show when no one typing
- [ ] **Typography**: Verify italic, subtle gray color

**Test in ChatRoom:**
1. Have another user start typing
2. Verify indicator appears
3. Verify correct name displays
4. Test with multiple users typing
5. Stop typing → verify disappears after 2 seconds

#### JumpToBottomButton
- [ ] **Visibility**: Shows when scrolled up, hides when at bottom
- [ ] **Unread badge**: Displays count of new messages
- [ ] **Badge text**: Shows "99+" when count > 99
- [ ] **On press**: Scrolls to bottom instantly
- [ ] **Clears unread**: Badge resets to 0 after press
- [ ] **Berlin Edgy**: Sharp corners, primary color, proper positioning

**Test in ChatRoom:**
1. Scroll up in message list
2. Verify button appears (bottom-right)
3. Have someone send messages
4. Verify unread count increases
5. Tap button → verify scrolls to bottom
6. Verify badge disappears

#### ImageViewer
- [ ] **Opens on tap**: Verify modal opens when tapping image
- [ ] **Image display**: Verify full-screen image renders
- [ ] **Pinch zoom**: Verify can zoom in/out (native)
- [ ] **Close**: Verify tapping background closes modal
- [ ] **Animation**: Verify smooth fade-in/out
- [ ] **Black overlay**: Verify 90% opacity black background

**Test in ChatRoom:**
1. Send message with image
2. Tap image thumbnail
3. Verify full-screen modal opens
4. Try pinch zoom
5. Tap background → verify closes

---

### 3. Refactored Components Testing

#### LoginForm
- [x] **Layout**: Verify centered, proper spacing
- [x] **Title**: Verify "LOG IND" / "OPRET KONTO" uppercase
- [x] **Name input**: Shows only on sign-up
- [x] **Email input**: Works with email keyboard
- [x] **Password input**: Masked characters
- [x] **Submit button**: Shows loading state, disables during submit
- [x] **Toggle button**: Switches between login/signup
- [x] **Error handling**: Displays error box with Danish translated errors
- [x] **Navigation**: Redirects to home on success
- [x] **Berlin Edgy**: All inputs sharp, buttons uppercase, proper spacing

**Test Flow:**
1. ✅ Launch app (logged out)
2. ✅ Try login with empty fields → verify error
3. ✅ Try login with invalid credentials → verify "Ugyldigt login" error in Danish
4. ✅ Toggle to sign-up → verify name field appears
5. ✅ Fill all fields → tap submit → verify loading state
6. ✅ On success → verify redirects to home
7. ✅ Verify keyboard handling (doesn't cover inputs)

#### ClassRoomBrowser
- [ ] **Loading state**: Shows LoadingSpinner initially
- [ ] **Empty state**: Shows EmptyState when no classes
- [ ] **Error state**: Shows ErrorState on API failure
- [ ] **Classes list**: Displays all user's classes
- [ ] **School name**: Shows under class label
- [ ] **Expand/collapse**: Tap class to show/hide rooms
- [ ] **Room navigation**: Tap room → opens ChatRoom
- [ ] **Locked rooms**: Disabled with lock icon
- [ ] **Berlin Edgy**: Cards with border-2, sharp corners, left accent bar

**Test Flow:**
1. Login with account that has NO classes → verify EmptyState
2. Login with account that HAS classes → verify list appears
3. Tap class card → verify expands to show rooms
4. Tap another class → verify first collapses
5. Tap room → verify ChatRoom opens full-screen
6. Tap back → verify returns to browser

#### ChatRoom
- [ ] **Loading state**: Shows LoadingSpinner initially
- [ ] **Error state**: Shows ErrorState on connection error
- [ ] **Header**: ChatHeader displays correctly (if showHeader=true)
- [ ] **Messages list**: Displays all messages inverted
- [ ] **Infinite scroll**: Load more messages when scrolling up
- [ ] **Typing indicator**: Shows when users typing
- [ ] **Message input**: Type and send messages
- [ ] **Image picker**: Select and upload images
- [ ] **Jump to bottom**: Button appears when scrolled up
- [ ] **Image viewer**: Tap image → opens full screen
- [ ] **Reactions**: Tap message → open picker → add reaction
- [ ] **Read receipts**: Shows who read messages
- [ ] **Online presence**: Header shows online count
- [ ] **Draft saving**: Text persists when navigating away
- [ ] **Berlin Edgy**: Consistent styling throughout

**Test Flow:**
1. Open ChatRoom
2. Verify header shows room name and online count
3. Scroll through messages
4. Scroll to top → verify "Load more" or auto-loads older messages
5. Type message → verify typing indicator shows for others
6. Send message → verify appears instantly
7. Scroll up → verify jump button appears
8. Receive new message → verify unread count increases
9. Tap jump button → verify scrolls to bottom
10. Tap image icon → select image → send
11. Tap sent image → verify full-screen viewer opens
12. Long-press message → add reaction
13. Leave room and return → verify draft restored
14. Have another user send message → verify appears in real-time

---

### 4. Integration Testing

#### Authentication Flow
- [ ] **Launch app**: Redirects to login if not authenticated
- [ ] **Login success**: Redirects to home/chat
- [ ] **Token persistence**: Stays logged in after app restart
- [ ] **Logout**: Clears session, redirects to login

#### Navigation Flow
- [ ] **Home → Room**: Smooth transition, no flicker
- [ ] **Room → Back**: Returns to home correctly
- [ ] **Deep linking**: Can open specific room from notification

#### Real-time Synchronization
- [ ] **Messages**: Appear instantly for all users
- [ ] **Typing**: Updates in real-time
- [ ] **Presence**: Online/offline status updates
- [ ] **Reactions**: Updates for all users instantly
- [ ] **Read receipts**: Updates when users read messages

---

### 5. Design System Compliance

#### Berlin Edgy Checklist
- [ ] **No rounded corners**: All UI elements sharp (except bottom sheets: 12px top)
- [ ] **Border width**: All borders use 2px
- [ ] **Typography**: Titles uppercase, bold weights (900/700/500)
- [ ] **Spacing**: Consistent 4/8/12/16/24/32/48px scale
- [ ] **Colors**: Funkyfred palette used throughout
- [ ] **Icons**: Square linecaps, miter linejoins (where custom SVG)
- [ ] **Touch targets**: Buttons 48px min height, small 44px min

#### Color Verification
- [ ] Primary (#ff3fa4): CTAs, accents, active states
- [ ] Secondary (#ffb347): Highlights, secondary actions
- [ ] Accent (#7fdb8f): Success states, positive feedback
- [ ] Error (#e86b6b): Error states, destructive actions
- [ ] Base colors: Proper contrast for text/backgrounds

---

### 6. Performance Testing

#### Load Times
- [ ] **App launch**: < 2 seconds to interactive
- [ ] **Room load**: < 1 second to show messages
- [ ] **Message send**: < 500ms to appear in list
- [ ] **Image upload**: Progress indicator during upload

#### Scrolling Performance
- [ ] **Message list**: Smooth 60fps scrolling
- [ ] **No jank**: When new messages arrive
- [ ] **Infinite scroll**: Smooth loading of older messages

#### Memory Management
- [ ] **No leaks**: Memory usage stable over time
- [ ] **Image cleanup**: Large images don't cause crashes
- [ ] **Subscription cleanup**: Proper unmount cleanup

---

### 7. Device-Specific Testing

#### iOS Testing (iPhone 12 mini, iOS 17+)
- [ ] Safe area handling (notch)
- [ ] Keyboard avoidance works correctly
- [ ] Status bar styling correct
- [ ] Haptic feedback on actions (optional)
- [ ] Back gesture navigation works
- [ ] Share sheet for images works

#### Android Testing (Pixel 5, Android 13+)
- [ ] Safe area handling (navigation bar)
- [ ] Keyboard avoidance works correctly
- [ ] Status bar styling correct
- [ ] Back button navigation works
- [ ] Share sheet for images works
- [ ] Material Design ripple effects

#### Different Screen Sizes
- [ ] iPhone SE (375px): Compact, all elements visible
- [ ] iPhone 14 Pro Max (430px): Proper spacing, no awkward gaps
- [ ] iPad Mini (768px): Layout adapts properly

---

### 8. Accessibility Testing

#### Screen Reader Support
- [ ] All buttons have proper labels
- [ ] Images have alt text
- [ ] Form inputs have labels
- [ ] Status changes announced

#### Touch Targets
- [ ] All buttons ≥ 44x44px
- [ ] Adequate spacing between interactive elements
- [ ] No overlapping hit areas

#### Color Contrast
- [ ] Text on backgrounds meets WCAG AA (4.5:1)
- [ ] Interactive elements distinguishable
- [ ] Error states clearly visible

---

## 🐛 Known Issues

### Current Issues (to be fixed):
1. ⚠️ **Metro bundler warning**: Some package versions need updates
   - Not critical, app runs fine
   - Can update when convenient

### Resolved Issues:
- ✅ ClassRoomBrowser ActivityIndicator error (fixed by using LoadingSpinner)
- ✅ ChatRoom header inline code (fixed by using ChatHeader)
- ✅ LoginForm inline inputs (fixed by using Input component)

---

## 📱 Testing Devices

### Recommended Test Matrix
1. **iOS Physical Device** (primary)
   - iPhone 12/13/14 (standard size)
   - iOS 17+ required

2. **Android Physical Device** (secondary)
   - Pixel or Samsung Galaxy
   - Android 13+ required

3. **iOS Simulator** (development)
   - Quick testing during development
   - Note: Push notifications don't work

4. **Expo Go** (quick testing)
   - Fast iteration
   - Limited native features

---

## 🚀 How to Run Tests

### 1. Start Development Server
```bash
cd /Users/esbenpro/Documents/KlasseChatten/apps/mobile
npm run dev
```

### 2. Open on Device

**iOS:**
```bash
# Press 'i' in terminal to open iOS simulator
# OR scan QR code with iPhone Camera app
```

**Android:**
```bash
# Press 'a' in terminal to open Android emulator
# OR scan QR code with Expo Go app
```

### 3. Manual Testing
- Follow checklist above
- Document any issues found
- Take screenshots of design compliance
- Note performance issues

### 4. Report Issues
Create GitHub issues for any bugs found with:
- Device/OS version
- Steps to reproduce
- Expected vs actual behavior
- Screenshots/video if applicable

---

## 📊 Test Results Template

```markdown
## Test Session: [Date]

**Tester**: [Name]
**Device**: [iPhone 12 mini, iOS 17.1]
**App Version**: [Commit hash]

### Passed Tests
- ✅ LoadingSpinner displays correctly
- ✅ Button variants render properly
- ✅ ChatHeader shows online count
- [etc...]

### Failed Tests
- ❌ Jump to bottom button not appearing
  - Steps: [...]
  - Expected: [...]
  - Actual: [...]

### Design Issues
- ⚠️ Input border should be 2px, is 1px
- ⚠️ Button has slight border radius, should be 0

### Performance Issues
- ⚠️ Scrolling stutters with 100+ messages
- ⚠️ Image upload takes 5+ seconds

### Notes
- Overall performance good
- Design mostly consistent
- Minor fixes needed
```

---

## ✅ Definition of Done

Task 6 is complete when:
- [ ] All shared components tested on iOS
- [ ] All shared components tested on Android
- [ ] All refactored components tested
- [ ] Integration testing complete
- [ ] Design system compliance verified
- [ ] No critical bugs blocking usage
- [ ] Test results documented
- [ ] Issues logged in GitHub (if any)

---

**Next Steps After Testing:**
1. Fix any critical bugs found
2. Address design system violations
3. Optimize performance issues
4. Consider adding unit tests
5. Document any learnings
6. Plan next features/improvements

---

**Status**: ⏳ READY FOR MANUAL TESTING  
**Last Updated**: November 21, 2025
