-- Start and complete a sprint in one transaction.
-- Completing a sprint returns unfinished issues to the backlog.

create or replace function public.start_sprint(target_sprint_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target public.sprints%rowtype;
begin
  select * into target
  from public.sprints
  where id = target_sprint_id;

  if not found then
    raise exception 'Sprint could not be found';
  end if;

  if target.status <> 'future' then
    raise exception 'Only a planned sprint can be started';
  end if;

  if exists (
    select 1
    from public.sprints
    where project_id = target.project_id
      and status = 'active'
      and id <> target.id
  ) then
    raise exception 'A project can have only one active sprint';
  end if;

  update public.sprints
  set status = 'active',
      start_date = coalesce(start_date, current_date)
  where id = target.id;

  return target.id;
end;
$$;

create or replace function public.complete_sprint(target_sprint_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target public.sprints%rowtype;
begin
  select * into target
  from public.sprints
  where id = target_sprint_id;

  if not found then
    raise exception 'Sprint could not be found';
  end if;

  if target.status <> 'active' then
    raise exception 'Only the active sprint can be completed';
  end if;

  update public.issues as issue
  set sprint_id = null
  from public.issue_statuses as status
  where issue.sprint_id = target.id
    and issue.status_id = status.id
    and status.category <> 'done';

  update public.sprints
  set status = 'completed',
      end_date = coalesce(end_date, current_date)
  where id = target.id;

  return target.id;
end;
$$;

revoke all on function public.start_sprint(uuid) from public, anon;
revoke all on function public.complete_sprint(uuid) from public, anon;

grant execute on function public.start_sprint(uuid) to authenticated;
grant execute on function public.complete_sprint(uuid) to authenticated;
