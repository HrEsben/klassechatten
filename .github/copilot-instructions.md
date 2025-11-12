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

### Design Guidelines
- **No Emojis**: Never use emojis in the codebase. Use icons (SVG), text, or visual elements instead
- **Clean Interface**: Maintain a professional, clean interface without decorative emojis
- **Accessibility**: Use semantic HTML and proper ARIA labels instead of emojis for meaning

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

- [ ] Typing indicators
- [ ] Read receipts
- [ ] Message reactions (emoji)
- [ ] Image/file uploads
- [ ] Push notifications
- [ ] Teacher moderation dashboard
- [ ] Analytics dashboard
- [ ] User presence (online/offline)
- [ ] Thread support
- [ ] Search messages
- [ ] Dark mode
