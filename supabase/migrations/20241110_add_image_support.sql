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

-- Update messages RLS to include image_url
-- (The existing RLS policies already cover this column)
