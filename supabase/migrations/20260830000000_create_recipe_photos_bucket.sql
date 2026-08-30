insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'recipe-photos',
  'recipe-photos',
  false,
  5242880,
  array['image/webp']
);

create policy "Users can read their own recipe photos"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'recipe-photos'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "Users can upload their own recipe photos"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'recipe-photos'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
  and array_length(storage.foldername(name), 1) = 2
  and storage.extension(name) = 'webp'
);

create policy "Users can delete their own recipe photos"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'recipe-photos'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);
