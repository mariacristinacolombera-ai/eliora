create table public.projects (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint projects_data_identity check (
    jsonb_typeof(data) = 'object'
    and data ? 'id'
    and jsonb_typeof(data -> 'id') = 'string'
    and data ->> 'id' = id
    and length(id) > 0
    -- Exact ECMAScript String.trim() whitespace + line terminators.
    -- Default PostgreSQL btrim only removes U+0020 and is insufficient.
    and id = btrim(id, U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF')
  )
);

create index projects_user_created_at_idx on public.projects (user_id, created_at desc);

alter table public.projects enable row level security;

grant select, insert, update, delete on public.projects to authenticated;

create policy "Users can read their own projects"
on public.projects for select to authenticated
using (user_id = (select auth.uid()));

create policy "Users can create their own projects"
on public.projects for insert to authenticated
with check (user_id = (select auth.uid()));

create policy "Users can update their own projects"
on public.projects for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "Users can delete their own projects"
on public.projects for delete to authenticated
using (user_id = (select auth.uid()));
