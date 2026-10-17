-- Study Spark v1.2: shared accounts, classes and learning data for students and professors.
-- Row level security keeps each student's work private to them and their own professors.

-- People ------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('student', 'professor')),
  name text not null check (char_length(name) between 1 and 100),
  email text not null,
  learning_profile jsonb,
  created_at timestamptz not null default now()
);

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, role, name, email)
  values (
    new.id,
    case when new.raw_user_meta_data ->> 'role' = 'professor' then 'professor' else 'student' end,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'), ''), split_part(new.email, '@', 1)),
    new.email
  );
  insert into public.workspaces (user_id) values (new.id);
  return new;
end;
$$;

-- A student's own classes, uploaded PDF text and completed topics (the original Study Spark workspace).
create table public.workspaces (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  data jsonb not null default '{"courses": [], "completed": []}'::jsonb,
  updated_at timestamptz not null default now()
);

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Classes -----------------------------------------------------------------
create table public.classes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9]{3,12}$'),
  name text not null check (char_length(name) between 1 and 100),
  unit text,
  template text not null default 'custom' check (template in ('finance-tvm', 'custom')),
  professor_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.objectives (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  key text not null,
  title text not null check (char_length(title) between 1 and 120),
  description text not null default '',
  student_lesson boolean not null default false,
  source text,
  position int not null default 0,
  created_at timestamptz not null default now(),
  unique (class_id, key)
);

create table public.enrollments (
  class_id uuid not null references public.classes (id) on delete cascade,
  student_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (class_id, student_id)
);

create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  type text not null check (type in ('Lesson', 'Reading', 'Practice set', 'Reflection')),
  objective_key text,
  due_date date not null,
  est_minutes int not null default 25 check (est_minutes between 1 and 600),
  instructions text not null default '',
  assigned_to uuid[],  -- null means the whole class
  created_at timestamptz not null default now()
);

create table public.assignment_completions (
  assignment_id uuid not null references public.assignments (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (assignment_id, student_id)
);

-- Learning evidence -------------------------------------------------------
create table public.lesson_mastery (
  class_id uuid not null references public.classes (id) on delete cascade,
  student_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  objective_key text not null,
  mastered_at timestamptz not null default now(),
  primary key (class_id, student_id, objective_key)
);

create table public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  student_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  lesson_key text not null,
  started_at timestamptz not null,
  seconds int not null check (seconds between 1 and 86400)
);

create table public.practice_attempts (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  student_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  lesson_key text not null,
  question int not null,
  chosen int not null,
  correct boolean not null,
  hinted boolean not null default false,
  at timestamptz not null default now()
);

create table public.reflections (
  class_id uuid not null references public.classes (id) on delete cascade,
  student_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  lesson_key text not null,
  text text not null check (char_length(text) between 1 and 4000),
  at timestamptz not null default now(),
  primary key (class_id, student_id, lesson_key)
);

