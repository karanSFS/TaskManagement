-- Member removal goes through a privileged function so a blocked delete
-- raises an error instead of looking successful. Owners can delete a project
-- only after it has been archived.

grant delete on table public.projects to authenticated;

create policy projects_delete on public.projects
  for delete to authenticated
  using (
    archived_at is not null
    and private.project_role(id) = 'owner'
  );

create or replace function private.remove_project_member(target_membership_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  target public.project_members%rowtype;
  actor_role text;
  owner_count integer;
begin
  if actor is null then
    raise exception 'Sign in to manage members';
  end if;

  select * into target
  from public.project_members
  where id = target_membership_id;

  if not found then
    raise exception 'You cannot remove that member';
  end if;

  select role into actor_role
  from public.project_members
  where project_id = target.project_id
    and user_id = actor;

  if actor_role is null then
    raise exception 'You cannot remove that member';
  end if;

  if target.user_id <> actor and actor_role not in ('owner', 'admin') then
    raise exception 'You cannot manage members of this project';
  end if;

  if target.role = 'owner' and target.user_id <> actor and actor_role is distinct from 'owner' then
    raise exception 'Only an owner can remove another owner';
  end if;

  if target.role = 'owner' then
    select count(*) into owner_count
    from public.project_members
    where project_id = target.project_id
      and role = 'owner';

    if owner_count <= 1 then
      raise exception 'A project must keep at least one owner';
    end if;
  end if;

  delete from public.project_members
  where id = target.id;

  return target.user_id;
end;
$$;

create or replace function public.remove_project_member(target_membership_id uuid)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select private.remove_project_member(target_membership_id);
$$;

revoke all on function private.remove_project_member(uuid) from public;
revoke all on function public.remove_project_member(uuid) from public, anon;

grant execute on function private.remove_project_member(uuid) to authenticated;
grant execute on function public.remove_project_member(uuid) to authenticated;
