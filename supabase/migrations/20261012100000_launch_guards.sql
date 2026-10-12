-- Invitation sends are capped, deleted attachment files are queued for removal,
-- and dated reports are counted in SQL instead of loading every issue.

-- ---------------------------------------------------------------------------
-- Invitation rate limit: 20 sends per person per hour, including resends.
-- ---------------------------------------------------------------------------

create table public.invitation_send_log (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  created_at timestamptz not null default now()
);

create index invitation_send_log_user_created_idx
  on public.invitation_send_log (user_id, created_at desc);

alter table public.invitation_send_log enable row level security;
revoke all on table public.invitation_send_log from public, anon, authenticated;

create or replace function private.limit_invitation_sends()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  recent integer;
begin
  if actor is null then
    return new;
  end if;

  if tg_op = 'UPDATE' and new.token is not distinct from old.token then
    return new;
  end if;

  select count(*) into recent
  from public.invitation_send_log
  where user_id = actor
    and created_at > now() - interval '1 hour';

  if recent >= 20 then
    raise exception 'Too many invitations. Wait a while and try again.';
  end if;

  insert into public.invitation_send_log (user_id) values (actor);
  return new;
end;
$$;

create trigger project_invitations_limit_sends
  before insert or update on public.project_invitations
  for each row execute function private.limit_invitation_sends();

revoke all on function private.limit_invitation_sends() from public;

-- ---------------------------------------------------------------------------
-- Queue storage objects when an attachment row is deleted.
-- ---------------------------------------------------------------------------

create table public.storage_cleanup (
  id uuid primary key default gen_random_uuid(),
  bucket_id text not null default 'attachments',
  object_path text not null,
  created_at timestamptz not null default now()
);

create index storage_cleanup_created_at_idx on public.storage_cleanup (created_at);

alter table public.storage_cleanup enable row level security;
revoke all on table public.storage_cleanup from public, anon, authenticated;

create or replace function private.queue_attachment_cleanup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.storage_cleanup (object_path)
  values (old.storage_path);
  return old;
end;
$$;

create trigger attachments_queue_cleanup
  after delete on public.attachments
  for each row execute function private.queue_attachment_cleanup();

revoke all on function private.queue_attachment_cleanup() from public;

-- ---------------------------------------------------------------------------
-- Dated report counts.
-- ---------------------------------------------------------------------------

create or replace function public.report_issue_groups_between(
  target_project_id uuid default null,
  range_from timestamptz default null,
  range_to timestamptz default null
)
returns table (
  group_kind text,
  group_name text,
  group_order integer,
  issue_count bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  select 'status', status.name, status.position, count(issue.id)
  from public.issue_statuses as status
  left join public.issues as issue
    on issue.status_id = status.id
    and (target_project_id is null or issue.project_id = target_project_id)
    and (range_from is null or issue.created_at >= range_from)
    and (range_to is null or issue.created_at < range_to)
  group by status.name, status.position
  union all
  select 'priority', priority.name, priority.rank, count(issue.id)
  from public.priorities as priority
  left join public.issues as issue
    on issue.priority_id = priority.id
    and (target_project_id is null or issue.project_id = target_project_id)
    and (range_from is null or issue.created_at >= range_from)
    and (range_to is null or issue.created_at < range_to)
  group by priority.name, priority.rank
  union all
  select 'type', issue_type.name, issue_type.position, count(issue.id)
  from public.issue_types as issue_type
  left join public.issues as issue
    on issue.issue_type_id = issue_type.id
    and (target_project_id is null or issue.project_id = target_project_id)
    and (range_from is null or issue.created_at >= range_from)
    and (range_to is null or issue.created_at < range_to)
  group by issue_type.name, issue_type.position;
$$;

create or replace function public.report_projects_between(
  target_project_id uuid default null,
  range_from timestamptz default null,
  range_to timestamptz default null
)
returns table (
  project_name text,
  open_count bigint,
  done_count bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    project.name,
    count(issue.id) filter (where status.category is distinct from 'done'),
    count(issue.id) filter (where status.category = 'done')
  from public.projects as project
  join public.issues as issue on issue.project_id = project.id
  join public.issue_statuses as status on status.id = issue.status_id
  where project.archived_at is null
    and (target_project_id is null or project.id = target_project_id)
    and (range_from is null or issue.created_at >= range_from)
    and (range_to is null or issue.created_at < range_to)
  group by project.name
  order by project.name;
$$;

create or replace function public.report_sprints_between(
  target_project_id uuid default null,
  range_from timestamptz default null,
  range_to timestamptz default null
)
returns table (
  sprint_id uuid,
  sprint_name text,
  project_key text,
  sprint_status text,
  open_count bigint,
  done_count bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    sprint.id,
    sprint.name,
    project.key,
    sprint.status,
    count(issue.id) filter (where status.category is distinct from 'done'),
    count(issue.id) filter (where status.category = 'done')
  from public.sprints as sprint
  join public.projects as project on project.id = sprint.project_id
  join public.issues as issue on issue.sprint_id = sprint.id
  join public.issue_statuses as status on status.id = issue.status_id
  where (target_project_id is null or sprint.project_id = target_project_id)
    and (range_from is null or issue.created_at >= range_from)
    and (range_to is null or issue.created_at < range_to)
  group by sprint.id, sprint.name, project.key, sprint.status, sprint.updated_at
  order by sprint.updated_at desc
  limit 12;
$$;

revoke all on function public.report_issue_groups_between(uuid, timestamptz, timestamptz) from public, anon;
revoke all on function public.report_projects_between(uuid, timestamptz, timestamptz) from public, anon;
revoke all on function public.report_sprints_between(uuid, timestamptz, timestamptz) from public, anon;
grant execute on function public.report_issue_groups_between(uuid, timestamptz, timestamptz) to authenticated;
grant execute on function public.report_projects_between(uuid, timestamptz, timestamptz) to authenticated;
grant execute on function public.report_sprints_between(uuid, timestamptz, timestamptz) to authenticated;
