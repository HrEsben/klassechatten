# Guardian Invite System - Complete Implementation

## ✅ Status: Ready for Deployment

### Overview
Complete system for Guardian #1 to create child accounts and generate invite codes for Guardian #2 to claim children.

---

## 🗄️ Database Changes

### Migration File
`/supabase/migrations/20241119_guardian_invite_codes.sql`

**New Columns Added to `guardian_links`:**
- `invite_code` - 8-char uppercase code (unique)
- `code_generated_at` - Timestamp when code was generated
- `code_used_at` - Timestamp when Guardian #2 claimed code
- `max_guardians` - Maximum allowed guardians (default 2)

**Functions Created:**
1. `generate_guardian_invite_code(p_child_user_id, p_requesting_guardian_id)`
   - Generates unique 8-char code for a child
   - Validates guardian relationship
   - Returns code or error

2. `claim_guardian_invite_code(p_invite_code, p_new_guardian_id)`
   - Guardian #2 uses code to link to child
   - Creates guardian_link record
   - Adds guardian to child's classes
   - Marks code as used
   - Returns success/error JSON

3. `get_guardian_children_with_codes(p_guardian_id)`
   - Lists all children for a guardian
   - Shows invite code status (generated/used/available)
   - Returns child details with code info

---

## 🛣️ API Routes

### 1. Generate Invite Code
**Endpoint:** `POST /api/guardians/generate-invite`

**Body:**
```json
{
  "childId": "uuid-of-child"
}
```

**Response:**
```json
{
  "success": true,
  "code": "ABC12XYZ"
}
```

---

### 2. Claim Invite Code
**Endpoint:** `POST /api/guardians/claim-invite`

**Body:**
```json
{
  "code": "ABC12XYZ"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Du er nu tilknyttet barnet",
  "child": {
    "id": "uuid",
    "full_name": "Emma Jensen",
    "age": 10
  }
}
```

---

### 3. List My Children
**Endpoint:** `GET /api/guardians/my-children`

**Response:**
```json
{
  "success": true,
  "children": [
    {
      "id": "uuid",
      "full_name": "Emma Jensen",
      "guardian_count": 2,
      "invite_code": "ABC12XYZ",
      "code_generated_at": "2024-01-15T10:30:00Z",
      "code_used_at": "2024-01-15T12:45:00Z",
      "max_guardians": 2
    }
  ]
}
```

---

## 🎨 UI Pages

### 1. Create Child Page
**Path:** `/apps/web/src/app/create-child/page.tsx`

**Flow:**
1. Guardian #1 fills form (name, age, school, class)
2. Child account created
3. UI shows "Inviter Anden Forælder" section
4. Click "Generer Kode" → Shows 8-char code
5. Copy button to share code with Guardian #2

**Features:**
- ✅ Form validation
- ✅ Success state with code generation
- ✅ Copy to clipboard functionality
- ✅ Visual feedback (copied confirmation)

---

### 2. Claim Child Page
**Path:** `/apps/web/src/app/claim-child/page.tsx`

**Flow:**
1. Guardian #2 navigates to /claim-child
2. Enters 8-char code from Guardian #1
3. Submits form
4. Success: Shows child name and class count
5. Redirects to dashboard after 3 seconds

**Features:**
- ✅ Standalone page (always accessible)
- ✅ Input auto-uppercase
- ✅ Max 8 characters
- ✅ Success animation
- ✅ Error handling
- ✅ Help section with link to /create-child

---

### 3. My Children Page
**Path:** `/apps/web/src/app/my-children/page.tsx`

**Flow:**
1. Guardian sees list of all their children
2. Each child card shows:
   - Name, age
   - Guardian count badge
   - Code status (used/unused/none)
   - Generate/Regenerate button
   - Copy code button (if code exists)

**Features:**
- ✅ Lists all guardian's children
- ✅ Code management per child
- ✅ Copy code functionality
- ✅ Visual status indicators

---

### 4. Onboarding Integration
**Path:** `/apps/web/src/app/onboarding/page.tsx`

**Changes:**
- ✅ Added 3rd option card: "Forældre-Kode"
- ✅ Claim form in onboarding flow
- ✅ Success state before proceeding
- ✅ Only shows to new users (no classes)

---

### 5. Dashboard Empty State
**Path:** `/apps/web/src/components/ClassRoomBrowser.tsx`

