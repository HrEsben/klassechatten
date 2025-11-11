# Deploying Edge Functions to Supabase

This guide walks you through deploying the `create_message` Edge Function with OpenAI moderation.

## Prerequisites

✅ Supabase project created (uxdmqhgilcynzxjpbfui)  
✅ OpenAI API key available  
✅ Database schema deployed

## Step 1: Install Supabase CLI

```bash
npm install -g supabase
```

Verify installation:
```bash
supabase --version
```

## Step 2: Login to Supabase

```bash
supabase login
```

This will open your browser to authenticate.

## Step 3: Link Your Project

```bash
cd /Users/esbenpro/Documents/KlasseChatten
supabase link --project-ref uxdmqhgilcynzxjpbfui
```

Enter your database password when prompted.

## Step 4: Set Environment Variables

The Edge Function needs the OpenAI API key. Set it as a secret:

```bash
supabase secrets set OPENAI_API_KEY=your_openai_api_key_here
```

Verify secrets:
```bash
supabase secrets list
```

## Step 5: Deploy the Function

Deploy the `create_message` function:

```bash
supabase functions deploy create_message
```

You should see output like:
```
Deploying create_message (project: uxdmqhgilcynzxjpbfui)
✓ Function deployed successfully!
```

## Step 6: Test the Function

### Get Your Anon Key

From your `.env.local`:
```
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
```

### Test with curl

```bash
curl -i --location --request POST \
  'https://uxdmqhgilcynzxjpbfui.supabase.co/functions/v1/create_message' \
  --header 'Authorization: Bearer YOUR_ANON_KEY_HERE' \
  --header 'Content-Type: application/json' \
  --data '{
    "room_id": "test-room-uuid",
    "body": "Hello, this is a test message"
  }'
```

## Step 7: Update Client Code

The hooks are already created for you:

**Web:** `apps/web/src/hooks/useSendMessage.ts`  
**Mobile:** `apps/mobile/hooks/useSendMessage.ts`

### Example Usage (Web)

```typescript
'use client';

import { useSendMessage } from '@/hooks/useSendMessage';

export default function ChatComponent({ roomId }: { roomId: string }) {
  const { sendMessage, sending } = useSendMessage();
  const [message, setMessage] = useState('');

  const handleSend = async () => {
    const result = await sendMessage(roomId, message);
    
    if (result.status === 'blocked') {
      alert('Message was blocked due to inappropriate content');
    } else if (result.status === 'flag' && result.suggested) {
      const useSuggestion = confirm(
        `Consider using: "${result.suggested}"`
      );
      if (useSuggestion) {
        await sendMessage(roomId, result.suggested);
      }
    }
    
    if (result.status !== 'block') {
      setMessage(''); // Clear input
    }
  };

  return (
    <div>
      <input 
        value={message} 
        onChange={(e) => setMessage(e.target.value)}
        disabled={sending}
      />
      <button onClick={handleSend} disabled={sending}>
        {sending ? 'Sending...' : 'Send'}
      </button>
    </div>
  );
}
```

### Example Usage (Mobile)

```typescript
import { useSendMessage } from '../hooks/useSendMessage';

export default function ChatScreen({ roomId }: { roomId: string }) {
  const { sendMessage, sending } = useSendMessage();
  const [message, setMessage] = useState('');

  const handleSend = async () => {
    // useSendMessage hook handles alerts automatically
    const result = await sendMessage(roomId, message);
    
    if (result.status !== 'block') {
      setMessage(''); // Clear input
    }
  };

  return (
    <View>
      <TextInput 
        value={message} 
        onChangeText={setMessage}
        editable={!sending}
      />
      <Button 
        title={sending ? 'Sending...' : 'Send'} 
        onPress={handleSend}
        disabled={sending}
      />
    </View>
  );
}
```

## Monitoring

### View Function Logs

```bash
supabase functions logs create_message
```

Or view in the Supabase Dashboard:
https://supabase.com/dashboard/project/uxdmqhgilcynzxjpbfui/functions/create_message/logs

### View Moderation Events

Query the database:
```sql
SELECT * FROM moderation_events 
ORDER BY created_at DESC 
LIMIT 10;
```

## Troubleshooting

### Function not found
- Make sure you deployed: `supabase functions deploy create_message`
- Check function name matches exactly

### Authentication errors
- Verify JWT token is passed in Authorization header
- Check user is authenticated before calling

### OpenAI errors
- Verify API key is set: `supabase secrets list`
- Check OpenAI API quota/limits

### Database errors
- Ensure schema is deployed
- Check RLS policies allow message insertion

## Cost Estimates

- **Moderation API**: FREE (omni-moderation-latest)
- **GPT-4o-mini**: ~$0.00015 per request (only for flagged messages)
- **Edge Function invocations**: FREE (500K/month on Pro plan)

Estimated cost for 10,000 messages/day with 10% flag rate:
- Daily: ~$0.15
- Monthly: ~$4.50

## Next Steps

1. ✅ Deploy function
2. ✅ Test with curl
3. ✅ Integrate in web/mobile apps
4. ✅ Monitor moderation events
5. Build teacher moderation dashboard
6. Set up real-time subscriptions for new messages
7. Add push notifications for flagged content

## Additional Resources

- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
- [OpenAI Moderation API](https://platform.openai.com/docs/guides/moderation)
- [Deno Deploy Docs](https://deno.com/deploy/docs)
