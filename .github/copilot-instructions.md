# KlasseChatten - Skolechat med AI-moderation

Et sikkert, modereret chat-system til danske skoler med real-time beskeder og AI-moderation.

## 🏗️ Arkitektur (Monorepo)

```
/apps
  /web          → Next.js 16 (forældre/lærere dashboard, moderation)
  /mobile       → Expo React Native (iOS/Android app til børn)

/packages
  /types        → Delte TypeScript typer (User, Message, ChatRoom)
  /validation   → Zod schemas til API validering
  /lib          → Delt logik (auth, formatters, feature flags)

/supabase
  /migrations   → Database schema (profiles, classes, rooms, messages)
  /functions    → Edge Functions (create_message med AI-moderation)
```

## 🎯 Nøglefunktionalitet

### 1. Real-time Chat System
- **Kanal per rum**: `realtime:room.{room_id}`
- **Backfill**: Henter sidste 50 beskeder ved opstart
- **Live updates**: INSERT/UPDATE/DELETE events via Supabase Realtime
- **Auto-scroll**: Nye beskeder vises øjeblikkeligt

**Hooks:**
- `useRoomMessages()` - Håndterer backfill + realtime subscription
- `useSendMessage()` - Sender beskeder via Edge Function

### 2. AI-Moderation Pipeline
- **Gateway**: Edge Function `create_message` (ikke direkte DB insert)
- **FREE Moderation**: OpenAI `omni-moderation-latest`
- **Bloker hårdt**: Sexual/minors, hate/threatening → ingen insert
- **Flag blødt**: Mild issues → insert + flag til lærer + forslag via GPT-4o-mini
- **Allow rent**: Normale beskeder sendes direkte

**Flow:**
```
Send besked → Edge Function
  ↓
OpenAI Moderation (FREE)
  ↓
Hård? → Blokér (log event)
Blød? → Insert + Flag + Forslag (GPT-4o-mini)
Ren?  → Insert
  ↓
Realtime broadcast til alle klienter
```

### 3. Database (Supabase PostgreSQL)
- **profiles** - Brugere (child/guardian/adult roller)
- **schools** + **classes** - Skoler og klasser
- **class_members** - Medlemskab med roller
- **rooms** - Chat-rum per klasse
- **messages** - Beskeder med threading
- **moderation_events** - AI/manuel moderation log
- **reports** - Brugerrapporter
- **guardian_links** - Forælder-barn relationer
- **push_tokens** - Push notifikationer

**Sikkerhed:**
- RLS (Row Level Security) på alle tabeller
- Policies: medlemmer ser kun deres klasser
- Service role key kun på server-side

### 4. Supabase Integration
**Klient-side:**
- `apps/web/src/lib/supabase.ts` - Web client (anon key)
- `apps/mobile/utils/supabase.ts` - Mobile client (AsyncStorage)

**Server-side:**
- `apps/web/src/lib/supabase-server.ts` - Admin client (service role)

**Edge Functions:**
- `supabase/functions/create_message/` - Moderation + insert

## 📋 Development Setup Status

### ✅ Completed
- [x] Monorepo struktur (Turborepo + npm workspaces)
- [x] Next.js 16 web app med App Router
- [x] Expo mobile app med expo-router
- [x] Shared packages (types, validation, lib)
- [x] Database schema (10+ tabeller + RLS policies)
- [x] Edge Function med OpenAI moderation
- [x] Real-time chat hooks (web + mobile)
- [x] Chat UI komponenter (web + mobile)
- [x] Supabase integration (client + server)
- [x] Environment files (.env.local konfigureret)

### ⚠️ Pending Actions
- [ ] Fix npm cache issue (se `INSTALLATION.md`)
- [ ] Install dependencies: `npm install --legacy-peer-deps`
- [ ] Deploy database schema til Supabase
- [ ] Enable realtime på messages tabel
- [ ] Deploy Edge Function: `supabase functions deploy create_message`
- [ ] Test chat flow end-to-end

## 🚀 Quick Start (Efter dependency install)

