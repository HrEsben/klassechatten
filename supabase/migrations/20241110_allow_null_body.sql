-- Allow messages to have null body (for image-only messages)
alter table messages alter column body drop not null;

-- Add check constraint to ensure at least body or image_url is present
alter table messages add constraint messages_content_check 
  check (body is not null or image_url is not null);
