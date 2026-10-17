-- Keep access-check and trigger functions out of the public API.
-- Policies reference functions by identity, so moving the schema keeps them working.
create schema if not exists private;
grant usage on schema private to authenticated;

alter function public.is_professor() set schema private;
alter function public.is_class_professor(uuid) set schema private;
alter function public.is_enrolled(uuid) set schema private;
alter function public.shares_class_with(uuid) set schema private;
alter function public.assignment_class(uuid) set schema private;
alter function public.handle_new_user() set schema private;
alter function public.seed_class_objectives() set schema private;

revoke all on all functions in schema private from public, anon;
grant execute on function private.is_professor(), private.is_class_professor(uuid), private.is_enrolled(uuid),
  private.shares_class_with(uuid), private.assignment_class(uuid) to authenticated;

-- Sign-up runs the new-user trigger as the auth service.
grant usage on schema private to supabase_auth_admin;
