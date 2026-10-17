-- One row per AI assistant request, used to enforce a daily limit per person.
-- Stores no message content.
create table public.assistant_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  class_id uuid references public.classes (id) on delete cascade,
  mode text not null check (mode in ('student', 'professor')),
  created_at timestamptz not null default now()
);
create index on public.assistant_usage (user_id, created_at);

alter table public.assistant_usage enable row level security;
create policy "see own assistant usage" on public.assistant_usage for select to authenticated
  using (user_id = (select auth.uid()));
create policy "log own assistant usage" on public.assistant_usage for insert to authenticated
  with check (user_id = (select auth.uid()));