create table public.diagnostics (
  class_id uuid not null references public.classes (id) on delete cascade,
  student_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  results jsonb not null,
  taken_at timestamptz not null default now(),
  primary key (class_id, student_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  professor_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  text text not null check (char_length(text) between 1 and 2000),
  sent_at timestamptz not null default now(),
  read_at timestamptz
);

create table public.professor_notes (
  class_id uuid not null references public.classes (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  professor_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  text text not null default '',
  updated_at timestamptz not null default now(),
  primary key (class_id, student_id, professor_id)
);

create index on public.enrollments (student_id);
create index on public.assignments (class_id);
create index on public.study_sessions (class_id, student_id);
create index on public.practice_attempts (class_id, student_id);
create index on public.messages (class_id, student_id);

-- Built-in lessons for the finance template -------------------------------
create function public.seed_class_objectives() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.template = 'finance-tvm' then
    insert into public.objectives (class_id, key, title, description, student_lesson, position) values
      (new.id, 'fin-interest', 'Simple vs. compound interest', 'Explain how interest accumulates over time', true, 1),
      (new.id, 'fin-fv', 'Future value', 'Calculate the future value of a lump sum', true, 2),
      (new.id, 'fin-pv', 'Present value', 'Discount a future cash flow to today''s dollars', true, 3),
      (new.id, 'fin-annuity', 'Annuities and loan payments', 'Recognize equal periodic cash flows', true, 4);
  end if;
  return new;
end;
$$;

create trigger on_class_created after insert on public.classes
  for each row execute function public.seed_class_objectives();

-- Access helpers (security definer so policies don't recurse) -------------
create function public.is_professor() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'professor');
$$;

create function public.is_class_professor(cid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from classes where id = cid and professor_id = auth.uid());
$$;

create function public.is_enrolled(cid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from enrollments where class_id = cid and student_id = auth.uid());
$$;

create function public.shares_class_with(other uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from enrollments e join classes c on c.id = e.class_id
    where (e.student_id = other and c.professor_id = auth.uid())
       or (e.student_id = auth.uid() and c.professor_id = other)
  );
$$;

create function public.assignment_class(aid uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select class_id from assignments where id = aid;
$$;

-- Row level security ------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.classes enable row level security;
alter table public.objectives enable row level security;
alter table public.enrollments enable row level security;
alter table public.assignments enable row level security;
alter table public.assignment_completions enable row level security;
alter table public.lesson_mastery enable row level security;
alter table public.study_sessions enable row level security;
alter table public.practice_attempts enable row level security;
alter table public.reflections enable row level security;
alter table public.diagnostics enable row level security;
alter table public.messages enable row level security;
alter table public.professor_notes enable row level security;

create policy "see self and classmates' professors or students" on public.profiles for select to authenticated
  using (id = auth.uid() or public.shares_class_with(id));
create policy "edit own profile" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
revoke update on public.profiles from authenticated, anon;
grant update (name, learning_profile) on public.profiles to authenticated;

create policy "own workspace" on public.workspaces for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "signed-in users can look up classes" on public.classes for select to authenticated using (true);
create policy "professors create their classes" on public.classes for insert to authenticated
  with check (professor_id = auth.uid() and public.is_professor());
create policy "professors edit their classes" on public.classes for update to authenticated
  using (professor_id = auth.uid()) with check (professor_id = auth.uid());
create policy "professors delete their classes" on public.classes for delete to authenticated
  using (professor_id = auth.uid());

create policy "class members read objectives" on public.objectives for select to authenticated
  using (public.is_class_professor(class_id) or public.is_enrolled(class_id));
create policy "professors manage objectives" on public.objectives for all to authenticated
  using (public.is_class_professor(class_id)) with check (public.is_class_professor(class_id));

create policy "see own or taught enrollments" on public.enrollments for select to authenticated
  using (student_id = auth.uid() or public.is_class_professor(class_id));
create policy "students join classes" on public.enrollments for insert to authenticated
  with check (student_id = auth.uid() and not public.is_professor());
create policy "students leave classes" on public.enrollments for delete to authenticated
  using (student_id = auth.uid() or public.is_class_professor(class_id));

create policy "students see their assignments" on public.assignments for select to authenticated
  using (public.is_class_professor(class_id) or (public.is_enrolled(class_id) and (assigned_to is null or auth.uid() = any (assigned_to))));
create policy "professors manage assignments" on public.assignments for all to authenticated
  using (public.is_class_professor(class_id)) with check (public.is_class_professor(class_id));

create policy "see own or taught completions" on public.assignment_completions for select to authenticated
  using (student_id = auth.uid() or public.is_class_professor(public.assignment_class(assignment_id)));
create policy "mark completions" on public.assignment_completions for insert to authenticated
  with check ((student_id = auth.uid() and public.is_enrolled(public.assignment_class(assignment_id))) or public.is_class_professor(public.assignment_class(assignment_id)));
create policy "unmark completions" on public.assignment_completions for delete to authenticated
  using (student_id = auth.uid() or public.is_class_professor(public.assignment_class(assignment_id)));

-- Evidence tables: students write their own rows in classes they're in; their professors read them.
create policy "read mastery" on public.lesson_mastery for select to authenticated using (student_id = auth.uid() or public.is_class_professor(class_id));
create policy "write mastery" on public.lesson_mastery for insert to authenticated with check (student_id = auth.uid() and public.is_enrolled(class_id));

create policy "read sessions" on public.study_sessions for select to authenticated using (student_id = auth.uid() or public.is_class_professor(class_id));
create policy "write sessions" on public.study_sessions for insert to authenticated with check (student_id = auth.uid() and public.is_enrolled(class_id));

create policy "read attempts" on public.practice_attempts for select to authenticated using (student_id = auth.uid() or public.is_class_professor(class_id));
create policy "write attempts" on public.practice_attempts for insert to authenticated with check (student_id = auth.uid() and public.is_enrolled(class_id));

create policy "read reflections" on public.reflections for select to authenticated using (student_id = auth.uid() or public.is_class_professor(class_id));
create policy "write reflections" on public.reflections for insert to authenticated with check (student_id = auth.uid() and public.is_enrolled(class_id));
create policy "update reflections" on public.reflections for update to authenticated using (student_id = auth.uid()) with check (student_id = auth.uid());

create policy "read diagnostics" on public.diagnostics for select to authenticated using (student_id = auth.uid() or public.is_class_professor(class_id));
create policy "write diagnostics" on public.diagnostics for insert to authenticated with check (student_id = auth.uid() and public.is_enrolled(class_id));
create policy "update diagnostics" on public.diagnostics for update to authenticated using (student_id = auth.uid()) with check (student_id = auth.uid());

create policy "read messages" on public.messages for select to authenticated using (student_id = auth.uid() or public.is_class_professor(class_id));
create policy "professors send messages" on public.messages for insert to authenticated
  with check (professor_id = auth.uid() and public.is_class_professor(class_id)
              and exists (select 1 from public.enrollments e where e.class_id = messages.class_id and e.student_id = messages.student_id));
create policy "students mark messages read" on public.messages for update to authenticated
  using (student_id = auth.uid()) with check (student_id = auth.uid());
revoke update on public.messages from authenticated, anon;
grant update (read_at) on public.messages to authenticated;

create policy "professors keep private notes" on public.professor_notes for all to authenticated
  using (professor_id = auth.uid() and public.is_class_professor(class_id))
  with check (professor_id = auth.uid() and public.is_class_professor(class_id));

-- Nothing is readable without signing in.
revoke all on all tables in schema public from anon;
