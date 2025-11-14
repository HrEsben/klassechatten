# KlasseChatten Design System
**Berlin Edgy Aesthetic - Cross-Platform Design Guide**

A comprehensive design system for consistent visual language across web (DaisyUI/Tailwind CSS) and mobile (React Native) platforms.

---

## 🎨 Core Design Principles

### Visual Identity: Berlin Edgy
- **Minimalist** - Clean, uncluttered interfaces
- **Bold** - Strong typography and high contrast
- **Urban** - Modern, street-inspired aesthetic
- **Sharp** - No rounded corners, crisp edges
- **High Contrast** - Clear visual hierarchy

### Universal Rules
1. ✅ **All text in Danish** - User-facing content must be in Danish
2. ✅ **No emojis** - Use SVG icons, text, or visual elements instead
3. ✅ **Sharp corners** - No rounded corners (except mobile bottom sheets: 12px top corners only)
4. ✅ **Consistent spacing** - Use 4/8/12/16/24px scale
5. ✅ **Semantic HTML** - Proper tags and ARIA labels for accessibility

---

## 🎨 Color Palette (Funkyfred Theme)

### Brand Colors

| Color | OKLCH | Hex | Usage | Web Class | Mobile Value |
|-------|-------|-----|-------|-----------|--------------|
| **Primary (Pink)** | `oklch(71.9% 0.357 330.759)` | `#ff3fa4` | CTAs, accents, active states | `bg-primary` | `#ff3fa4` |
| **Secondary (Orange)** | `oklch(68% 0.224 48.25)` | `#ffb347` | Highlights, secondary actions | `bg-secondary` | `#ffb347` |
| **Accent (Green)** | `oklch(75% 0.264 122.962)` | `#7fdb8f` | Success states, positive feedback | `bg-accent` | `#7fdb8f` |
| **Info (Blue)** | `oklch(60.72% 0.227 252.05)` | `#6b9bd1` | Informational messages | `bg-info` | `#6b9bd1` |
| **Warning (Yellow)** | `oklch(80% 0.212 100.5)` | `#ffd966` | Warning states | `bg-warning` | `#ffd966` |
| **Error (Red)** | `oklch(64.84% 0.293 29.349)` | `#e86b6b` | Error states, destructive actions | `bg-error` | `#e86b6b` |
| **Neutral (Purple)** | `oklch(42% 0.199 265.638)` | `#6247f5` | Neutral elements | `bg-neutral` | `#6247f5` |

### Background Colors

| Color | Lightness | Hex | Usage | Web Class | Mobile Value |
|-------|-----------|-----|-------|-----------|--------------|
| **Base 100** | 98% | `#f8f8f8` | Main backgrounds | `bg-base-100` | `#f8f8f8` |
| **Base 200** | 95% | `#e5e5e5` | Elevated surfaces | `bg-base-200` | `#e5e5e5` |
| **Base 300** | 91% | `#d8d8d8` | Page backgrounds | `bg-base-300` | `#d8d8d8` |
| **Base Content** | 20% | `#1a1a1a` | Text/foreground | `text-base-content` | `#1a1a1a` |

### Opacity Scale

| Opacity | Use Case | Web Class Example | Mobile Value |
|---------|----------|-------------------|--------------|
| 10% | Subtle borders | `border-base-content/10` | `rgba(26, 26, 26, 0.1)` |
| 20% | Light backgrounds | `bg-primary/20` | `rgba(255, 63, 164, 0.2)` |
| 30% | Inactive accents | `bg-primary/30` | `rgba(255, 63, 164, 0.3)` |
| 40% | Muted text | `text-base-content/40` | `rgba(26, 26, 26, 0.4)` |
| 50% | Secondary text | `text-base-content/50` | `rgba(26, 26, 26, 0.5)` |
| 60% | Tertiary text | `text-base-content/60` | `rgba(26, 26, 26, 0.6)` |

---

## 📝 Typography System

