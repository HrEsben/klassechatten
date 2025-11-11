# Supabase Database Schema

This directory contains SQL migrations for the KlasseChatten database schema.

## Running Migrations

### Option 1: Supabase Dashboard (Easiest)

1. Go to your Supabase project: https://supabase.com/dashboard/project/uxdmqhgilcynzxjpbfui
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `20241110_initial_schema.sql`
4. Click **Run** to execute the migration
5. Optionally run `20241110_sample_data.sql` for test data

### Option 2: Supabase CLI

If you have the Supabase CLI installed:

```bash
# Install Supabase CLI (if not installed)
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref uxdmqhgilcynzxjpbfui

# Apply migrations
supabase db push
```

### Option 3: Manual SQL Execution

Connect to your Supabase PostgreSQL database and run:

```bash
psql postgresql://postgres:[YOUR-PASSWORD]@db.uxdmqhgilcynzxjpbfui.supabase.co:5432/postgres < supabase/migrations/20241110_initial_schema.sql
```

## Schema Overview

### Core Tables

- **profiles** - User profiles extending auth.users
- **schools** - School information
- **classes** - Class/grade information with invite codes
- **class_members** - Junction table for class membership
- **rooms** - Chat rooms within classes
- **messages** - Chat messages with threading support

### Moderation

- **reports** - User-submitted reports
- **moderation_events** - AI/manual moderation events

### Relationships

- **guardian_links** - Parent-child relationships
- **push_tokens** - Push notification tokens

## Security

All tables have Row Level Security (RLS) enabled with policies for:
- Users can view their own data
- Class members can view data in their classes
- Adults/teachers have moderation access
- Guardians can view their children's data

## Triggers

- **set_message_class_id** - Automatically denormalizes class_id on message insert for better query performance

## Testing

After running the migrations:

1. Create test users through Supabase Auth
2. Run the sample data migration (update UUIDs first)
3. Test the API endpoints in your apps

## TypeScript Types

Generate TypeScript types from your schema:

```bash
npx supabase gen types typescript --project-id uxdmqhgilcynzxjpbfui > packages/types/src/database.types.ts
```

Or use the Supabase CLI:

```bash
supabase gen types typescript --linked > packages/types/src/database.types.ts
```