### 1. Database Setup
```bash
# Kør SQL i Supabase Dashboard:
# 1. Åbn supabase/migrations/20241110_initial_schema.sql
# 2. Kopier indhold til SQL Editor
# 3. Kør migration

# Enable realtime:
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
```

### 2. Deploy Edge Function
```bash
npm install -g supabase
supabase login
supabase link --project-ref uxdmqhgilcynzxjpbfui
supabase secrets set OPENAI_API_KEY=sk-proj-...
supabase functions deploy create_message
```

### 3. Start Apps
```bash
# Web (port 3000)
cd apps/web && npm run dev

# Mobile
cd apps/mobile && npm run dev
```

## 🔑 Environment Variables

**Web** (`apps/web/.env.local`):
```
NEXT_PUBLIC_SUPABASE_URL=https://uxdmqhgilcynzxjpbfui.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
OPENAI_API_KEY=sk-proj-...
```

**Mobile** (`apps/mobile/.env`):
```
EXPO_PUBLIC_SUPABASE_URL=https://uxdmqhgilcynzxjpbfui.supabase.co
EXPO_PUBLIC_SUPABASE_KEY=eyJhbGci...
EXPO_PUBLIC_OPENAI_API_KEY=sk-proj-...
```

## 📚 Documentation

- **`README.md`** - Projekt oversigt og setup
- **`INSTALLATION.md`** - Dependency installation troubleshooting
- **`SUPABASE_SETUP.md`** - Database setup og SQL migration guide
- **`EDGE_FUNCTION_DEPLOYMENT.md`** - Deploy moderation function
- **`REALTIME_CHAT.md`** - Real-time arkitektur og performance

## 💡 Development Guidelines

### Code Organization
- **Shared logic** → `/packages/lib`
- **Shared types** → `/packages/types`
- **API validation** → `/packages/validation`
- **UI components** → Per app (`apps/web/src/components`, `apps/mobile/components`)

### Database Access
- **Client-side**: Use `supabase.from()` - RLS enforced
- **Server-side**: Use `supabaseAdmin.from()` - Bypass RLS
- **Never** insert messages directly - always via Edge Function

### Moderation
- **All messages** går gennem `create_message` Edge Function
- **Blokerede beskeder** logges men indsættes IKKE
- **Flaggede beskeder** indsættes men markeres til review

### Real-time
- **Subscribe** til `realtime:room.{room_id}`
- **Backfill** sidste N beskeder ved opstart
- **Cleanup** unsubscribe ved unmount

### Security
- ✅ RLS enabled på alle tabeller
- ✅ JWT validation på Edge Functions
- ✅ Service role kun på server
- ✅ CORS konfigureret korrekt
- ✅ Environment secrets ikke i git

### Design System - Berlin Edgy Aesthetic

#### Core Principles
- **Language**: All user-facing text must be in Danish
- **Visual Style**: Modern Berlin Edgy - minimalist, bold, urban, sharp edges, strong contrast
- **No Emojis**: Never use emojis. Use SVG icons, text, or visual elements instead
- **No Rounded Corners**: All components use sharp corners (`rounded-none` or no border-radius)
- **Accessibility**: Use semantic HTML and proper ARIA labels

#### Color Palette (funkyfred theme)
```css
Primary (Pink):     oklch(71.9% 0.357 330.759)  → #ff3fa4 → Hot pink for CTAs and accents
Secondary (Orange): oklch(68% 0.224 48.25)      → #ffb347 → Warm orange for highlights
Accent (Green):     oklch(75% 0.264 122.962)    → #7fdb8f → Fresh green for success states
Info (Blue):        oklch(60.72% 0.227 252.05)  → #6b9bd1 → Cool blue for information
Warning (Yellow):   oklch(80% 0.212 100.5)      → #ffd966 → Bright yellow for warnings
Error (Red):        oklch(64.84% 0.293 29.349)  → #e86b6b → Coral red for errors
Neutral (Purple):   oklch(42% 0.199 265.638)    → #6247f5 → Deep purple for neutral elements
```