### Font Families
- **Web**: System fonts via Tailwind defaults
- **Mobile**: System fonts (`System` on iOS, `Roboto` on Android)

### Font Weights

| Weight | Value | Usage | Web Class | Mobile Value |
|--------|-------|-------|-----------|--------------|
| **Black** | 900 | Headings, strong emphasis | `font-black` | `'900'` |
| **Bold** | 700 | Labels, button text | `font-bold` | `'700'` |
| **Medium** | 500 | Body text | `font-medium` | `'500'` |

### Text Styles

#### Headings

**Page Title (H1)**
```tsx
// Web
<h1 className="text-3xl font-black uppercase tracking-tight text-base-content">
  Titel Tekst
</h1>
<div className="h-1 w-24 bg-primary mt-2"></div>

// Mobile
<Text style={{
  fontSize: 28,
  fontWeight: '900',
  textTransform: 'uppercase',
  letterSpacing: -0.5,
  color: '#1a1a1a'
}}>
  Titel Tekst
</Text>
<View style={{
  height: 4,
  width: 96,
  backgroundColor: '#ff3fa4',
  marginTop: 8
}} />
```

**Section Title (H2)**
```tsx
// Web
<h2 className="text-xl font-black uppercase tracking-tight text-base-content">
  Sektion Titel
</h2>

// Mobile
<Text style={{
  fontSize: 20,
  fontWeight: '900',
  textTransform: 'uppercase',
  letterSpacing: -0.5,
  color: '#1a1a1a'
}}>
  Sektion Titel
</Text>
```

**Card Title (H3)**
```tsx
// Web
<h3 className="text-xl font-black uppercase tracking-tight text-base-content mb-1">
  Kort Titel
</h3>

// Mobile
<Text style={{
  fontSize: 20,
  fontWeight: '900',
  textTransform: 'uppercase',
  letterSpacing: -0.5,
  color: '#1a1a1a',
  marginBottom: 4
}}>
  Kort Titel
</Text>
```

#### Body Text

**Primary Text**
```tsx
// Web
<p className="text-sm font-medium text-base-content">Primary text</p>

// Mobile
<Text style={{
  fontSize: 14,
  fontWeight: '500',
  color: '#1a1a1a'
}}>Primary text</Text>
```

**Secondary Text**
```tsx
// Web
<p className="text-xs text-base-content/60">Secondary text</p>

// Mobile
<Text style={{
  fontSize: 12,
  color: 'rgba(26, 26, 26, 0.6)'
}}>Secondary text</Text>
```

**Label Text (Small Caps Style)**
```tsx
// Web
<span className="text-xs font-bold uppercase tracking-widest text-base-content/50">
  Label Text
</span>

// Mobile
<Text style={{
  fontSize: 12,
  fontWeight: '700',
  textTransform: 'uppercase',
  letterSpacing: 2,
  color: 'rgba(26, 26, 26, 0.5)'
}}>
  Label Text
</Text>
```

**Monospace/Technical Text**
```tsx
// Web
<code className="text-xs font-mono uppercase tracking-wider text-base-content/80">
  Technical Info
</code>

// Mobile
<Text style={{
  fontSize: 12,
  fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  textTransform: 'uppercase',
  letterSpacing: 1,
  color: 'rgba(26, 26, 26, 0.8)'
}}>
  Technical Info
</Text>
```

### Letter Spacing

| Style | Value | Usage | Web Class | Mobile Value |
|-------|-------|-------|-----------|--------------|
| **Tight** | -0.5px | Large headings | `tracking-tight` | `-0.5` |
| **Wider** | 1px | Descriptions | `tracking-wider` | `1` |
| **Widest** | 2px | Small caps labels | `tracking-widest` | `2` |

---

## 📏 Spacing System

### Scale
All spacing follows a 4px base unit: **4, 8, 12, 16, 24, 32, 48**

### Spacing Values

