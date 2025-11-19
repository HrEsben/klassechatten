# Guardian Invite System - Testing Guide

## 🧪 Complete Testing Checklist

Use this guide to verify all guardian invite features work correctly.

---

## 🎬 Prerequisites

### Before Testing
1. ✅ Database migration deployed successfully
2. ✅ Development server running (`npm run dev`)
3. ✅ Two test accounts ready:
   - **Guardian #1** (primary parent)
   - **Guardian #2** (secondary parent)
4. ✅ Test school and class exist

### Test Data Setup
```sql
-- Create test school
INSERT INTO schools (name) VALUES ('Test Skole');

-- Create test class
INSERT INTO classes (label, school_id) 
VALUES ('3A', (SELECT id FROM schools WHERE name = 'Test Skole' LIMIT 1));
```

---

## 📋 Test Suite

### ✅ Test 1: Database Functions

#### 1.1 Verify Columns Exist
```sql
-- Run in Supabase SQL Editor
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'guardian_links' 
AND column_name IN ('invite_code', 'code_generated_at', 'code_used_at', 'max_guardians');
```

**Expected:** 4 rows returned

---

#### 1.2 Verify Functions Exist
```sql
-- Run in Supabase SQL Editor
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_name IN (
  'generate_guardian_invite_code', 
  'claim_guardian_invite_code', 
  'get_guardian_children_with_codes'
);
```

**Expected:** 3 rows returned

---

#### 1.3 Test Code Generation
```sql
-- Run in Supabase SQL Editor (replace UUIDs with real values)
SELECT generate_guardian_invite_code(
  'CHILD_USER_ID'::uuid,
  'GUARDIAN_1_USER_ID'::uuid
);
```

**Expected:** 8-character uppercase code (e.g., 'ABC12XYZ')

---

#### 1.4 Test Code Claiming
```sql
-- Run in Supabase SQL Editor
SELECT claim_guardian_invite_code(
  'ABC12XYZ',
  'GUARDIAN_2_USER_ID'::uuid
);
```

**Expected:** JSON with success=true

---

### ✅ Test 2: API Routes

#### 2.1 Test Generate Invite API
```bash
# Terminal
curl -X POST http://localhost:3000/api/guardians/generate-invite \
  -H "Content-Type: application/json" \
  -H "Cookie: YOUR_SUPABASE_SESSION_COOKIE" \
  -d '{"childId": "CHILD_UUID"}'
```

**Expected:**
```json
{
  "success": true,
  "code": "ABC12XYZ"
}
```

---

#### 2.2 Test Claim Invite API
```bash
# Terminal
curl -X POST http://localhost:3000/api/guardians/claim-invite \
  -H "Content-Type: application/json" \
  -H "Cookie: YOUR_SUPABASE_SESSION_COOKIE" \
  -d '{"code": "ABC12XYZ"}'
```

**Expected:**
```json
{
  "success": true,
  "message": "Du er nu tilknyttet barnet",
  "child": {
    "id": "uuid",
    "full_name": "Emma Jensen"
  }
}
```

---

#### 2.3 Test List Children API
```bash
# Terminal
curl http://localhost:3000/api/guardians/my-children \
  -H "Cookie: YOUR_SUPABASE_SESSION_COOKIE"
```

**Expected:**
```json
{
  "success": true,
  "children": [
    {
      "id": "uuid",
      "full_name": "Emma Jensen",
      "guardian_count": 2,
      "invite_code": "ABC12XYZ",
      "code_used_at": "2024-01-15T12:45:00Z",
      "max_guardians": 2
    }
  ]
}
```

---

### ✅ Test 3: UI - Create Child Flow

#### 3.1 Navigate to Create Child
1. Log in as Guardian #1
2. Click sidebar link "Opret Elev" OR
3. Navigate to empty dashboard → Click "Opret Elev-konto" card

**Expected:** `/create-child` page loads

---

#### 3.2 Fill Create Child Form
1. Enter name: "Emma Jensen"
2. Enter age: "10"
3. Select school from dropdown
4. Select class from dropdown
5. Click "Opret Elev" button

**Expected:**
- ✅ Loading spinner shows
- ✅ Success message appears
- ✅ "Inviter Anden Forælder" section appears

---

#### 3.3 Generate Invite Code
1. Click "Generer Kode" button
2. Wait for code to appear

**Expected:**
- ✅ Code displays (8 uppercase chars)
- ✅ Copy button appears
- ✅ Regenerate button appears

---

#### 3.4 Copy Code to Clipboard
1. Click "Kopiér Kode" button
2. Check button text changes

**Expected:**
- ✅ Button text: "Kopieret!" (for 2 seconds)
- ✅ Code copied to clipboard
- ✅ Button reverts to "Kopiér Kode"

---

### ✅ Test 4: UI - Claim Child (Onboarding)

#### 4.1 Navigate to Onboarding
1. Log out Guardian #1
2. Sign up as Guardian #2 (new account)
3. Auto-redirect to `/onboarding`