**Background Colors:**
- `bg-base-100` → Main backgrounds (98% lightness)
- `bg-base-200` → Elevated surfaces (95% lightness)
- `bg-base-300` → Page backgrounds (91% lightness)
- `bg-base-content` → Text/foreground (20% lightness)

**Opacity Modifiers:**
- `/10` → 10% opacity (subtle borders: `border-base-content/10`)
- `/20` → 20% opacity (light backgrounds)
- `/30` → 30% opacity (inactive accents: `bg-primary/30`)
- `/40` → 40% opacity (muted text)
- `/50` → 50% opacity (secondary text: `text-base-content/50`)
- `/60` → 60% opacity (tertiary text)

#### Typography System

**Headings:**
```tsx
// Page Title (H1)
<h1 className="text-3xl font-black uppercase tracking-tight text-base-content">
  Title Text
</h1>
<div className="h-1 w-24 bg-primary mt-2"></div> // Accent underline

// Section Title (H2)
<h2 className="text-xl font-black uppercase tracking-tight text-base-content">
  Section Title
</h2>

// Card Title (H3)
<h3 className="text-xl font-black uppercase tracking-tight text-base-content mb-1">
  Card Title
</h3>
```

**Body Text:**
```tsx
// Primary text
className="text-sm font-medium text-base-content"

// Secondary text
className="text-xs text-base-content/60"

// Label text (small caps style)
className="text-xs font-bold uppercase tracking-widest text-base-content/50"

// Monospace text (technical info)
className="text-xs font-mono uppercase tracking-wider text-base-content/80"

// Description text
className="text-xs font-mono uppercase tracking-wider text-base-content/50"
```

**Font Weights:**
- `font-black` → 900 weight (headings, emphasis)
- `font-bold` → 700 weight (labels, button text)
- `font-medium` → 500 weight (body text)

**Letter Spacing:**
- `tracking-tight` → Tight spacing for large headings
- `tracking-widest` → Very wide spacing for small caps labels
- `tracking-wider` → Wide spacing for descriptions

#### Border System

**Border Widths:**
- Standard: `border-2` (2px solid borders everywhere)
- Dividers: `border-b-2` or `border-t-2` (2px dividing lines)
- Accent bars: `w-1` or `w-2` (1px or 2px vertical accent bars)

**Border Colors:**
```tsx
// Default border
border-2 border-base-content/10

// Hover state
hover:border-primary/50

// Active/Selected state
border-primary

// Section dividers
border-b-2 border-base-content/10
```

**Never:**
- No `border` or `border-1` (always use `border-2`)
- No rounded corners (`rounded-*` classes)
- No dashed/dotted borders (always solid)

#### Card Components

**Navigation/Action Cards:**
```tsx
<button className="relative group text-left bg-base-100 border-2 border-base-content/10 hover:border-primary/50 transition-all duration-200 overflow-hidden">
  {/* Vertical accent bar */}
  <div className="absolute left-0 top-0 w-1 h-full bg-primary/30 group-hover:bg-primary group-hover:w-2 transition-all duration-200"></div>
  
  <div className="px-8 py-6 pl-10">
    {/* Icon - 32x32px (w-8 h-8), strokeWidth={2} */}
    <div className="flex items-start justify-between mb-3">
      <svg className="w-8 h-8 stroke-current text-primary" strokeWidth={2}>
        {/* icon paths with strokeLinecap="square" strokeLinejoin="miter" */}
      </svg>
    </div>
    
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

**Content Cards (Stats, Tables, etc):**
```tsx
<div className="bg-base-100 border-2 border-base-content/10 shadow-lg">
  {/* Header Section */}
  <div className="p-6 border-b-2 border-base-content/10">
    <h2 className="text-xl font-black uppercase tracking-tight text-base-content">
      Card Header
    </h2>
  </div>
  
  {/* Content Section */}
  <div className="p-6">
    {/* Content here */}
  </div>
