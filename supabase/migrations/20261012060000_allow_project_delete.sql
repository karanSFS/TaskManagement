-- Deleting a project cascades to project_members. The last-owner rule fired on
-- that cascade and blocked every project delete. Cascades run after the project
-- row is gone, so skip the rule when the project no longer exists.

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
    if old.role = 'owner'
      and exists (select 1 from public.projects where id = old.project_id)
    then
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