| Name | Value | Usage | Web Class | Mobile Value |
|------|-------|-------|-----------|--------------|
| **xs** | 4px | Tight spacing (title/subtitle) | `mb-1` | `4` |
| **sm** | 8px | Small gaps, accent bars | `mb-2`, `gap-2` | `8` |
| **md** | 12px | Medium spacing, icon gaps | `mb-3` | `12` |
| **lg** | 16px | Standard spacing, form elements | `mb-4`, `gap-4`, `p-4` | `16` |
| **xl** | 24px | Large gaps, sections | `gap-6`, `pb-6` | `24` |
| **2xl** | 32px | Extra large spacing | `p-8` | `32` |
| **3xl** | 48px | Major sections | `px-12` | `48` |

### Container Spacing

**Web**
```tsx
<div className="w-full max-w-7xl mx-auto px-12">
  {/* Page content */}
</div>
```

**Mobile**
```tsx
<View style={{
  width: '100%',
  maxWidth: 1280,
  marginHorizontal: 'auto',
  paddingHorizontal: 48
}}>
  {/* Page content */}
</View>
```

---

## 🔲 Border System

### Border Widths

| Width | Usage | Web Class | Mobile Value |
|-------|-------|-----------|--------------|
| **Standard** | All borders | `border-2` | `2` |
| **Dividers** | Section dividers | `border-b-2`, `border-t-2` | `borderBottomWidth: 2` |
| **Accent bars** | Vertical bars | `w-1`, `w-2` | `width: 4` or `8` |

### Border Colors

| State | Web Class | Mobile Value |
|-------|-----------|--------------|
| **Default** | `border-base-content/10` | `rgba(26, 26, 26, 0.1)` |
| **Hover** | `hover:border-primary/50` | `rgba(255, 63, 164, 0.5)` |
| **Active** | `border-primary` | `#ff3fa4` |

### Border Radius Rules
- **Web**: NO rounded corners (always sharp)
- **Mobile**: 
  - Standard components: NO rounded corners
  - Bottom sheets only: `borderTopLeftRadius: 12, borderTopRightRadius: 12`

---

## 🎴 Component Patterns

### Buttons

#### Primary Button

**Web**
```tsx
<button className="btn bg-base-content text-base-100 hover:bg-primary hover:text-primary-content">
  Button Text
</button>
```

**Mobile**
```tsx
<TouchableOpacity style={{
  backgroundColor: '#1a1a1a',
  paddingVertical: 12,
  paddingHorizontal: 16,
  borderWidth: 0
}}>
  <Text style={{
    color: '#f8f8f8',
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase'
  }}>
    Button Text
  </Text>
</TouchableOpacity>
```

#### Ghost Button

**Web**
```tsx
<button className="btn btn-ghost">
  Button Text
</button>
```

**Mobile**
```tsx
<TouchableOpacity style={{
  backgroundColor: 'transparent',
  paddingVertical: 12,
  paddingHorizontal: 16
}}>
  <Text style={{
    color: '#1a1a1a',
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase'
  }}>
    Button Text
  </Text>
</TouchableOpacity>
```

#### Button Sizes

| Size | Height | Padding | Web Class | Mobile Height |
|------|--------|---------|-----------|---------------|
| **xs** | 24px | 8px/12px | `btn-xs` | `24` |
| **sm** | 32px | 10px/14px | `btn-sm` | `32` |
| **md** | 48px | 12px/16px | `btn` | `48` |
| **lg** | 56px | 14px/20px | `btn-lg` | `56` |

### Cards

#### Navigation/Action Card

**Web**
```tsx
<button className="relative group text-left bg-base-100 border-2 border-base-content/10 hover:border-primary/50 transition-all duration-200 overflow-hidden">
  {/* Vertical accent bar */}
  <div className="absolute left-0 top-0 w-1 h-full bg-primary/30 group-hover:bg-primary group-hover:w-2 transition-all duration-200"></div>
  
  <div className="px-8 py-6 pl-10">
    {/* Icon */}
    <svg className="w-8 h-8 stroke-current text-primary" strokeWidth={2}>
      {/* icon paths */}
    </svg>
    
    {/* Title */}
    <h3 className="text-xl font-black uppercase tracking-tight text-base-content mb-1">
      Card Title
    </h3>
    
    {/* Description */}
    <p className="text-xs font-mono uppercase tracking-wider text-base-content/50">
      Description text
    </p>
  </div>
</button>
```

