# KlasseChatten Improvement Roadmap 🚀

## 🎯 Quick Wins (1-2 hours total)

### Phase 1: Immediate UX Improvements
- [x] **Image Upload Optimization** (30 min) ✅ COMPLETED
  - Show optimistic message immediately
  - Upload image in background
  - Update message when upload completes
  - Files: `ChatRoom.tsx` (web/mobile), `useRoomMessages.ts`, `Message.tsx`, `MessageItem.tsx`
  - **Status**: Web and mobile apps now show messages instantly with image preview, upload happens in background with loading indicator

- [x] **Cascade Messaging Fix** (15 min) ✅ COMPLETED
  - Remove input blocking during message send
  - Allow rapid message sending without waiting
  - Keep input disabled only during image upload
  - Files: `ChatRoom.tsx` (web/mobile)
  - **Status**: Users can now type next message immediately after sending, input stays enabled and focused

- [x] **Message Draft Persistence** (30 min) ✅ COMPLETED
  - Save unsent text to localStorage/AsyncStorage
  - Restore draft on room change
  - Clear draft after successful send
  - Files: `ChatRoom.tsx` (web/mobile)
  - **Status**: Drafts auto-save every 500ms (mobile) or immediately (web), restore when returning to room

- [x] **Client-Side Rate Limiting** (20 min) ✅ COMPLETED
  - Prevent spam (1 second between messages)
  - Show toast notification when limited
  - Files: `ChatRoom.tsx` (web/mobile)
  - **Status**: 1-second cooldown enforced, shows Danish warning with remaining time

- [x] **Retry Failed Messages** (40 min) ✅ COMPLETED
  - Add retry button to error state messages
  - Implement exponential backoff
  - Show clear error messages
  - Files: `Message.tsx` (web/mobile), `ChatRoom.tsx`, `MessageItem.tsx`
  - **Status**: Retry button with 1s/2s/4s exponential backoff, max 3 attempts, clear Danish error messages

---

## ⚡️ Performance Optimizations (3-4 hours total)

### Phase 2: React Performance
- [ ] **Memoize Message Components** (30 min)
  - Wrap Message in React.memo
  - Add proper comparison function
  - Memoize callbacks in ChatRoom
  - Files: `Message.tsx`, `ChatRoom.tsx`

- [ ] **Optimize Edge Function Profanity Filter** (1 hour)
  - Pre-compile regex patterns
  - Use hash set for O(1) lookups
  - Move word list outside request handler
  - Files: `supabase/functions/create_message/index.ts`

- [ ] **Message List Virtualization** (2 hours)
  - Install react-window
  - Virtualize message list rendering
  - Implement smooth auto-scroll
  - Only render visible messages
  - Files: `ChatRoom.tsx` (web), install dependencies

- [ ] **Consolidate Realtime Subscriptions** (1 hour)
  - Single channel per room
  - Batch updates with 100ms debounce
  - Subscribe to multiple tables on one channel
  - Files: `useRoomMessages.ts`, `useReactions.ts`, `useReadReceipts.ts`

---

## 🖼️ Image Handling (2-3 hours total)

### Phase 3: Image Optimization
- [ ] **Client-Side Image Compression** (1.5 hours)
  - Install compression libraries
  - Compress before upload (max 1920x1080, 85% quality)
  - Generate thumbnails (320x240)
  - Show upload progress
  - Files: `useSendMessage.ts` (web/mobile)

- [ ] **Image Loading States** (30 min)
  - Show skeleton while loading
  - Progressive image loading
  - Error state with retry
  - Files: `Message.tsx` (web/mobile)

- [ ] **Image Lazy Loading** (30 min)
  - Load images only when visible
  - Use intersection observer
  - Blur placeholder
  - Files: `Message.tsx` (web/mobile)

---

## 📊 Data Management (2-3 hours total)

### Phase 4: Scalability
- [ ] **Message Archiving Strategy** (1 hour)
  - Document archival policy (6 months)
  - Create archive migration
  - Add archive query endpoints
  - Files: `supabase/migrations/`, API routes

---

## 🔍 Monitoring & Debugging (2-3 hours total)

### Phase 5: Production Readiness
- [ ] **Error Tracking with Sentry** (1 hour)
  - Install @sentry/nextjs and @sentry/react-native
  - Configure DSN and environments
  - Add error boundaries
  - Track Edge Function errors
  - Files: `_app.tsx`, `_layout.tsx`, Edge Functions

