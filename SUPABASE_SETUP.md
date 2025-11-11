# Supabase Setup Guide

## ✅ Environment Files Created

The following environment files have been created with your Supabase credentials:

### Web App (`apps/web/.env.local`)
```env
NEXT_PUBLIC_SUPABASE_URL=https://uxdmqhgilcynzxjpbfui.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
OPENAI_API_KEY=your_openai_api_key_here
```

### Mobile App (`apps/mobile/.env`)
```env
EXPO_PUBLIC_SUPABASE_URL=https://uxdmqhgilcynzxjpbfui.supabase.co
EXPO_PUBLIC_SUPABASE_KEY=eyJhbGci...
EXPO_PUBLIC_OPENAI_API_KEY=your_openai_api_key_here
```

## 🔑 Missing Keys

You still need to add:

1. **SUPABASE_SERVICE_ROLE_KEY**: Get this from Supabase Dashboard → Settings → API → service_role key (secret)
2. **OPENAI_API_KEY**: Get this from OpenAI platform

## 📁 Supabase Client Files

### Web (Next.js)
- `apps/web/src/lib/supabase.ts` - Client-side Supabase client
- `apps/web/src/lib/supabase-server.ts` - Server-side admin client (uses service role)

### Mobile (Expo)
- `apps/mobile/utils/supabase.ts` - React Native Supabase client with AsyncStorage

## 🧪 Example Pages Created

### Web
- `apps/web/src/app/todos/page.tsx` - Example todos list page

### Mobile  
- `apps/mobile/app/todos.tsx` - Example todos screen

## 📦 Dependencies Added

### Web App
- `@supabase/supabase-js` - Supabase JavaScript client

### Mobile App
- `@supabase/supabase-js` - Supabase JavaScript client
- `@react-native-async-storage/async-storage` - Persistent storage for auth
- `react-native-url-polyfill` - URL polyfill for React Native

## 🗄️ Database Setup

### Running the Schema Migration

You have three options to set up the database:

#### Option 1: Supabase Dashboard (Recommended)

1. Go to [Supabase SQL Editor](https://supabase.com/dashboard/project/uxdmqhgilcynzxjpbfui/sql/new)
2. Copy the contents of `supabase/migrations/20241110_initial_schema.sql`
3. Paste and click **Run**
4. All tables, policies, and triggers will be created

#### Option 2: Supabase CLI

```bash
npm install -g supabase
supabase login
supabase link --project-ref uxdmqhgilcynzxjpbfui
supabase db push
```

#### Option 3: psql Command Line

```bash
psql postgresql://postgres:[PASSWORD]@db.uxdmqhgilcynzxjpbfui.supabase.co:5432/postgres \
  < supabase/migrations/20241110_initial_schema.sql
```

### Database Schema

The complete schema includes:
- ✅ **profiles** - User profiles (child/guardian/adult roles)
- ✅ **schools** & **classes** - School and class organization
- ✅ **class_members** - Class membership
- ✅ **rooms** & **messages** - Chat functionality
- ✅ **reports** & **moderation_events** - Moderation system
- ✅ **guardian_links** - Parent-child relationships
- ✅ **push_tokens** - Push notification support
- ✅ **RLS policies** - Row-level security enabled
- ✅ **Triggers** - Automatic class_id denormalization

See `supabase/README.md` for detailed documentation.

### Generate TypeScript Types

After running migrations, generate types:

```bash
npx supabase gen types typescript --project-id uxdmqhgilcynzxjpbfui > packages/types/src/database.types.ts
```

### Create a Test Table (Optional)

Create a simple `todos` table for testing:

```sql
CREATE TABLE todos (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;

-- Allow public read access (for testing)
CREATE POLICY "Allow public read access"
  ON todos FOR SELECT
  TO public
  USING (true);

-- Allow authenticated users to insert
CREATE POLICY "Allow authenticated insert"
  ON todos FOR INSERT
  TO authenticated
  WITH CHECK (true);
```

## 🚀 Testing the Integration

### Web App
1. Start the dev server: `cd apps/web && npm run dev`
2. Visit: `http://localhost:3000/todos`

### Mobile App
1. Start Expo: `cd apps/mobile && npm run dev`
2. Navigate to the "Todos" screen

## 🔒 Security Best Practices

1. **Never commit `.env` files** - They're already in `.gitignore`
2. **Service role key** - Only use on server-side (API routes, server components)
3. **Anon key** - Safe to use on client-side, protected by Row Level Security (RLS)
4. **Enable RLS** - Always enable and configure RLS policies on your tables

## 📚 Usage Examples

### Client-side (Web)
```typescript
import { supabase } from '@/lib/supabase';

const { data, error } = await supabase
  .from('todos')
  .select('*');
```

### Server-side (Web - API Route or Server Component)
```typescript
import { supabaseAdmin } from '@/lib/supabase-server';

const { data, error } = await supabaseAdmin
  .from('todos')
  .select('*');
```

### Mobile
```typescript
import { supabase } from '../utils/supabase';

const { data, error } = await supabase
  .from('todos')
  .select('*');
```

## 🌍 Region

Your Supabase project is configured for EU region (eu-west-1), which is optimal for Danish/European users.

## 📖 Documentation

- [Supabase Docs](https://supabase.com/docs)
- [Supabase + Next.js](https://supabase.com/docs/guides/getting-started/tutorials/with-nextjs)
- [Supabase + React Native](https://supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native)