**Mobile**
```tsx
<TouchableOpacity style={{
  backgroundColor: '#f8f8f8',
  borderWidth: 2,
  borderColor: 'rgba(26, 26, 26, 0.1)',
  overflow: 'hidden',
  position: 'relative'
}}>
  {/* Vertical accent bar */}
  <View style={{
    position: 'absolute',
    left: 0,
    top: 0,
    width: 4,
    height: '100%',
    backgroundColor: 'rgba(255, 63, 164, 0.3)'
  }} />
  
  <View style={{
    paddingHorizontal: 32,
    paddingVertical: 24,
    paddingLeft: 40
  }}>
    {/* Icon 32x32 */}
    <Svg width={32} height={32} stroke="#ff3fa4" strokeWidth={2}>
      {/* icon paths */}
    </Svg>
    
    {/* Title */}
    <Text style={{
      fontSize: 20,
      fontWeight: '900',
      textTransform: 'uppercase',
      letterSpacing: -0.5,
      color: '#1a1a1a',
      marginBottom: 4,
      marginTop: 12
    }}>
      Card Title
    </Text>
    
    {/* Description */}
    <Text style={{
      fontSize: 12,
      fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
      textTransform: 'uppercase',
      letterSpacing: 1,
      color: 'rgba(26, 26, 26, 0.5)'
    }}>
      Description text
    </Text>
  </View>
</TouchableOpacity>
```

#### Content Card

**Web**
```tsx
<div className="bg-base-100 border-2 border-base-content/10 shadow-lg">
  {/* Header */}
  <div className="p-6 border-b-2 border-base-content/10">
    <h2 className="text-xl font-black uppercase tracking-tight text-base-content">
      Card Header
    </h2>
  </div>
  
  {/* Content */}
  <div className="p-6">
    {/* Content here */}
  </div>
</div>
```

**Mobile**
```tsx
<View style={{
  backgroundColor: '#f8f8f8',
  borderWidth: 2,
  borderColor: 'rgba(26, 26, 26, 0.1)',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.15,
  shadowRadius: 8,
  elevation: 4
}}>
  {/* Header */}
  <View style={{
    padding: 24,
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(26, 26, 26, 0.1)'
  }}>
    <Text style={{
      fontSize: 20,
      fontWeight: '900',
      textTransform: 'uppercase',
      letterSpacing: -0.5,
      color: '#1a1a1a'
    }}>
      Card Header
    </Text>
  </View>
  
  {/* Content */}
  <View style={{ padding: 24 }}>
    {/* Content here */}
  </View>
</View>
```

### Badges

| Role | Color | Web Class | Mobile BG |
|------|-------|-----------|-----------|
| Admin | Primary | `badge-primary` | `#ff3fa4` |
| Teacher | Accent | `badge-accent` | `#7fdb8f` |
| Student | Info | `badge-info` | `#6b9bd1` |
| Parent | Secondary | `badge-secondary` | `#ffb347` |

**Web**
```tsx
<span className="badge badge-primary badge-sm font-bold uppercase">
  Admin
</span>
```

**Mobile**
```tsx
<View style={{
  backgroundColor: '#ff3fa4',
  paddingVertical: 4,
  paddingHorizontal: 8,
  borderRadius: 0
}}>
  <Text style={{
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase'
  }}>
    Admin
  </Text>
</View>
```

---

## 🎨 Icons

### Icon Sizes