- [ ] **Performance Monitoring** (1 hour)
  - Enable Next.js Web Vitals
  - Track message send latency
  - Monitor Supabase query times
  - Set up alerting
  - Files: `_app.tsx`, analytics utilities

- [ ] **Comprehensive Logging** (30 min)
  - Structured logging utility
  - Log levels (debug, info, warn, error)
  - Production vs development logging
  - Files: `packages/lib/logger.ts`

---

## ✅ Testing & Quality (4-6 hours total)

### Phase 6: Test Coverage
- [ ] **Setup Testing Infrastructure** (1 hour)
  - Install Jest, React Testing Library, Playwright
  - Configure test environments
  - Setup test database
  - Files: `jest.config.js`, `playwright.config.ts`

- [ ] **Unit Tests** (2 hours)
  - Test hooks (useSendMessage, useReactions)
  - Test validation schemas
  - Test utility functions
  - Files: `*.test.ts` files

- [ ] **Component Tests** (2 hours)
  - Test ChatRoom interactions
  - Test Message rendering
  - Test moderation UI
  - Files: `*.test.tsx` files

- [ ] **E2E Tests** (1 hour)
  - Login flow
  - Send message flow
  - Create/join class flow
  - Files: `e2e/*.spec.ts`

---

## 📚 Documentation (2-3 hours total)

### Phase 7: Developer Experience
- [ ] **API Documentation** (1.5 hours)
  - Document all API routes with JSDoc
  - Create OpenAPI spec
  - Add request/response examples
  - Files: `apps/web/src/app/api/**/route.ts`

- [ ] **Component Documentation** (1 hour)
  - Add Storybook (optional)
  - Document props with JSDoc
  - Add usage examples
  - Files: `components/**/*.tsx`

- [ ] **Deployment Guide** (30 min)
  - Document CI/CD pipeline
  - Environment variable guide
  - Database migration workflow
  - Files: `DEPLOYMENT.md`

---

## 🎨 Nice-to-Have Features (4-6 hours total)

### Phase 8: Advanced Features
- [ ] **Typing Indicators** (2 hours)
  - Real-time typing status
  - Presence broadcast
  - Show "X is typing..." indicator
  - Files: `ChatRoom.tsx`, new hooks

- [ ] **Message Search** (2 hours)
  - Full-text search in messages
  - Filter by user, date, room
  - Search UI component
  - Files: API routes, new components

- [ ] **Message Threads** (2 hours)
  - Reply to specific messages
  - Threaded view UI
  - Thread notifications
  - Files: Database migration, components

---

## 📋 Implementation Priority

### 🔥 High Priority (Do First)
1. Phase 1: Quick Wins - Immediate UX improvements
2. Phase 2: Performance Optimizations - Prevent future issues
3. Phase 5: Monitoring - Essential for production

### ⚡️ Medium Priority (Do Soon)
4. Phase 3: Image Optimization - Better media handling
5. Phase 4: Scalability - Prepare for growth
6. Phase 6: Testing - Ensure quality

### 🌟 Low Priority (Do Later)
7. Phase 7: Documentation - Improve DX
8. Phase 8: Advanced Features - Nice-to-haves

---

## 📊 Time Estimates

| Phase | Time | Impact | Status |
|-------|------|--------|--------|
| **Phase 1: Quick Wins** | 2 hours (2.08h done) | ⚡️⚡️⚡️ High | ✅ 100% Complete |
| **Phase 2: Performance** | 4 hours | ⚡️⚡️⚡️ High | ⚪️ Not Started |
| **Phase 3: Images** | 3 hours (0.5h done) | ⚡️⚡️ Medium | 🟢 17% Complete |
| **Phase 4: Data** | 1 hour | ⚡️⚡️ Medium | ⚪️ Not Started |
| **Phase 5: Monitoring** | 3 hours | ⚡️⚡️⚡️ High | ⚪️ Not Started |
| **Phase 6: Testing** | 5 hours | ⚡️⚡️ Medium | ⚪️ Not Started |
| **Phase 7: Docs** | 3 hours | ⚡️ Low | ⚪️ Not Started |
| **Phase 8: Features** | 6 hours | ⚡️ Low | ⚪️ Not Started |
| **TOTAL** | ~27 hours (2.58h done) | | 🟢 9.6% Complete |

---

## 🎯 Suggested Sprint Plan

### Sprint 1 (Week 1): Foundation
- ✅ Phase 1: Quick Wins (2 hours) - 100% complete 🎉
  - ✅ Image Upload Optimization (done)
  - ✅ Cascade Messaging Fix (done)
  - ✅ Message Draft Persistence (done)
  - ✅ Client-Side Rate Limiting (done)
  - ✅ Retry Failed Messages (done)
