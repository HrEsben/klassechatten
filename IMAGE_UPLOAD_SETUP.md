# Image Upload Feature - Setup Guide

## Overview
This feature adds image upload capability to the chat, with:
- ✅ Camera capture (mobile)
- ✅ Gallery/file picker (web + mobile)  
- ✅ AI image moderation via OpenAI `omni-moderation-latest`
- ✅ Supabase Storage for hosting images
- ✅ Real-time image display in chat

## 1. Database Migration

Run this SQL in Supabase SQL Editor:

```sql
-- Add image_url column to messages table
alter table messages add column if not exists image_url text;

-- Create storage bucket for chat images
insert into storage.buckets (id, name, public)
values ('chat-images', 'chat-images', true)
on conflict (id) do nothing;

-- Storage policies: Allow authenticated users to upload
create policy "Authenticated users can upload images"
on storage.objects for insert
to authenticated
with check (bucket_id = 'chat-images');

-- Allow public read access to images
create policy "Public can view images"
on storage.objects for select
to public
using (bucket_id = 'chat-images');

-- Allow users to delete their own images
create policy "Users can delete own images"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'chat-images' 
  and auth.uid()::text = (storage.foldername(name))[1]
);
```

Or use the migration file:
```bash
# The migration is already created at:
# supabase/migrations/20241110_add_image_support.sql
```

## 2. Deploy Updated Edge Function

The Edge Function now supports image moderation:

```bash
cd supabase/functions
supabase functions deploy create_message
```

**What changed:**
- Accepts `image_url` parameter
- Passes image URL to OpenAI Moderation API
- Supports text-only, image-only, or text+image messages
- Same moderation pipeline (block/flag/allow)

## 3. Install Mobile Dependencies

```bash
cd apps/mobile
npx expo install expo-image-picker
```

## 4. Test the Feature

### Web:
1. Open chat room
2. Click 📷 button
3. Select image from file system
4. See preview with × remove button
5. Add optional text message
6. Click "Send"
7. Image uploads → moderates → displays in chat

### Mobile:
1. Open chat room
2. Click 📷 button (prompts for Camera or Library)
3. Take photo or select from gallery
4. See preview
5. Add optional text
6. Send
7. Image displays in chat with moderation

## Features

### Image Upload Flow
```
User selects image
  ↓
Upload to Supabase Storage (chat-images bucket)
  ↓
Get public URL
  ↓
Send URL to Edge Function with optional text
  ↓
OpenAI Moderation (omni-moderation-latest)
  ↓
Block/Flag/Allow → Insert message with image_url
  ↓
Real-time broadcast to all users
```

### Moderation
- **Free**: OpenAI `omni-moderation-latest` model
- **Multimodal**: Moderates both text and images
- **Same thresholds**: School-appropriate (strict on sexual/minors, hate, violence)
- **Categories**: Detects inappropriate content in images (nudity, violence, etc.)

### Storage Structure
```
chat-images/
  {user_id}/
    {timestamp}.jpg
    {timestamp}.png
```

Benefits:
- User-scoped folders for easier management
- Unique filenames prevent collisions
- Easy cleanup (delete by user_id)

### Security
- ✅ Only authenticated users can upload
- ✅ Public read access (images in public chat)
- ✅ Users can only delete their own images
- ✅ RLS policies enforce permissions
- ✅ AI moderation before display

## API Changes

### useSendMessage Hook (Web + Mobile)

**Before:**
```typescript
const { sendMessage, sending } = useSendMessage();
await sendMessage(roomId, 'Hello');
```

**After:**
```typescript
const { sendMessage, uploadImage, sending, uploading } = useSendMessage();

// Text only
await sendMessage(roomId, 'Hello');

// Image only
const imageUrl = await uploadImage(file);
await sendMessage(roomId, undefined, imageUrl);

// Text + Image
const imageUrl = await uploadImage(file);
await sendMessage(roomId, 'Check this out!', imageUrl);
```

**Mobile-specific:**
```typescript
const { sendMessage, pickImage, uploadImage, sending, uploading } = useSendMessage();

// Pick from camera or library
const uri = await pickImage('camera'); // or 'library'
const imageUrl = await uploadImage(uri);
await sendMessage(roomId, 'From my camera!', imageUrl);
```

### Edge Function

**Before:**
```json
{
  "room_id": "123",
  "body": "Hello",
  "reply_to": null
}
```

**After:**
```json
{
  "room_id": "123",
  "body": "Hello",  // Optional if image_url provided
  "image_url": "https://...", // Optional if body provided
  "reply_to": null
}
```

**Response** (unchanged):
```json
{
  "status": "allow" | "flag" | "block",
  "message_id": 123,
  "suggested": "..." // if flagged
}
```

## UI Updates

### Web
- 📷 button to left of text input
- Image preview with × remove button
- "Uploader..." → "Sender..." states
- Images display inline in messages
- Text optional when sending images

### Mobile  
- 📷 button opens ActionSheet: "Camera" or "Library"
- Image preview with remove button
- Same upload/send states
- Images display with React Native Image component

## Performance Considerations

### Image Optimization
**Current**: No resize/compression (uses full resolution)

**Future improvements:**
- Resize images before upload (max 1920x1920)
- Compress to ~70% quality
- Convert HEIC/HEIF to JPEG on mobile
- Lazy load images in chat (pagination)

### Storage Costs
- Supabase Free tier: 1GB storage
- Estimate: ~100-200 full-res images per GB
- With compression: ~1000+ images per GB

**Monitoring:**
```sql
-- Check storage usage
select sum(pg_column_size(image_url)) as total_bytes
from messages
where image_url is not null;
```

## Troubleshooting

### Images not uploading (web)
- Check browser console for errors
- Verify Supabase Storage bucket exists
- Check storage policies in Supabase Dashboard
- Ensure CORS is configured for storage

### Images not uploading (mobile)
- Check Expo permissions: Camera + MediaLibrary
- iOS: Add to Info.plist:
  ```xml
  <key>NSCameraUsageDescription</key>
  <string>Take photos to share in chat</string>
  <key>NSPhotoLibraryUsageDescription</key>
  <string>Select photos to share in chat</string>
  ```
- Android: Permissions handled automatically by Expo

### Images moderated incorrectly
- Check Edge Function logs: `supabase functions logs create_message`
- Review moderation scores in logs
- Adjust thresholds in Edge Function if needed
- Report false positives to OpenAI

### Images not displaying
- Check if image_url is public (test in browser)
- Verify storage "Public can view images" policy exists
- Check CORS: Supabase storage should allow requests from app domain

## Next Steps

Potential enhancements:
- [ ] Multiple image uploads per message
- [ ] Image compression before upload
- [ ] Image gallery view (lightbox)
- [ ] Delete sent images
- [ ] Edit message to remove/replace image
- [ ] Video/GIF support
- [ ] File attachments (PDF, etc.)
- [ ] OCR for text in images (accessibility)

## Cost Analysis

### Current Implementation
- ✅ **OpenAI Moderation**: FREE (omni-moderation-latest)
- ✅ **Supabase Storage**: 1GB free, $0.021/GB after
- ✅ **Bandwidth**: Free on Supabase Free tier

### Estimated Costs (100 users, 50 images/day)
- Storage: ~5GB/month = $0.10/month
- Bandwidth: ~50GB/month = FREE (within limits)
- Moderation: FREE

**Very affordable for school deployment!**