| Size | Pixels | Usage | Web Class | Mobile Value |
|------|--------|-------|-----------|--------------|
| **sm** | 16px | Small inline icons | `w-4 h-4` | `16` |
| **md** | 24px | Standard icons | `w-6 h-6` | `24` |
| **lg** | 32px | Card icons | `w-8 h-8` | `32` |
| **xl** | 64px | Placeholder icons | `w-16 h-16` | `64` |

### Icon Properties (SVG)

**Required Attributes:**
- `strokeLinecap="square"` (NOT "round")
- `strokeLinejoin="miter"` (NOT "round")
- `strokeWidth={2}` (consistent line weight)
- `fill="none"` (for outline icons)

**Web Example**
```tsx
<svg className="w-6 h-6 stroke-current text-primary" strokeWidth={2} fill="none" viewBox="0 0 24 24">
  <path strokeLinecap="square" strokeLinejoin="miter" d="M6 18L18 6M6 6l12 12"/>
</svg>
```

**Mobile Example**
```tsx
<Svg width={24} height={24} stroke="#ff3fa4" strokeWidth={2} fill="none" viewBox="0 0 24 24">
  <Path strokeLinecap="square" strokeLinejoin="miter" d="M6 18L18 6M6 6l12 12"/>
</Svg>
```

---

## ⚡ Animations & Transitions

### Standard Transitions

**Web**
- Hover effects: `transition-all duration-200`
- Color changes: `transition-colors`
- Keep under 300ms
- No bouncing/elastic easing

**Mobile**
- Use `Animated` API for smooth transitions
- Duration: 200ms
- Easing: `Easing.out(Easing.ease)`
- No spring animations

### Loading States

**Web**
```tsx
<div className="flex justify-center items-center min-h-[60vh]">
  <div className="flex flex-col items-center gap-4">
    <span className="loading loading-ball loading-lg text-primary"></span>
    <p className="text-base-content/60 font-medium">Indlæser...</p>
  </div>
</div>
```

**Mobile**
```tsx
<View style={{
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
  minHeight: 400
}}>
  <ActivityIndicator size="large" color="#ff3fa4" />
  <Text style={{
    marginTop: 16,
    color: 'rgba(26, 26, 26, 0.6)',
    fontWeight: '500'
  }}>
    Indlæser...
  </Text>
</View>
```

---

## 📱 Mobile-Specific Patterns

### Bottom Sheet Modal

```tsx
<Modal
  visible={visible}
  transparent
  animationType="slide"
  onRequestClose={onClose}
>
  {/* Backdrop */}
  <TouchableOpacity
    style={{
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end'
    }}
    activeOpacity={1}
    onPress={onClose}
  >
    {/* Sheet */}
    <View style={{
      backgroundColor: '#ffffff',
      borderTopLeftRadius: 12,  // ONLY exception to no-rounded-corners rule
      borderTopRightRadius: 12,
      padding: 16,
      paddingBottom: Platform.OS === 'ios' ? 34 : 24,
      width: '100%',
      maxHeight: '60%',
      minHeight: 250,
      borderWidth: 2,
      borderColor: 'rgba(26, 26, 26, 0.1)',
      borderBottomWidth: 0
    }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        paddingBottom: 12,
        borderBottomWidth: 2,
        borderBottomColor: 'rgba(26, 26, 26, 0.1)'
      }}>
        <Text style={{
          fontSize: 14,
          fontWeight: '900',
          textTransform: 'uppercase',
          letterSpacing: -0.5,
          color: '#1a1a1a'
        }}>
          Title
        </Text>
        <TouchableOpacity onPress={onClose}>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#666' }}>✕</Text>
        </TouchableOpacity>
      </View>
      
      {/* Content */}
      <ScrollView>
        {/* Content here */}
      </ScrollView>
    </View>
  </TouchableOpacity>
</Modal>
```

### Safe Area Handling

```tsx
import { SafeAreaView } from 'react-native-safe-area-context';

<SafeAreaView style={{ flex: 1, backgroundColor: '#f8f8f8' }}>
  {/* Content */}
</SafeAreaView>
```

---

## 🎯 Component Checklist

