-- Let a project lead save settings after transferring the lead role,
-- and let owners and admins add an existing account by email.

create or replace function private.protect_project_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.created_by is distinct from old.created_by then
    new.created_by = old.created_by;
  end if;

  -- Issue numbering updates this column from a privileged trigger.
  if new.next_issue_number is distinct from old.next_issue_number
     and current_user not in ('postgres', 'supabase_admin') then
    new.next_issue_number = old.next_issue_number;
  end if;

  return new;
end;
$$;

create trigger projects_protect_columns
  before update on public.projects
  for each row execute function private.protect_project_columns();

create or replace function private.enforce_project_lead()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.lead_id is not null and new.lead_id is distinct from old.lead_id then
    if not exists (
      select 1
      from public.project_members
      where project_id = new.id
        and user_id = new.lead_id
    ) then
      raise exception 'Project lead must be a member';
    end if;
  end if;

  return new;
end;
$$;

create trigger projects_enforce_lead
  before update on public.projects
  for each row execute function private.enforce_project_lead();

drop policy projects_update on public.projects;

create policy projects_update on public.projects
  for update to authenticated
  using (private.can_manage_project(id) or lead_id = (select auth.uid()))
  with check (private.is_project_member(id));

create or replace function private.add_project_member(
  target_project_id uuid,
  member_email text,
  member_role text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  target_user uuid;
  clean_email text := lower(btrim(coalesce(member_email, '')));
  clean_role text := lower(btrim(coalesce(member_role, '')));
begin
  if actor is null then
    raise exception 'Sign in to manage members';
  end if;

  if clean_role not in ('owner', 'admin', 'member') then
    raise exception 'Role must be owner, admin, or member';
  end if;

  if not private.can_manage_project(target_project_id) then
    raise exception 'You cannot manage members of this project';
  end if;

  if clean_role = 'owner' and private.project_role(target_project_id) is distinct from 'owner' then
    raise exception 'Only an owner can add another owner';
  end if;

  if position('@' in clean_email) = 0 then
    raise exception 'Enter a valid email';
  end if;

  select id into target_user
  from auth.users
  where lower(email) = clean_email;

  if target_user is null then
    raise exception 'No TaskForge account uses that email';
  end if;

  if exists (
    select 1
    from public.project_members
    where project_id = target_project_id
      and user_id = target_user
  ) then
    raise exception 'That account is already a member';
  end if;

  insert into public.profiles (id, display_name)
  values (target_user, left(split_part(clean_email, '@', 1), 80))
  on conflict (id) do nothing;

  insert into public.project_members (project_id, user_id, role)
  values (target_project_id, target_user, clean_role);

  return target_user;
end;
$$;

create or replace function public.add_project_member(
  target_project_id uuid,
  member_email text,
  member_role text
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
begin
  return private.add_project_member(target_project_id, member_email, member_role);
end;
$$;

revoke all on function private.protect_project_columns() from public;
revoke all on function private.enforce_project_lead() from public;
revoke all on function private.add_project_member(uuid, text, text) from public;
revoke all on function public.add_project_member(uuid, text, text) from public, anon;

grant execute on function private.protect_project_columns() to authenticated;
grant execute on function private.enforce_project_lead() to authenticated;
grant execute on function private.add_project_member(uuid, text, text) to authenticated;
grant execute on function public.add_project_member(uuid, text, text) to authenticated;
