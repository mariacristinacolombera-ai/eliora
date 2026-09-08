insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('project-patterns', 'project-patterns', false, 5242880, array['application/pdf']);

create policy "Users can read their own project patterns"
on storage.objects for select to authenticated
using (bucket_id = 'project-patterns' and (storage.foldername(name))[1] = (select auth.uid()::text));

create policy "Users can upload PDFs to their own projects"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'project-patterns'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
  and array_length(storage.foldername(name), 1) = 2
  and (storage.foldername(name))[2] <> ''
  and name !~ E'\\\\'
  and storage.filename(name) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.pdf$'
  and exists (
    select 1 from public.projects p
    where p.id = (storage.foldername(name))[2] and p.user_id = (select auth.uid())
  )
);

-- No UPDATE policy: replacements have a new immutable object key.
-- No Project existence check here: cleanup also runs after Project deletion.
create policy "Users can delete their own project patterns"
on storage.objects for delete to authenticated
using (bucket_id = 'project-patterns' and (storage.foldername(name))[1] = (select auth.uid()::text));
