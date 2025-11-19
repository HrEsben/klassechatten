# Guardian Email Invitations - Setup Guide

## Overview

Email-based guardian invitations replace manual code sharing with automated email workflows. When Guardian #1 creates a child account, they can send an email invitation to Guardian #2, who receives a link to automatically establish the relationship.

## ✅ Completed Setup

### 1. **Email Service** (`/apps/web/src/lib/email.ts`)
   - Resend integration with branded HTML template
   - Berlin Edgy design matching KlasseChatten aesthetic
   - Proper error handling and logging

### 2. **Database Migration** (`/supabase/migrations/20241113_guardian_email_invitations.sql`)
   - `guardian_invitations` table with token-based system
   - RLS policies for guardian access control
   - Functions:
     - `generate_invite_token()` - Creates unique 32-char tokens
     - `create_guardian_invitation()` - Creates invitation and cancels old ones
     - `accept_guardian_invitation()` - Validates and creates guardian_link
     - `expire_old_invitations()` - Cleanup function for cron

### 3. **API Routes**
   - `/api/guardians/send-invite` - Sends email invitation
   - `/api/guardians/accept-invite` - Processes invitation acceptance

### 4. **UI Pages**
   - `/accept-invite` - Landing page for invitation links
   - `/create-child` - Updated with email invite option

## 🔧 Configuration Required

### Step 1: Get Resend API Key

1. Go to https://resend.com/api-keys
2. Create a new API key with "Sending access"
3. Copy the key (starts with `re_`)

### Step 2: Configure Domain (Optional but Recommended)

**For production**, configure your domain in Resend:

1. Go to https://resend.com/domains
2. Add your domain (e.g., `klassechatten.dk`)
3. Add the provided DNS records to your domain
4. Verify the domain

**For development**, use the default `onboarding@resend.dev` which allows sending to your own email.

### Step 3: Update Environment Variables

**Development** (`/apps/web/.env.local`):
```env
RESEND_API_KEY=re_YOUR_ACTUAL_API_KEY_HERE
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Production** (e.g., Vercel environment variables):
```env
RESEND_API_KEY=re_YOUR_PRODUCTION_API_KEY
NEXT_PUBLIC_APP_URL=https://klassechatten.dk
```

### Step 4: Update Email From Address

If you configured a custom domain, update the from address in `/apps/web/src/lib/email.ts`:

```typescript
from: 'KlasseChatten <noreply@klassechatten.dk>', // Change to your domain
```

For development, you can use:
```typescript
from: 'KlasseChatten <onboarding@resend.dev>', // Resend testing domain
```

### Step 5: Deploy Database Migration

1. **Copy migration SQL**:
   ```bash
   cat supabase/migrations/20241113_guardian_email_invitations.sql | pbcopy
   ```

2. **Run in Supabase SQL Editor**:
   - Go to https://supabase.com/dashboard/project/YOUR_PROJECT/sql
   - Paste the migration
   - Click "Run"

3. **Verify tables exist**:
   ```sql
   SELECT * FROM guardian_invitations LIMIT 1;
   ```

### Step 6: Test the System

1. **Start development server**:
   ```bash
   cd apps/web
   pnpm dev
   ```

2. **Create a child account**:
   - Log in as a guardian
   - Go to `/create-child`
   - Fill out the form
   - After creation, find "Send Email Invitation" section

3. **Send invitation**:
   - Enter a test email address
   - Click "Send Email Invitation"
   - Check the email inbox

4. **Accept invitation**:
   - Click the link in the email
   - If not logged in, create a guardian account
   - Should auto-accept and redirect to dashboard

## 📧 Email Template

The email includes:
- KlasseChatten branding with primary color accent
- Clear call-to-action button
- Invitation details (child name, inviter name)
- Security notice about 7-day expiration
- Fallback link for button issues

## 🔒 Security Features

1. **Email Verification**: Only works if recipient's account email matches invited email
2. **Expiration**: Invitations expire after 7 days
3. **Single Use**: Token invalidated after acceptance
4. **Cancellation**: New invitations cancel old pending ones
5. **RLS Policies**: Guardians can only see their own invitations

## 🎯 User Flow

### Guardian #1 (Inviter):
1. Creates child account
2. Enters Guardian #2's email address
3. Clicks "Send Email Invitation"
4. Receives confirmation

### Guardian #2 (Invitee):
1. Receives branded email
2. Clicks "Acceptér invitation" button
3. If not logged in: Creates account
4. If logged in: Auto-accepts and creates guardian_link
5. Redirected to dashboard with access to child's data

## 📊 Database Schema

```sql
guardian_invitations (
  id UUID PRIMARY KEY,
  inviter_guardian_id UUID → auth.users,
  invited_email TEXT,
  child_id UUID → auth.users,
  invite_token TEXT UNIQUE,
  status TEXT (pending/accepted/expired/cancelled),
  expires_at TIMESTAMPTZ,
  accepter_guardian_id UUID → auth.users,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```

## 🐛 Troubleshooting

### Email not sending
- Check RESEND_API_KEY is set correctly
- Verify domain is configured (or use resend.dev)
- Check console logs for Resend API errors

### Invitation not accepting
- Verify email matches exactly (case-insensitive)
- Check invitation hasn't expired
- Ensure database migration is applied

### "Function not found" error
- Run database migration in Supabase SQL Editor
- Check RPC function names match exactly

## 🚀 Production Checklist

- [ ] Resend API key configured
- [ ] Custom domain verified in Resend
- [ ] Update from address to use custom domain
- [ ] Database migration deployed
- [ ] NEXT_PUBLIC_APP_URL set to production URL
- [ ] Test end-to-end flow
- [ ] Set up cron job to run `expire_old_invitations()` daily

## 📝 Cron Job (Optional)

To automatically expire old invitations, set up a Supabase Edge Function cron:

```typescript
// supabase/functions/expire-invitations/index.ts
import { createClient } from '@supabase/supabase-js';

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { data, error } = await supabase.rpc('expire_old_invitations');
  
  return new Response(JSON.stringify({ expired: data, error }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

Schedule in `supabase/functions/_shared/cron.ts`:
```typescript
{
  name: 'expire-invitations',
  schedule: '0 0 * * *', // Daily at midnight
}
```

## 🔗 Related Documentation

- `GUARDIAN_SYSTEM_COMPLETE.md` - Full guardian system overview
- `GUARDIAN_INVITE_CODES.md` - Original code-based system (now superseded)
- `GUARDIAN_TESTING_GUIDE.md` - Test cases for guardian functionality