</div>
```

**"Coming Soon" Placeholder Cards:**
```tsx
<div className="bg-base-100 border-2 border-base-content/10 shadow-lg p-12 text-center space-y-4">
  <svg className="w-16 h-16 stroke-current text-secondary mx-auto" strokeWidth={2}>
    {/* icon paths */}
  </svg>
  <h2 className="text-2xl font-black uppercase tracking-tight text-base-content">
    Kommer snart
  </h2>
  <p className="text-base-content/60">Description text</p>
</div>
```

#### Spacing System

**Container Spacing:**
```tsx
// Page wrapper
<div className="w-full max-w-7xl mx-auto px-12">

// Section spacing (vertical)
<div className="space-y-8">  // Large sections
<div className="space-y-6">  // Medium sections
<div className="space-y-4">  // Small sections

// Grid gaps
<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
```

**Component Padding:**
```tsx
// Card padding
px-8 py-6        // Standard card content
px-12 py-8       // Large content areas
p-6              // Standard padding
p-12             // Large padding (coming soon cards)
pl-10            // Left padding when accent bar present (8px padding + 2px bar space)
```

**Margin Spacing:**
```tsx
mb-1             // Tight spacing (4px) - between title and subtitle
mb-2             // Small spacing (8px) - after accent underline
mb-3             // Medium spacing (12px) - between icon and title
mb-4             // Standard spacing (16px) - between form elements
gap-2            // Small gap (8px) - icon groups
gap-4            // Standard gap (16px) - card grids
gap-6            // Large gap (24px) - header sections
```

#### Button System

**Primary Button:**
```tsx
<button className="btn bg-base-content text-base-100 hover:bg-primary hover:text-primary-content">
  Button Text
</button>
```

**Secondary Button (Ghost):**
```tsx
<button className="btn btn-ghost">
  Button Text
</button>
```

**Icon Button (Square):**
```tsx
<button className="btn btn-ghost btn-square">
  <svg className="w-6 h-6" strokeWidth={2}>...</svg>
</button>
```

**Button Sizes:**
- `btn-xs` → Extra small
- `btn-sm` → Small
- `btn` → Default
- `btn-lg` → Large

#### Icon Guidelines

**SVG Icons:**
```tsx
// Standard icon size: 24x24px (w-6 h-6)
<svg className="w-6 h-6 stroke-current" strokeWidth={2} fill="none">
  <path strokeLinecap="square" strokeLinejoin="miter" d="..."/>
</svg>

// Large icon size: 32x32px (w-8 h-8) - for cards
<svg className="w-8 h-8 stroke-current text-primary" strokeWidth={2} fill="none">
  <path strokeLinecap="square" strokeLinejoin="miter" d="..."/>
</svg>

// Extra large icon size: 64x64px (w-16 h-16) - for placeholders
<svg className="w-16 h-16 stroke-current text-secondary mx-auto" strokeWidth={2} fill="none">
  <path strokeLinecap="square" strokeLinejoin="miter" d="..."/>
</svg>
```

**Icon Properties:**
- Always use `strokeLinecap="square"` (not "round")
- Always use `strokeLinejoin="miter"` (not "round")
- Always use `strokeWidth={2}` (consistent line weight)
- Use `fill="none"` for outline icons
- Color via `text-{color}` class + `stroke-current`

#### Loading States

**Loading Spinner:**
```tsx
// Standard loading
<div className="flex justify-center items-center min-h-[60vh]">
  <div className="flex flex-col items-center gap-4">
    <span className="loading loading-ball loading-lg text-primary"></span>
    <p className="text-base-content/60 font-medium">Indlæser...</p>
  </div>
</div>
```

**Spinner Sizes:**
- `loading-xs` → Extra small (16px)
- `loading-sm` → Small (20px)
- `loading-md` → Medium (24px)
- `loading-lg` → Large (36px)
- `loading-xl` → Extra large (48px)

**Never:**
- No custom spinners
- No border animations
- No rotating divs
- Always use `loading-ball` component

#### Table System

**Table Container:**
```tsx
<div className="bg-base-100 border-2 border-base-content/10 shadow-lg">
  <div className="p-6 border-b-2 border-base-content/10">
    <h2 className="text-xl font-black uppercase tracking-tight text-base-content">
      Table Title
    </h2>
  </div>
  
  <div className="overflow-x-auto">
    <table className="table table-zebra">
      <thead>
        <tr className="border-b-2 border-base-content/10">
          <th className="text-xs font-black uppercase tracking-widest">Header</th>
        </tr>
      </thead>
      <tbody>
        <tr className="hover:bg-base-200">
          <td>Content</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>
