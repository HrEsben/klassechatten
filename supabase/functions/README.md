# Supabase Edge Functions

This directory contains Deno-based Edge Functions for KlasseChatten.

## Available Functions

### `create_message`

Creates a new message with real-time OpenAI moderation.

**Flow:**
1. Validates room access and lock status
2. Runs OpenAI moderation (FREE - `omni-moderation-latest`)
3. For hard violations → **blocks** message
4. For soft flags → creates message but **flags** for review + suggests rewrite
5. For clean messages → creates message normally
6. Returns status + suggestion to client

**Endpoint:**
```
POST https://uxdmqhgilcynzxjpbfui.supabase.co/functions/v1/create_message
```

**Request:**
```json
{
  "room_id": "uuid",
  "body": "message text",
  "reply_to": 123 // optional
}
```

**Response:**
```json
{
  "status": "allow" | "flag" | "block",
  "message_id": 123,
  "created_at": "timestamp",
  "suggested": "rewritten text if flagged",
  "warning": "message if flagged"
}
```

## Deploying Functions

### Prerequisites

1. Install Supabase CLI:
```bash
npm install -g supabase
```

2. Login:
```bash
supabase login
```

3. Link to your project:
```bash
supabase link --project-ref uxdmqhgilcynzxjpbfui
```

### Set Environment Variables

Set the OpenAI API key for the Edge Function:

```bash
supabase secrets set OPENAI_API_KEY=your_openai_api_key_here
```

### Deploy Functions

Deploy all functions:
```bash
supabase functions deploy
```

Or deploy a specific function:
```bash
supabase functions deploy create_message
```

### Test Locally

Run functions locally for testing:
```bash
supabase functions serve create_message --env-file .env.local
```

Then test with curl:
```bash
curl -i --location --request POST 'http://localhost:54321/functions/v1/create_message' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"room_id":"your-room-uuid","body":"Test message"}'
```

## Client Usage

### Web (Next.js)

```typescript
import { supabase } from '@/lib/supabase';

async function sendMessage(roomId: string, body: string) {
  const { data: { session } } = await supabase.auth.getSession();
  
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/create_message`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session?.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ room_id: roomId, body }),
    }
  );

  const result = await response.json();
  
  if (result.status === 'blocked') {
    alert('Message blocked: inappropriate content');
  } else if (result.status === 'flag') {
    // Show suggestion to user
    if (result.suggested) {
      confirm(`Consider rewording to: "${result.suggested}"`);
    }
  }
  
  return result;
}
```

### Mobile (Expo)

```typescript
import { supabase } from '../utils/supabase';

async function sendMessage(roomId: string, body: string) {
  const { data: { session } } = await supabase.auth.getSession();
  
  const response = await fetch(
    `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/create_message`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session?.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ room_id: roomId, body }),
    }
  );

  const result = await response.json();
  
  if (result.status === 'blocked') {
    Alert.alert('Message Blocked', 'This message contains inappropriate content');
  } else if (result.status === 'flag' && result.suggested) {
    Alert.alert(
      'Suggestion',
      `Consider rewording to: "${result.suggested}"`,
      [
        { text: 'Use Original', style: 'cancel' },
        { text: 'Use Suggestion', onPress: () => sendMessage(roomId, result.suggested) }
      ]
    );
  }
  
  return result;
}
```

## Moderation Levels

### Block (Hard)
- Sexual content involving minors
- Hate speech with threats
- Graphic violence
- Message is NOT inserted
- Moderation event logged

### Flag (Soft)
- Mild inappropriate language
- Potential bullying
- Questionable content
- Message IS inserted
- Moderation event created for teacher review
- Suggestion provided via GPT-4o-mini

### Allow (Clean)
- No issues detected
- Message inserted normally
- No moderation event

## Cost Optimization

- **Moderation**: FREE (omni-moderation-latest)
- **Suggestion**: ~$0.0001 per message (gpt-4o-mini only when flagged)
- **Average cost**: < $0.01 per 1000 messages (assuming 10% flag rate)

## Security

- ✅ Uses user's JWT token for authentication
- ✅ Respects RLS policies
- ✅ Validates room access before insertion
- ✅ Checks room lock status
- ✅ Logs all moderation events
- ✅ CORS enabled for web/mobile clients