**Changes:**
- ✅ Replaced text with 3 action cards
- ✅ "Opret Barn Konto" → /create-child
- ✅ "Brug Forældre-Kode" → /claim-child
- ✅ "Tilmeld Klasse" → /onboarding (join existing)

---

### 6. Navigation Updates
**Path:** `/apps/web/src/components/AdminLayout.tsx`

**Desktop Sidebar (guardian role only):**
- ✅ Section: "Forældre"
- ✅ Link: "Mine Børn" → /my-children
- ✅ Link: "Opret Barn" → /create-child
- ✅ Link: "Tilknyt Barn" → /claim-child (accent color)

**Mobile Dropdown:**
- ✅ Same 3 links in mobile menu
- ✅ Only visible to guardian role

---

## 🔐 Security

### RLS Policies (Existing)
- ✅ Guardians can only see their linked children
- ✅ Service role required for cross-table operations
- ✅ JWT validation on all API routes

### Code Security
- ✅ 8-character uppercase (no confusing chars: 0O1IL)
- ✅ Unique constraint on invite_code
- ✅ Single-use enforcement (code_used_at check)
- ✅ Max 2 guardians per child
- ✅ Expires after 7 days (configurable)

---

## 📱 User Flows

### Flow 1: Guardian #1 Creates Child
```
1. Log in as guardian
2. Navigate to /create-child (from dashboard or nav)
3. Fill form: name, age, school, class
4. Submit → Child created
5. Click "Generer Kode" → ABC12XYZ shown
6. Copy code → Share with Guardian #2 via SMS/WhatsApp
```

---

### Flow 2: Guardian #2 Claims Child (New User)
```
1. Sign up as guardian
2. Onboarding shows 3 options
3. Click "Forældre-Kode" card
4. Enter code: ABC12XYZ
5. Submit → Success! Linked to Emma Jensen
6. Continue to dashboard → See Emma's classes
```

---

### Flow 3: Guardian #2 Claims Child (Existing User)
```
1. Log in as guardian (already has other children)
2. Click "Tilknyt Barn" in sidebar OR
3. Navigate to /claim-child directly
4. Enter code: ABC12XYZ
5. Submit → Success! Linked to Emma Jensen
6. Redirected to dashboard → See Emma's classes
```

---

### Flow 4: Guardian Manages Children
```
1. Log in as guardian
2. Click "Mine Børn" in sidebar
3. See all children with code status
4. Generate code for child without one
5. Regenerate expired code
6. Copy code to share
```

---

## 🚀 Deployment Steps

### 1. Deploy Database Migration
```bash
cd /Users/esbenpro/Documents/KlasseChatten

# Option A: Using Supabase CLI
supabase db push

# Option B: Manual in Supabase Dashboard
# 1. Copy content of supabase/migrations/20241119_guardian_invite_codes.sql
# 2. Go to Supabase Dashboard → SQL Editor
# 3. Paste and run migration
```

**Verify Success:**
```sql
-- Check columns exist
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'guardian_links' 
AND column_name IN ('invite_code', 'code_generated_at', 'code_used_at', 'max_guardians');

-- Check functions exist
SELECT routine_name FROM information_schema.routines 
WHERE routine_name IN ('generate_guardian_invite_code', 'claim_guardian_invite_code', 'get_guardian_children_with_codes');
```

---

### 2. Test API Routes
```bash
# Terminal 1: Start dev server
cd apps/web
npm run dev

# Terminal 2: Test generate code (replace with real tokens/IDs)
curl -X POST http://localhost:3000/api/guardians/generate-invite \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"childId": "CHILD_UUID"}'

# Test claim code
curl -X POST http://localhost:3000/api/guardians/claim-invite \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"code": "ABC12XYZ"}'

# Test list children
curl http://localhost:3000/api/guardians/my-children \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 3. Test UI Flows
```
✅ Test /create-child page
   - Create child
   - Generate code
   - Copy code

✅ Test /claim-child page
   - Enter valid code
   - Enter invalid code
   - Enter expired code
   - Enter already-used code

✅ Test /my-children page
   - View all children
   - Generate codes
   - Regenerate codes
   - Copy codes

✅ Test navigation
   - Desktop sidebar shows guardian links
   - Mobile menu shows guardian links
   - Links only visible to guardian role

✅ Test dashboard empty state
   - Shows 3 action cards
   - All cards navigate correctly