```

#### Badge System

**Role Badges:**
```tsx
<span className="badge badge-{color} badge-sm font-bold uppercase">
  Label Text
</span>

// Badge colors by role:
// badge-primary   → Admin
// badge-accent    → Teacher (Lærer)
// badge-info      → Student (Elev)  
// badge-secondary → Parent (Forælder)
```

#### Grid Layouts

**Responsive Grids:**
```tsx
// Standard responsive grid
<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">

// Stats grid (horizontal on large screens)
<div className="stats stats-vertical lg:stats-horizontal shadow-lg w-full bg-base-100 border-2 border-base-content/10">
```

#### Page Layout Structure

**All Pages Must Include:**
1. **Header** with logo, user info, logout button
2. **Main content area** with `max-w-7xl mx-auto px-12` wrapper
3. **Footer** with copyright, geometric pattern, theme switcher

**Admin Pages:**
```tsx
import AdminLayout from '@/components/AdminLayout';

export default function AdminPage() {
  return (
    <AdminLayout>
      {/* Page content */}
    </AdminLayout>
  );
}
```

#### Accent Elements

**Underline Accent (after titles):**
```tsx
<div className="h-1 w-24 bg-primary mt-2"></div>
```

**Vertical Accent Bar (left side of cards):**
```tsx
<div className="absolute left-0 top-0 w-1 h-full bg-primary/30 group-hover:bg-primary group-hover:w-2 transition-all duration-200"></div>
```

**Geometric Footer Pattern:**
```tsx
<div className="flex gap-2">
  <div className="w-2 h-2 bg-primary"></div>
  <div className="w-2 h-2 bg-secondary"></div>
  <div className="w-2 h-2 bg-accent"></div>
