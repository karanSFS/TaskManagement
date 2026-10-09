-- Deleting a member (not an owner) hit private.enforce_project_owner,
-- which returned NEW. NEW is null on DELETE, so Postgres skipped the row
-- and the app still reported success.

create or replace function private.enforce_project_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  remaining_owners integer;
begin
  if tg_op = 'DELETE' then
    if old.role = 'owner' then
      select count(*) into remaining_owners
      from public.project_members
      where project_id = old.project_id
        and role = 'owner'
        and user_id <> old.user_id;

      if remaining_owners = 0 then
        raise exception 'A project must keep at least one owner';
      end if;
    end if;

    return old;
  end if;

  if tg_op = 'UPDATE' and old.role = 'owner' and new.role <> 'owner' then
    select count(*) into remaining_owners
    from public.project_members
    where project_id = new.project_id
      and role = 'owner'
      and user_id <> new.user_id;

    if remaining_owners = 0 then
      raise exception 'A project must keep at least one owner';
    end if;
  end if;

  return new;
end;
$$;

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

  if not found then
    raise exception 'You cannot remove that member';
  end if;

  return target.user_id;
end;
$$;