**Expected:** `/onboarding` page with 3 cards

---

#### 4.2 Select Forældre-Kode Option
1. Click "Forældre-Kode" card (3rd card, accent color)
2. Form appears

**Expected:**
- ✅ Input field for code
- ✅ "Tilknyt" button
- ✅ Back button to choice screen

---

#### 4.3 Enter Invalid Code
1. Type: "INVALID1"
2. Click "Tilknyt" button

**Expected:**
- ✅ Error message: "Koden er ugyldig eller allerede brugt"
- ✅ Input remains (for retry)

---

#### 4.4 Enter Valid Code
1. Type code from Guardian #1 (e.g., "ABC12XYZ")
2. Click "Tilknyt" button

**Expected:**
- ✅ Success animation
- ✅ Child name displayed
- ✅ "Fortsæt til Dashboard" button
- ✅ Auto-redirect after 3 seconds

---

### ✅ Test 5: UI - Claim Child (Standalone)

#### 5.1 Navigate to Claim Child
1. Log in as Guardian #2 (existing user)
2. Click sidebar link "Tilknyt Elev" OR
3. Navigate directly to `/claim-child`

**Expected:** `/claim-child` page loads

---

#### 5.2 Claim Child Form
1. Enter code from Guardian #1
2. Click "Tilknyt Elev" button

**Expected:**
- ✅ Loading state
- ✅ Success message with child name
- ✅ Redirect to dashboard after 3 seconds

---

### ✅ Test 6: UI - My Children Page

#### 6.1 Navigate to My Children
1. Log in as Guardian #1
2. Click sidebar link "Mine Elever"

**Expected:** `/my-children` page with list of children

---

#### 6.2 View Children List
**Expected:**
- ✅ Each child card shows:
  - Name and age
  - Guardian count badge (e.g., "2/2 Forældre")
  - Invite code (if generated)
  - Code status (used/unused)
  - Generate/Regenerate button
  - Copy button (if code exists)

---

#### 6.3 Generate Code for Child
1. Find child without code
2. Click "Generer Kode" button

**Expected:**
- ✅ Code appears in card
- ✅ Copy button appears
- ✅ Button changes to "Regenerér Kode"

---

#### 6.4 Regenerate Expired Code
1. Find child with expired code
2. Click "Regenerér Kode" button

**Expected:**
- ✅ New code replaces old code
- ✅ Copy button active

---

#### 6.5 Copy Code
1. Click "Kopiér" button
2. Check button feedback

**Expected:**
- ✅ Button text: "Kopieret!"
- ✅ Code in clipboard
- ✅ Button reverts after 2 seconds

---

### ✅ Test 7: Navigation Access

#### 7.1 Desktop Sidebar (Guardian Role)
1. Log in as guardian
2. Resize window to desktop size (≥1024px)
3. Check sidebar

**Expected:**
- ✅ "Forældre" section visible
- ✅ Three links:
  - "Mine Elever"
  - "Opret Elev"
  - "Tilknyt Elev" (accent color)

---

#### 7.2 Mobile Dropdown (Guardian Role)
1. Log in as guardian
2. Resize window to mobile size (<1024px)
3. Click hamburger menu

**Expected:**
- ✅ Dropdown opens
- ✅ "Forældre" section visible
- ✅ Same three links as desktop

---

#### 7.3 Non-Guardian Role
1. Log in as admin or adult
2. Check sidebar/menu

**Expected:**
- ✅ "Forældre" section NOT visible
- ✅ Only standard navigation shown

---

#### 7.4 Dashboard Empty State
1. Log in as guardian with no classes
2. View dashboard

**Expected:**
- ✅ Three action cards visible:
  - "Opret Elev-konto"
  - "Brug Forældre-Kode"
  - "Tilmeld Klasse"

---

### ✅ Test 8: Security & Edge Cases

#### 8.1 Max Guardians Enforcement
1. Guardian #1 creates child
2. Guardian #2 claims child (1st claim)
3. Guardian #3 tries to claim same code

**Expected:**
- ✅ Guardian #3 gets error: "Maks antal forældre nået"

---

#### 8.2 Code Single-Use Enforcement
1. Guardian #2 claims code successfully
2. Guardian #3 tries to use same code

**Expected:**
- ✅ Guardian #3 gets error: "Koden er allerede brugt"

---

#### 8.3 Non-Guardian Code Generation
1. Log in as child or adult
2. Try to access `/create-child`

**Expected:**
- ✅ Access denied OR
- ✅ Redirect to dashboard OR
- ✅ Feature not visible

---

#### 8.4 Invalid Code Format
1. Navigate to `/claim-child`
2. Enter code: "123" (too short)
3. Try to submit

**Expected:**
- ✅ Input validation (max 8 chars)
- ✅ Button disabled OR error message

---

#### 8.5 Expired Code
1. Generate code as Guardian #1
2. Wait 7 days (or manually update DB)
3. Try to claim as Guardian #2

