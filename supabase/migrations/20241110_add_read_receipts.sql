-- Add read receipts table to track when users read messages
-- This allows showing "read by" indicators in chat

create table public.read_receipts (
  id uuid primary key default gen_random_uuid(),
  message_id bigint references public.messages(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  read_at timestamptz default now(),
  unique(message_id, user_id)
);

-- Index for performance
create index on public.read_receipts (message_id, user_id);
create index on public.read_receipts (user_id, read_at);

-- RLS policies
alter table public.read_receipts enable row level security;

-- Users can see read receipts for messages in their classes
create policy "Users can view read receipts in their classes"
  on public.read_receipts for select
  using (
    exists (
      select 1 from public.messages m
      join public.class_members cm on cm.class_id = m.class_id
      where m.id = read_receipts.message_id
        and cm.user_id = auth.uid()
    )
  );

-- Users can insert their own read receipts
create policy "Users can insert their own read receipts"
  on public.read_receipts for insert
  with check (user_id = auth.uid());

-- Users can update their own read receipts
create policy "Users can update their own read receipts"
  on public.read_receipts for update
  using (user_id = auth.uid());

-- Enable realtime for read receipts
alter publication supabase_realtime add table read_receipts;
