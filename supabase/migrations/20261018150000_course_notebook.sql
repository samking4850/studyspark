-- Course notebook: uploaded course sources, saved notes, and flashcard review progress.

-- Text extracted from uploaded PDFs. Professors share sources with the whole class;
-- students can add private sources only they (and nobody else) can see.
create table public.sources (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  owner_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  shared boolean not null default false,
  title text not null check (char_length(title) between 1 and 200),
  page_count int not null default 0,
  pages jsonb not null default '[]'::jsonb,   -- [{ num, text }]
  topics jsonb not null default '[]'::jsonb,  -- [{ name, page }]
  created_at timestamptz not null default now(),
  check (pg_column_size(pages) < 400000)
);
create index on public.sources (class_id);

create table public.notebook_notes (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  body text not null check (char_length(body) between 1 and 8000),
  citation text,
  created_at timestamptz not null default now()
);
create index on public.notebook_notes (class_id, user_id);

-- Spaced repetition: one row per student per card, holding its Leitner box and next due date.
create table public.flashcard_reviews (
  class_id uuid not null references public.classes (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  card_id text not null check (char_length(card_id) <= 200),
  box int not null default 1 check (box between 1 and 5),
  due date not null default current_date,
  reviews int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (class_id, user_id, card_id)
);

alter table public.sources enable row level security;
alter table public.notebook_notes enable row level security;
alter table public.flashcard_reviews enable row level security;

create policy "read shared or own sources" on public.sources for select to authenticated
  using (owner_id = (select auth.uid())
    or (shared and (private.is_class_professor(class_id) or private.is_enrolled(class_id))));
create policy "add sources" on public.sources for insert to authenticated
  with check (owner_id = (select auth.uid())
    and ((shared and private.is_class_professor(class_id))
      or (not shared and (private.is_enrolled(class_id) or private.is_class_professor(class_id)))));
create policy "remove own sources" on public.sources for delete to authenticated
  using (owner_id = (select auth.uid()));

create policy "own notes" on public.notebook_notes for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and (private.is_enrolled(class_id) or private.is_class_professor(class_id)));

create policy "read own or taught reviews" on public.flashcard_reviews for select to authenticated
  using (user_id = (select auth.uid()) or private.is_class_professor(class_id));
create policy "write own reviews" on public.flashcard_reviews for insert to authenticated
  with check (user_id = (select auth.uid()) and private.is_enrolled(class_id));
create policy "update own reviews" on public.flashcard_reviews for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

revoke all on public.sources, public.notebook_notes, public.flashcard_reviews from anon;