**Expected:**
- ✅ Error: "Koden er udløbet"

---

### ✅ Test 9: Cross-Browser Testing

#### 9.1 Chrome/Edge
- [ ] All pages load correctly
- [ ] Forms submit successfully
- [ ] Copy to clipboard works

#### 9.2 Firefox
- [ ] All pages load correctly
- [ ] Forms submit successfully
- [ ] Copy to clipboard works

#### 9.3 Safari
- [ ] All pages load correctly
- [ ] Forms submit successfully
- [ ] Copy to clipboard works

#### 9.4 Mobile Safari (iOS)
- [ ] Navigation accessible
- [ ] Forms submit successfully
- [ ] Copy to clipboard works

#### 9.5 Chrome Mobile (Android)
- [ ] Navigation accessible
- [ ] Forms submit successfully
- [ ] Copy to clipboard works

---

### ✅ Test 10: Responsive Design

#### 10.1 Desktop (1920x1080)
- [ ] Sidebar visible
- [ ] Cards display in grid
- [ ] Text readable
- [ ] No horizontal scroll

#### 10.2 Tablet (768x1024)
- [ ] Sidebar hidden
- [ ] Hamburger menu works
- [ ] Cards stack properly
- [ ] Touch targets ≥44px

#### 10.3 Mobile (375x667)
- [ ] All content fits
- [ ] Forms usable
- [ ] Buttons tappable
- [ ] Text readable

---

## 🔍 Integration Tests

### Integration 1: Full Guardian #1 Flow
```
1. Log in as Guardian #1
2. Navigate to /create-child
3. Fill form and create child
4. Generate invite code
5. Copy code
6. Navigate to /my-children
7. Verify child appears with code
```

**Expected:** ✅ All steps complete without errors

---

### Integration 2: Full Guardian #2 Flow (New)
```
1. Sign up as Guardian #2
2. Auto-redirect to /onboarding
3. Click "Forældre-Kode" card
4. Enter code from Guardian #1
5. Success → Dashboard
6. Verify child's classes visible
```

**Expected:** ✅ All steps complete without errors

---

### Integration 3: Full Guardian #2 Flow (Existing)
```
1. Log in as Guardian #2 (existing)
2. Click "Tilknyt Elev" in sidebar
3. Navigate to /claim-child
4. Enter code from Guardian #1
5. Success → Dashboard
6. Verify child's classes visible
```

**Expected:** ✅ All steps complete without errors

---

### Integration 4: Multi-Child Management
```
1. Log in as Guardian #1
2. Create Child A
3. Generate code for Child A
4. Create Child B
5. Generate code for Child B
6. Navigate to /my-children
7. Verify both children listed
8. Copy both codes
```

**Expected:** ✅ All steps complete without errors

---

## 📊 Performance Tests

### Performance 1: Page Load Times
| Page | Target | Acceptable |
|------|--------|-----------|
| /create-child | <1s | <2s |
| /claim-child | <1s | <2s |
| /my-children | <1.5s | <3s |

### Performance 2: API Response Times
| Endpoint | Target | Acceptable |
|----------|--------|-----------|
| generate-invite | <500ms | <1s |
| claim-invite | <1s | <2s |
| my-children | <500ms | <1s |

### Performance 3: Code Generation
- **Target:** <300ms
- **Acceptable:** <500ms

---

## 🐛 Bug Report Template

If you find a bug during testing:

```markdown
### Bug Report

**Test:** [Test number/name]
**Browser:** [Chrome/Firefox/Safari]
**Device:** [Desktop/Mobile]

**Steps to Reproduce:**
1. 
2. 
3. 

**Expected Result:**


**Actual Result:**


**Screenshots:**
[Attach if applicable]

**Console Errors:**
[Copy from browser console]

**Priority:** [High/Medium/Low]
```

---

## ✅ Sign-Off Checklist

### Before Production Deployment
- [ ] All database tests pass
- [ ] All API tests pass
- [ ] All UI tests pass
- [ ] All navigation tests pass
- [ ] All security tests pass
- [ ] Cross-browser tests pass
- [ ] Responsive design tests pass
- [ ] Integration tests pass
- [ ] Performance tests pass
- [ ] Documentation complete
- [ ] Team demo completed
- [ ] Stakeholder approval

---

## 🎉 Testing Complete!

Once all tests pass:
1. ✅ Mark this guide as complete
2. ✅ Document any bugs found
3. ✅ Create bug fix tickets
4. ✅ Re-test after fixes
5. ✅ Deploy to production

**Total Test Cases:** 50+
**Estimated Testing Time:** 2-3 hours
**Required Testers:** 2 (Guardian #1 + Guardian #2 roles)

---

## 📞 Support

If you encounter issues during testing:
1. Check browser console for errors
2. Check Supabase logs
3. Review GUARDIAN_SYSTEM_COMPLETE.md
4. Contact development team