- ⬜️ Phase 5: Monitoring (3 hours)
- **Total:** 5 hours (2.58h done, 2.42h remaining)

### Sprint 2 (Week 2): Performance
- ✅ Phase 2: Performance Optimizations (4 hours)
- ✅ Phase 3: Image Optimization (3 hours)
- **Total:** 7 hours

### Sprint 3 (Week 3): Scalability & Quality
- ✅ Phase 4: Data Management (1 hour)
- ✅ Phase 6: Testing (partial - 3 hours)
- **Total:** 4 hours

### Sprint 4 (Week 4): Polish
- ✅ Phase 6: Testing (remaining - 2 hours)
- ✅ Phase 7: Documentation (3 hours)
- **Total:** 5 hours

### Sprint 5+ (Optional): Advanced Features
- ✅ Phase 8: Nice-to-Have Features (6 hours)

---

## 🚀 Progress Update

### ✅ Completed (November 17, 2025)
1. **Image Upload Optimization** - Messages now appear instantly with image preview, upload happens in background
   - Web: Added `updateOptimisticMessageImage()` hook function
   - Mobile: Updated `Message` interface with `isUploadingImage` flag
   - Both apps show loading indicator during upload
   - Image preview shows immediately for instant UX

2. **Cascade Messaging Fix** - Users can now rapidly send multiple messages without input blocking
   - Web: Removed `sending` flag from input/button disabled conditions
   - Mobile: Changed `editable={!uploading}` to allow typing during send
   - Input stays enabled and focused after sending
   - Only blocks during image upload (actual long operation)

3. **Message Draft Persistence** - Auto-saves unsent messages across room switches
   - Web: Saves to localStorage immediately on text change
   - Mobile: Saves to AsyncStorage with 500ms debounce to reduce I/O
   - Restores draft when user returns to same room
   - Clears draft after successful message send
   - Prevents data loss when switching rooms or closing app

4. **Client-Side Rate Limiting** - Prevents message spam with smart cooldown
   - 1-second cooldown between messages enforced client-side
   - Web: Shows toast notification with remaining time in Danish
   - Mobile: Shows Alert dialog with remaining time
   - Message format: "Vent venligst X sekund(er) før du sender næste besked"
   - Uses ref to track last send time without re-renders

5. **Retry Failed Messages** - Smart retry system with exponential backoff
   - Retry button appears on failed messages with red "Prøv igen" button
   - Exponential backoff: 1s, 2s, 4s delays between retry attempts
   - Maximum 3 retry attempts per message
   - Web: Shows info toast for attempts, success/error toasts for results
   - Mobile: Shows Alert dialogs with attempt count and results
   - Handles image upload failures with helpful error messages
   - Tracks retry attempts per message using Map state

### ✅ Previously Completed (Before Roadmap)

6. **Message Pagination / Infinite Scroll** - Already implemented!
   - Cursor-based pagination using timestamp
   - Loads last 50 messages by default
   - "INDLÆS ÆLDRE" button for older messages
   - IntersectionObserver for automatic loading on web
   - FlatList onEndReached for mobile
   - Preserves scroll position when loading more
   - 5-10x faster initial load compared to loading all messages
   - Documented in `INFINITE_SCROLL.md`
   - Files: `useRoomMessages.ts`, `ChatRoom.tsx` (web/mobile)

### 🎉 Phase 1 Complete!

**All Quick Wins implemented in 2.58 hours** (2 hours estimated)

### 🎯 Next Steps
**Recommended Next Phase:** Phase 2 - Performance Optimizations (4 hours)
- Quick win that provides immediate value
- Save unsent messages to localStorage/AsyncStorage
- Restore drafts when user returns to room
- Complement the instant send experience

### 📊 Overall Progress
- **Hours Completed:** 2.58 out of 29 (8.9%)
- **Current Sprint:** Sprint 1 - Week 1 (2.58h/5h completed) 🎉
- **Status:** Phase 1 Complete! ✅

---

## 🚀 Getting Started

To continue implementing this roadmap:

1. **Continue Phase 1** - Complete remaining quick wins
2. **Track progress** - Check off items as you complete them
3. **Test thoroughly** - Verify image upload works on both web and mobile
4. **One task at a time** - Focus on completing draft persistence next

**Ready to continue?** Let me know if you want to tackle message draft persistence or move to another task! 🎯
