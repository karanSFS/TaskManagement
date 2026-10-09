-- Report totals stay in Postgres. Security invoker so row level security still applies.

create or replace function public.report_sprints(target_project_id uuid default null)
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
  left join public.issues as issue on issue.sprint_id = sprint.id
  left join public.issue_statuses as status on status.id = issue.status_id
  where target_project_id is null or sprint.project_id = target_project_id
  group by sprint.id, sprint.name, project.key, sprint.status, sprint.updated_at
  order by sprint.updated_at desc
  limit 12;
$$;

create or replace function public.report_issue_groups(target_project_id uuid default null)
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
  group by status.name, status.position
  union all
  select 'priority', priority.name, priority.rank, count(issue.id)
  from public.priorities as priority
  left join public.issues as issue
    on issue.priority_id = priority.id
    and (target_project_id is null or issue.project_id = target_project_id)
  group by priority.name, priority.rank
  union all
  select 'type', issue_type.name, issue_type.position, count(issue.id)
  from public.issue_types as issue_type
  left join public.issues as issue
    on issue.issue_type_id = issue_type.id
    and (target_project_id is null or issue.project_id = target_project_id)
  group by issue_type.name, issue_type.position;
$$;

revoke all on function public.report_sprints(uuid) from public, anon;
revoke all on function public.report_issue_groups(uuid) from public, anon;
grant execute on function public.report_sprints(uuid) to authenticated;
grant execute on function public.report_issue_groups(uuid) to authenticated;
