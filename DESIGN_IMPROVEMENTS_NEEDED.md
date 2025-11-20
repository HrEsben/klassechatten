# Design Improvements Needed

This document tracks pages and components that need design improvements to fully comply with the Berlin Edgy design system and provide better UX.

## Pages Needing Design Improvements

### Accept Invite Page (`/accept-invite`)
**Status**: Needs Improvement
**Priority**: Medium
**URL**: https://klassechatten.vercel.app/accept-invite

**Current Issues:**
1. **Rounded corners on icons** - Lucide icons (CheckCircle, XCircle, Mail, Clock) use rounded linecaps
2. **Inconsistent icon style** - Should use square linecaps and miter linejoins (Berlin Edgy)
3. **Mixed icon sources** - Uses Lucide instead of consistent SVG icons with strokeLinecap="square"
4. **Could use FormInput component** - If any input fields are added in future

**Design Compliance Issues:**
- ❌ Icons don't follow Berlin Edgy aesthetic (rounded vs square)
- ✅ Border-2 usage is correct
- ✅ Sharp corners on cards (no rounded-*)
- ✅ Color palette usage is correct
- ✅ Typography follows system (font-black, uppercase, tracking-tight)
- ✅ Spacing scale is correct

**Recommended Fixes:**
1. Replace Lucide icons with custom SVG icons using `strokeLinecap="square"` and `strokeLinejoin="miter"`
2. Ensure all icons follow the same 32x32px or 64x64px size standard
3. Use `strokeWidth={2}` consistently across all icons
4. Consider using shared icon components if we create a berlin-edgy icon library

**Example Berlin Edgy Icon:**
```tsx
<svg className="w-16 h-16 stroke-current text-success mx-auto" strokeWidth={2} fill="none" viewBox="0 0 24 24">
  <path strokeLinecap="square" strokeLinejoin="miter" d="M5 13l4 4L19 7" />
</svg>
```

**Impact:**
- Low functionality impact (icons work fine)
- Medium visual consistency impact (breaks Berlin Edgy aesthetic)
- Easy fix (replace 4 icon imports with custom SVG)

---

## Design System Compliance Checklist

When auditing a page for design compliance, check:

- [ ] **No rounded corners** except circles (mask-circle for avatars)
- [ ] **Border-2 everywhere** - no border-1 or border
- [ ] **Square icon caps** - strokeLinecap="square", strokeLinejoin="miter"
- [ ] **Consistent strokeWidth** - always 2px for icons
- [ ] **Typography** - font-black for headings, uppercase, tracking-tight
- [ ] **Spacing scale** - 4/8/12/16/24px (p-1/2/3/4/6, gap-1/2/3/4/6)
- [ ] **Color palette** - primary/secondary/accent/base-* colors only
- [ ] **Accent bars** - w-1 or w-2 vertical bars on cards with hover states
- [ ] **Underline accents** - h-1 w-24 bars under headings
- [ ] **Shadow system** - only shadow-lg, no custom shadows
- [ ] **Button consistency** - btn classes, no custom button styles
- [ ] **Form consistency** - use FormInput component where possible

---

## Future Pages to Audit

These pages have not yet been audited for design compliance:

- [ ] `/profile` - User profile page
- [ ] `/my-children` - Guardian children list
- [ ] `/child/[id]` - Individual child view
- [ ] `/class/[id]/settings` - Class settings page
- [ ] `/admin/users` - Admin users management
- [ ] Main chat interface - Room messages and member lists

---

## Completed Design Audits

### Phase 5: Design System Consistency (COMPLETED)
- ✅ All pages across Phases 1-4 audited
- ✅ Fixed 3 rounded corner violations (CachedClassRoomBrowser, CachedChatRoom, ReactionPicker)
- ✅ Improved mobile responsiveness across auth pages
- ✅ Verified border-2 consistency throughout codebase
- ✅ All 266 tests passing (no breakage)

---

## Notes

**Berlin Edgy Philosophy:**
- Sharp edges and strong contrast create visual hierarchy
- No softness - everything is precise and intentional
- Icons should feel technical and geometric, not friendly
- Borders define space clearly - always 2px solid
- Accent elements (bars, underlines) add visual interest without curves

**When to Break the Rules:**
- Circles are allowed (avatars, status indicators, circular buttons)
- Mask utilities can create non-rectangular shapes when needed
- But never use rounded-* utilities for corners

**Icon Sources:**
- Prefer custom SVG with square linecaps over icon libraries
- If using icon libraries, fork and modify to square linecaps
- Lucide icons work but need modification (rounded by default)
- Consider creating a shared berlin-edgy icon component library