Before creating ANY new component (web or mobile), verify:

### ✅ Design Principles
- [ ] All corners are sharp (no rounded corners except mobile bottom sheets)
- [ ] All borders use 2px width
- [ ] Typography uses approved font weights (900/700/500)
- [ ] Text is uppercase for headings/labels
- [ ] Icons use square linecap and miter linejoin
- [ ] Colors from approved palette (primary/secondary/accent/etc)
- [ ] Spacing follows 4/8/12/16/24px scale
- [ ] No emojis in code
- [ ] All text is in Danish

### ✅ Accessibility
- [ ] Semantic HTML tags (web) or proper component hierarchy (mobile)
- [ ] ARIA labels for interactive elements
- [ ] Sufficient color contrast (WCAG AA minimum)
- [ ] Touch targets minimum 44x44px (mobile)
- [ ] Keyboard navigation support (web)

### ✅ Responsive Design
- [ ] Web: Responsive breakpoints using `sm:`, `md:`, `lg:` prefixes
- [ ] Mobile: Adapts to different screen sizes (iPhone SE to Pro Max)
- [ ] Safe area support on mobile (notches, home indicators)
- [ ] Orientation support (portrait/landscape)

### ✅ Performance
- [ ] No complex animations (keep under 300ms)
- [ ] Loading states for async operations
- [ ] Optimized images (appropriate sizes)
- [ ] No unnecessary re-renders

---

## 📦 Shared Theme Package (Future)

To maximize code reuse, consider creating `packages/theme`:

```typescript
// packages/theme/src/colors.ts
export const colors = {
  primary: '#ff3fa4',
  secondary: '#ffb347',
  accent: '#7fdb8f',
  info: '#6b9bd1',
  warning: '#ffd966',
  error: '#e86b6b',
  neutral: '#6247f5',
  base100: '#f8f8f8',
  base200: '#e5e5e5',
  base300: '#d8d8d8',
  baseContent: '#1a1a1a',
};

// packages/theme/src/spacing.ts
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

// packages/theme/src/typography.ts
export const typography = {
  weights: {
    black: '900',
    bold: '700',
    medium: '500',
  },
  sizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 20,
    xl: 28,
  },
};
```

---

## 🔗 Resources

### Web (DaisyUI)
- [DaisyUI Documentation](https://daisyui.com)
- [Tailwind CSS v4 Documentation](https://tailwindcss.com)
- Design system: `.github/instructions/daisyui.instructions.md`

### Mobile (React Native)
- [React Native Documentation](https://reactnative.dev)
- [React Native StyleSheet](https://reactnative.dev/docs/stylesheet)
- [Expo Documentation](https://docs.expo.dev)

### Design Inspiration
- **Berlin street design** - Bold typography, high contrast
- **Brutalist web design** - Raw, unpolished aesthetics
- **Swiss design** - Clean, functional layouts

---

## 📝 Quick Reference Card

### Web → Mobile Translation

| Concept | Web (DaisyUI/Tailwind) | Mobile (React Native) |
|---------|------------------------|------------------------|
| **Container** | `<div>` | `<View>` |
| **Text** | `<p>`, `<span>` | `<Text>` |
| **Button** | `<button>` | `<TouchableOpacity>` |
| **Input** | `<input>` | `<TextInput>` |
| **Image** | `<img>` | `<Image>` |
| **List** | `<ul>`, `<li>` | `<FlatList>` |
| **Padding** | `p-4` | `padding: 16` |
| **Margin** | `mb-4` | `marginBottom: 16` |
| **Border** | `border-2` | `borderWidth: 2` |
| **Color** | `bg-primary` | `backgroundColor: '#ff3fa4'` |
| **Font Weight** | `font-black` | `fontWeight: '900'` |
| **Text Transform** | `uppercase` | `textTransform: 'uppercase'` |

---

**Last Updated:** November 14, 2025  
**Version:** 1.0.0  
**Maintained by:** KlasseChatten Team