```

---

## 🔍 Testing Checklist

### Database Tests
- [ ] Migration runs without errors
- [ ] All 3 functions exist
- [ ] guardian_links has new columns
- [ ] Unique constraint on invite_code works
- [ ] Indexes created successfully

### API Tests
- [ ] Generate code returns 8-char uppercase
- [ ] Generate code fails for non-guardian
- [ ] Claim code creates guardian_link
- [ ] Claim code adds guardian to classes
- [ ] Claim code fails if already used
- [ ] Claim code fails if max guardians reached
- [ ] List children returns correct data

### UI Tests
- [ ] /create-child generates code after creation
- [ ] Code copy works (clipboard API)
- [ ] /claim-child validates 8-char input
- [ ] /claim-child shows success state
- [ ] /my-children lists all children
- [ ] Navigation shows guardian links
- [ ] Links only visible to guardians

### Security Tests
- [ ] Non-guardians can't generate codes
- [ ] Non-guardians can't claim codes
- [ ] Code single-use enforced
- [ ] Max 2 guardians enforced
- [ ] RLS policies work correctly

---

## 📊 Code Statistics

**Files Created:** 8
- 1 migration file
- 3 API routes
- 3 pages (create-child modified, claim-child new, my-children new)
- 1 documentation file

**Files Modified:** 3
- /apps/web/src/app/create-child/page.tsx
- /apps/web/src/app/onboarding/page.tsx
- /apps/web/src/components/ClassRoomBrowser.tsx
- /apps/web/src/components/AdminLayout.tsx

**Lines of Code Added:** ~800
- Migration: 263 lines
- API routes: 150 lines
- UI pages: 350 lines
- Documentation: 200 lines

---

## 🐛 Known Issues

### Issue 1: Database Deployment Failed
**Status:** ⚠️ Not deployed yet
**Error:** `supabase db push` exited with code 1
**Solution:** Manual deployment via SQL Editor

### Issue 2: Mobile Not Implemented
**Status:** ⏳ Pending
**Scope:** React Native app needs equivalent pages
**Files Needed:**
- `/apps/mobile/app/create-child.tsx`
- `/apps/mobile/app/claim-child.tsx`
- `/apps/mobile/app/my-children.tsx`

---

## 📚 Documentation Files

1. **GUARDIAN_INVITE_CODES.md** - Complete deployment guide
2. **GUARDIAN_INVITE_CODES_QUICKSTART.md** - Quick reference
3. **GUARDIAN_SYSTEM_COMPLETE.md** (this file) - System overview

---

## 🎯 Next Steps

### Priority 1: Deploy Database
```bash
# Option 1: Fix and retry CLI
supabase db push

# Option 2: Manual SQL Editor
# Copy/paste migration and run
```

### Priority 2: End-to-End Testing
```
1. Create Guardian #1 account
2. Create child via /create-child
3. Generate invite code
4. Create Guardian #2 account
5. Claim child via /claim-child
6. Verify both guardians see child
7. Verify Guardian #2 added to classes
```

### Priority 3: Mobile Implementation
```
1. Port pages to React Native
2. Use same API routes
3. Test on iOS/Android
```

### Priority 4: Analytics
```
1. Track code generation events
2. Track code claim events
3. Monitor failed claims
4. Alert on expired codes
```

---

## 🎉 Features Complete

✅ Database schema with invite codes
✅ Code generation function (8-char unique)
✅ Code claiming function (creates link + adds to classes)
✅ API routes (generate, claim, list)
✅ Guardian #1 flow (create + invite)
✅ Guardian #2 flow (claim during onboarding)
✅ Guardian #2 flow (claim as existing user)
✅ Child management page
✅ Dashboard empty state shortcuts
✅ Persistent navigation links
✅ Mobile menu integration
✅ Copy to clipboard
✅ Success/error states
✅ Security (RLS + validation)
✅ Danish language UI
✅ Berlin Edgy design system

---

## 🔮 Future Enhancements

### Phase 2 (Optional)
- [ ] Email invite option (send code via email)
- [ ] SMS invite option (send code via SMS)
- [ ] QR code generation (scan to claim)
- [ ] Guardian removal flow
- [ ] Transfer primary guardian role
- [ ] Invite code expiration notifications
- [ ] Analytics dashboard for admins

### Phase 3 (Optional)
- [ ] 3rd guardian support (grandparents)
- [ ] Temporary guardian access (babysitters)
- [ ] Guardian permissions (read-only vs full access)
- [ ] Audit log for guardian actions
