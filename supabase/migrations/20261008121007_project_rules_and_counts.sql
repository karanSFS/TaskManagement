-- Project rules the app relied on but the database did not enforce,
-- plus issue counts per project computed in Postgres.

-- Archived projects keep their history but take no new issues.
create or replace function private.block_archived_issue_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.projects
    where id = new.project_id
      and archived_at is not null
  ) then
    raise exception 'Archived projects cannot take new issues';
  end if;

  return new;
end;
$$;

create trigger issues_block_archived_insert
  before insert on public.issues
  for each row execute function private.block_archived_issue_insert();

-- Admins manage members, but only owners can change or remove an owner,
-- and only owners can promote someone to owner. Owners may still leave.
create or replace function private.protect_owner_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  actor_role text;
begin
  if actor is null then
    return coalesce(new, old);
  end if;

  select role into actor_role
  from public.project_members
  where project_id = coalesce(new.project_id, old.project_id)
    and user_id = actor;

  if tg_op = 'DELETE' then
    if old.role = 'owner' and old.user_id <> actor and actor_role is distinct from 'owner' then
      raise exception 'Only an owner can remove another owner';
    end if;
    return old;
  end if;

  if old.role = 'owner' and new.role <> 'owner' and actor_role is distinct from 'owner' then
    raise exception 'Only an owner can change another owner';
  end if;

  if new.role = 'owner' and old.role <> 'owner' and actor_role is distinct from 'owner' then
    raise exception 'Only an owner can add another owner';
  end if;

  return new;
end;
$$;

create trigger project_members_protect_owner
  before update or delete on public.project_members
  for each row execute function private.protect_owner_membership();

-- A removed member stops being the lead and stops being assigned work
-- in that project. The lead falls back to the longest-standing owner.
create or replace function private.release_removed_member()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.issues
  set assignee_id = null
  where project_id = old.project_id
    and assignee_id = old.user_id;

  update public.projects
  set lead_id = (
    select user_id
    from public.project_members
    where project_id = old.project_id
      and role = 'owner'
    order by created_at
    limit 1
  )
  where id = old.project_id
    and lead_id = old.user_id
    and exists (
      select 1
      from public.project_members
      where project_id = old.project_id
        and role = 'owner'
    );

  return old;
end;
$$;

create trigger project_members_release_removed
  after delete on public.project_members
  for each row execute function private.release_removed_member();

-- Security invoker, so row level security limits the counts to the caller's projects.
create or replace function public.project_issue_counts()
returns table (project_id uuid, open_count bigint, done_count bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    i.project_id,
    count(*) filter (where s.category <> 'done') as open_count,
    count(*) filter (where s.category = 'done') as done_count
  from public.issues i
  join public.issue_statuses s on s.id = i.status_id
  group by i.project_id;
$$;

revoke all on function private.block_archived_issue_insert() from public;
revoke all on function private.protect_owner_membership() from public;
revoke all on function private.release_removed_member() from public;
revoke all on function public.project_issue_counts() from public, anon;

grant execute on function private.block_archived_issue_insert() to authenticated;
grant execute on function private.protect_owner_membership() to authenticated;
grant execute on function private.release_removed_member() to authenticated;
grant execute on function public.project_issue_counts() to authenticated;
