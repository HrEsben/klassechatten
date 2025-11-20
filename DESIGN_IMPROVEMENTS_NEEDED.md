# Design Improvements Needed

This document tracks pages and components that need design improvements to fully comply with the Berlin Edgy design system and provide better UX.

## Pages Needing Design Improvements

### Accept Invite Page (`/accept-invite`)
**Status**: Acceptable (Deferred)
**Priority**: Low
**URL**: https://klassechatten.vercel.app/accept-invite

**Current State:**
- Uses Lucide icons (CheckCircle, XCircle, Mail, Clock) with rounded linecaps
- Not perfectly aligned with Berlin Edgy aesthetic (prefers square linecaps)
- **Decision**: Keep Lucide icons for now - custom SVG icons have proven unreliable
- **Future**: Looking for a better icon set that matches Berlin Edgy style

**Design Compliance Status:**
- ⚠️ Icons don't perfectly match Berlin Edgy aesthetic (rounded vs square) - **ACCEPTED**
- ✅ Border-2 usage is correct
- ✅ Sharp corners on cards (no rounded-*)
- ✅ Color palette usage is correct
- ✅ Typography follows system (font-black, uppercase, tracking-tight)
- ✅ Spacing scale is correct

**Reasoning:**
- Lucide icons are reliable, well-maintained, and accessible
- Custom SVG icons have been problematic in practice
- Better to have working, slightly-rounded icons than broken custom ones
- The visual difference is minor and doesn't impact user experience

**Future Considerations:**
- Search for icon libraries that offer square linecap variants
- Consider: Phosphor Icons, Tabler Icons, or other geometric icon sets
- Evaluate if any icon library offers a "sharp" or "geometric" variant
- Could potentially fork Lucide and modify stroke caps (high effort)

**Impact:**
- Visual consistency: Minor compromise (rounded vs square caps)
- Functionality: Perfect (Lucide is reliable and accessible)
- Maintenance: Low (well-maintained library)
- Decision: **Pragmatic choice - keep Lucide until better alternative found**

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
- **Current choice**: Lucide icons (pragmatic, reliable, accessible)
- **Trade-off**: Lucide uses rounded linecaps (not perfect for Berlin Edgy, but acceptable)
- **Avoid**: Custom SVG icons have proven unreliable in practice
- **Future research**: Looking for icon libraries with geometric/sharp style variants
- **Alternatives to evaluate**:
  - Phosphor Icons (has multiple weight variants)
  - Tabler Icons (geometric, might have sharp variants)
  - Remix Icon (comprehensive, check for sharp options)
  - Iconoir (minimalist, geometric aesthetic)
  
**Icon Philosophy:**
- **Pragmatism over perfection**: Working icons > broken perfect icons
- **Consistency matters more**: All icons from same library > mixed sources
- **Accessibility first**: Proper ARIA labels and semantic HTML
- **Future flexibility**: Easy to swap entire icon library if better option found
