# KlasseChatten Improvement Roadmap 🚀

## 🎯 Quick Wins (1-2 hours total)

### Phase 1: Immediate UX Improvements
- [x] **Image Upload Optimization** (30 min) ✅ COMPLETED
  - Show optimistic message immediately
  - Upload image in background
  - Update message when upload completes
  - Files: `ChatRoom.tsx` (web/mobile), `useRoomMessages.ts`, `Message.tsx`, `MessageItem.tsx`
  - **Status**: Web and mobile apps now show messages instantly with image preview, upload happens in background with loading indicator

- [ ] **Message Draft Persistence** (30 min)
  - Save unsent text to localStorage/AsyncStorage
  - Restore draft on room change
  - Clear draft after successful send
  - Files: `ChatRoom.tsx` (web/mobile)

- [ ] **Client-Side Rate Limiting** (20 min)
  - Prevent spam (1 second between messages)
  - Show toast notification when limited
  - Files: `ChatRoom.tsx` (web/mobile)

- [ ] **Retry Failed Messages** (40 min)
  - Add retry button to error state messages
  - Implement exponential backoff
  - Show clear error messages
  - Files: `Message.tsx` (web/mobile), `useSendMessage.ts`

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
- [ ] **Message Pagination** (2 hours)
  - Cursor-based pagination
  - Load last 50 messages by default
  - "Load more" button for older messages
  - Infinite scroll support
  - Files: `useRoomMessages.ts`, `ChatRoom.tsx`

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
| **Phase 1: Quick Wins** | 2 hours (0.5h done) | ⚡️⚡️⚡️ High | 🟢 25% Complete |
| **Phase 2: Performance** | 4 hours | ⚡️⚡️⚡️ High | ⚪️ Not Started |
| **Phase 3: Images** | 3 hours (0.5h done) | ⚡️⚡️ Medium | 🟢 17% Complete |
| **Phase 4: Data** | 3 hours | ⚡️⚡️ Medium | ⚪️ Not Started |
| **Phase 5: Monitoring** | 3 hours | ⚡️⚡️⚡️ High | ⚪️ Not Started |
| **Phase 6: Testing** | 5 hours | ⚡️⚡️ Medium | ⚪️ Not Started |
| **Phase 7: Docs** | 3 hours | ⚡️ Low | ⚪️ Not Started |
| **Phase 8: Features** | 6 hours | ⚡️ Low | ⚪️ Not Started |
| **TOTAL** | ~29 hours (1h done) | | 🟢 3.4% Complete |

---

## 🎯 Suggested Sprint Plan

### Sprint 1 (Week 1): Foundation
- 🟡 Phase 1: Quick Wins (2 hours) - 25% complete
  - ✅ Image Upload Optimization (done)
  - ⬜️ Message Draft Persistence (remaining)
  - ⬜️ Client-Side Rate Limiting (remaining)
  - ⬜️ Retry Failed Messages (remaining)
- ⬜️ Phase 5: Monitoring (3 hours)
- **Total:** 5 hours (1h done, 4h remaining)

### Sprint 2 (Week 2): Performance
- ✅ Phase 2: Performance Optimizations (4 hours)
- ✅ Phase 3: Image Optimization (3 hours)
- **Total:** 7 hours

### Sprint 3 (Week 3): Scalability & Quality
- ✅ Phase 4: Data Management (3 hours)
- ✅ Phase 6: Testing (partial - 3 hours)
- **Total:** 6 hours

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

### 🎯 Next Steps
**Recommended Next Task:** Message Draft Persistence (30 min)
- Quick win that provides immediate value
- Save unsent messages to localStorage/AsyncStorage
- Restore drafts when user returns to room
- Complement the instant send experience

### 📊 Overall Progress
- **Hours Completed:** 1 out of 29 (3.4%)
- **Current Sprint:** Sprint 1 - Week 1 (1h/5h completed)
- **Status:** On track ✅

---

## 🚀 Getting Started

To continue implementing this roadmap:

1. **Continue Phase 1** - Complete remaining quick wins
2. **Track progress** - Check off items as you complete them
3. **Test thoroughly** - Verify image upload works on both web and mobile
4. **One task at a time** - Focus on completing draft persistence next

**Ready to continue?** Let me know if you want to tackle message draft persistence or move to another task! 🎯