</div>
```

**Vertical Divider:**
```tsx
<div className="w-px h-8 bg-base-content/10"></div>
```

#### Transitions & Animations

**Standard Transitions:**
```tsx
transition-all duration-200  // Hover effects, state changes
transition-colors           // Color-only transitions
```

**Never:**
- No slow animations (keep under 300ms)
- No bouncing/elastic easing
- No complex keyframe animations
- Keep it subtle and fast

#### Shadow System

**Card Shadows:**
```tsx
shadow-lg  // Standard card shadow (only shadow used in the system)
```

**Never:**
- No `shadow`, `shadow-sm`, `shadow-xl`, or custom shadows
- Only use `shadow-lg` for elevated cards

#### Checklist for New Components

✅ **Before Creating:**
1. All corners are sharp (no `rounded-*` classes)
2. All borders use `border-2` (never `border-1`)
3. Typography uses approved classes (font-black, uppercase, tracking)
4. Icons use square caps and miter joins
5. Colors from approved palette (primary/secondary/accent/etc)
6. Spacing follows 4/8/12/16/24px scale
7. Loading uses `loading-ball` spinner
8. No emojis anywhere in the code

✅ **Quality Checks:**
- High contrast between text and backgrounds
- Clear visual hierarchy (titles > subtitles > body)
- Generous whitespace (don't crowd elements)
- Consistent accent elements (bars, underlines)
- Proper hover states with primary color
- Mobile-responsive (grid with breakpoints)

### DaisyUI Integration
- **UI Framework**: DaisyUI v5 + Tailwind CSS v4 (web app only)
- **MCP Server**: Always use Context7 MCP server for DaisyUI-related tasks
- **Documentation**: Use `mcp_context7_get-library-docs` for DaisyUI component documentation
- **Component Library**: Use `daisyui` library ID when querying Context7
- **Best Practices**: Follow DaisyUI v5 guidelines from `.github/instructions/daisyui.instructions.md`
- **CSS Setup**: Use `@plugin "daisyui";` in CSS, no tailwind.config.js needed
- **Classes**: Prefer DaisyUI semantic classes (`btn`, `card`, `modal`) over custom CSS

### Next.js MCP Integration
- **Framework**: Next.js 16 with built-in MCP support via `/_next/mcp` endpoint
- **MCP Server**: `next-devtools-mcp` configured in `.mcp.json` for real-time development insights
- **Capabilities**: Error detection, live state queries, page metadata, development logs
- **Documentation**: Use Next.js MCP tools for framework-specific guidance and debugging
- **Development**: MCP provides real-time access to build errors, runtime state, and project structure

## 🛠️ Tech Stack

- **Frontend**: Next.js 16, React 19, Expo (React Native)
- **Backend**: Supabase (PostgreSQL + Realtime + Edge Functions)
- **AI**: OpenAI (Moderation API + GPT-4o-mini)
- **Monorepo**: Turborepo + npm workspaces
- **Language**: TypeScript (strict mode)
- **Validation**: Zod
- **Styling**: Tailwind CSS v4 + DaisyUI v5 (web), Inline styles (mobile)
- **Development**: MCP (Model Context Protocol) for real-time development insights

## 🔧 Next.js 16 Specific Rules

### CRITICAL: Always follow these Next.js 16 patterns

1. **API Route Params Must Be Awaited**
   ```typescript
   // ❌ WRONG - Next.js 15 pattern
   export async function GET(
     request: Request,
     { params }: { params: { id: string } }
   ) {
     const id = params.id;
   }

   // ✅ CORRECT - Next.js 16 pattern
   export async function GET(
     request: Request,
     { params }: { params: Promise<{ id: string }> }
   ) {
     const { id } = await params;
   }
   ```

2. **Page Component Params Must Be Awaited**
   ```typescript
   // ❌ WRONG
   export default function Page({ params }: { params: { id: string } }) {
     return <div>{params.id}</div>;
   }

   // ✅ CORRECT - use React.use() for client components
   'use client';
   import { use } from 'react';
   
   export default function Page({ params }: { params: Promise<{ id: string }> }) {
     const { id } = use(params);
     return <div>{id}</div>;
   }

   // ✅ CORRECT - await in server components
   export default async function Page({ params }: { params: Promise<{ id: string }> }) {
     const { id } = await params;
     return <div>{id}</div>;
   }
   ```

3. **SearchParams Must Be Awaited**
   ```typescript
   // ✅ CORRECT
   export default async function Page({ 
     searchParams 
   }: { 
     searchParams: Promise<{ query?: string }> 
   }) {
     const { query } = await searchParams;
   }
   ```

4. **Cookies and Headers Must Be Awaited**
   ```typescript
   import { cookies, headers } from 'next/headers';
   
   // ✅ CORRECT
   const cookieStore = await cookies();
   const headersList = await headers();
   ```

## 📊 Architecture Decisions

### Why Monorepo?
- Delt kodebase mellem web + mobile
- Type-safety på tværs af apps
- Unified deployment og versioning

### Why Edge Functions?
- Pre-insert moderation (ikke post-insert cleanup)
- Synchronous validation før broadcast
- Ingen upassende beskeder når realtime

### Why Supabase?
- Real-time out-of-the-box
- RLS for security
- PostgreSQL for kompleks data
- Edge Functions for serverless logic

### Why OpenAI Moderation?
- FREE moderation API
- High accuracy
- Danish language support via GPT-4o-mini suggestions

## 🎯 Next Features (Roadmap)

- [X] Typing indicators
- [X] Read receipts
- [X] Message reactions (emoji)
- [X] Image/file uploads
- [ ] Push notifications
- [ ] Teacher moderation dashboard
- [ ] Analytics dashboard
- [X] User presence (online/offline)
- [ ] Thread support
- [ ] Search messages
- [X] Dark mode
