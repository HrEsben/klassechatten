# Quick Start: Emoji Reactions

## Deploy to Supabase

```bash
# 1. Run the migration
cd /Users/esbenpro/Documents/KlasseChatten
supabase db push

# Or manually in Supabase Dashboard SQL Editor:
# Run: supabase/migrations/20241114_add_reactions.sql
```

## Test Locally

### Web
```bash
cd apps/web
npm run dev
# Open http://localhost:3000
# Navigate to a chat room
# Click "+" under any message to add reaction
```

### Mobile
```bash
cd apps/mobile
npm start
# Scan QR code with Expo Go
# Navigate to chat room
# Tap "+" under any message
```

## Verify It Works

1. **Add a reaction**: Click/tap "+" button, select emoji
2. **See reaction**: Should appear immediately with count "1"
3. **Open second device**: Same reaction should appear
4. **Toggle off**: Click/tap your reaction to remove it
5. **Multiple users**: Have another user add same emoji, count should increase

## Available Emojis

👍 ❤️ 😂 😮 😢 😡 🎉 🔥 ⭐ ✅ 👏 🙏 💯 🤔 😊 😎 🤩 😴 🎨 📚 ✏️ 🏆 💪 🙌

## Component Usage

### Web Example
```tsx
import { useReactions } from '@/hooks/useReactions';
import ReactionsDisplay from '@/components/ReactionsDisplay';

function MyMessage({ messageId }: { messageId: number }) {
  const { reactionGroups, toggleReaction } = useReactions({
    messageId,
    currentUserId: user?.id,
  });

  return (
    <div>
      <p>Message content</p>
      <ReactionsDisplay
        reactions={reactionGroups}
        onToggle={toggleReaction}
      />
    </div>
  );
}
```

### Mobile Example
```tsx
import { useReactions } from '../hooks/useReactions';
import ReactionsDisplay from './ReactionsDisplay';

function MyMessage({ messageId }: { messageId: number }) {
  const { reactionGroups, toggleReaction } = useReactions({
    messageId,
    currentUserId: user?.id,
  });

  return (
    <View>
      <Text>Message content</Text>
      <ReactionsDisplay
        reactions={reactionGroups}
        onToggle={toggleReaction}
      />
    </View>
  );
}
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Reactions not saving | Check database migration ran successfully |
| Real-time not working | Verify `reactions` table in realtime publication |
| Permission errors | User must be class member to add reactions |
| Duplicates | Unique constraint should prevent - check DB |

## File Locations

### Web
- Hook: `apps/web/src/hooks/useReactions.ts`
- Picker: `apps/web/src/components/ReactionPicker.tsx`
- Display: `apps/web/src/components/ReactionsDisplay.tsx`

### Mobile
- Hook: `apps/mobile/hooks/useReactions.ts`
- Picker: `apps/mobile/components/ReactionPicker.tsx`
- Display: `apps/mobile/components/ReactionsDisplay.tsx`

### Database
- Schema: `supabase/migrations/20241114_add_reactions.sql`

## Quick SQL Checks

```sql
-- Check table exists
SELECT * FROM reactions LIMIT 5;

-- Check realtime enabled
SELECT * FROM pg_publication_tables WHERE tablename = 'reactions';

-- Check policies
SELECT * FROM pg_policies WHERE tablename = 'reactions';

-- See all reactions
SELECT r.*, p.display_name, m.body 
FROM reactions r
JOIN profiles p ON r.user_id = p.user_id
JOIN messages m ON r.message_id = m.id
ORDER BY r.created_at DESC
LIMIT 10;
```

---

**Next Steps**: Run migration → Test locally → Deploy to production
