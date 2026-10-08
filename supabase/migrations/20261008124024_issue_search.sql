-- Issue search runs in Postgres so title, key, and label matches stay out of the browser.
-- Security invoker: row level security still limits results to the caller's projects.

create or replace function public.search_issues(
  search_text text default '',
  target_project_id uuid default null,
  target_status_id uuid default null,
  target_priority_id uuid default null,
  target_type_id uuid default null,
  assignee_filter text default 'all',
  sort_by text default 'updated',
  sort_ascending boolean default false,
  page_limit integer default 20,
  page_offset integer default 0
)
returns table (
  id uuid,
  issue_number integer,
  title text,
  project_key text,
  project_name text,
  status_name text,
  priority_name text,
  assignee_name text,
  updated_at timestamptz,
  total_count bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  with cleaned as (
    select replace(replace(replace(btrim(coalesce(search_text, '')), '\', ''), '%', ''), '_', '') as needle
  ),
  matched as (
    select
      issue.id,
      issue.issue_number,
      issue.title,
      project.key as project_key,
      project.name as project_name,
      status.name as status_name,
      priority.name as priority_name,
      priority.rank as priority_rank,
      assignee.display_name as assignee_name,
      issue.updated_at,
      issue.created_at
    from public.issues as issue
    join public.projects as project on project.id = issue.project_id
    join public.issue_statuses as status on status.id = issue.status_id
    join public.priorities as priority on priority.id = issue.priority_id
    left join public.profiles as assignee on assignee.id = issue.assignee_id
    cross join cleaned
    where (target_project_id is null or issue.project_id = target_project_id)
      and (target_status_id is null or issue.status_id = target_status_id)
      and (target_priority_id is null or issue.priority_id = target_priority_id)
      and (target_type_id is null or issue.issue_type_id = target_type_id)
      and (
        coalesce(assignee_filter, 'all') = 'all'
        or (assignee_filter = 'unassigned' and issue.assignee_id is null)
        or (assignee_filter = 'me' and issue.assignee_id = (select auth.uid()))
      )
      and (
        cleaned.needle = ''
        or issue.title ilike '%' || cleaned.needle || '%'
        or (project.key || '-' || issue.issue_number::text) ilike '%' || cleaned.needle || '%'
        or exists (
          select 1
          from public.issue_labels as link
          join public.labels as label on label.id = link.label_id
          where link.issue_id = issue.id
            and label.name ilike '%' || cleaned.needle || '%'
        )
      )
  )
  select
    matched.id,
    matched.issue_number,
    matched.title,
    matched.project_key,
    matched.project_name,
    matched.status_name,
    matched.priority_name,
    matched.assignee_name,
    matched.updated_at,
    count(*) over () as total_count
  from matched
  order by
    case when sort_by = 'title' and sort_ascending then lower(matched.title) end asc nulls last,
    case when sort_by = 'title' and not sort_ascending then lower(matched.title) end desc nulls last,
    case when sort_by = 'priority' and sort_ascending then matched.priority_rank end asc nulls last,
    case when sort_by = 'priority' and not sort_ascending then matched.priority_rank end desc nulls last,
    case when sort_by = 'key' and sort_ascending then matched.project_key end asc nulls last,
    case when sort_by = 'key' and sort_ascending then matched.issue_number end asc nulls last,
    case when sort_by = 'key' and not sort_ascending then matched.project_key end desc nulls last,
    case when sort_by = 'key' and not sort_ascending then matched.issue_number end desc nulls last,
    case when sort_by = 'created' and sort_ascending then matched.created_at end asc nulls last,
    case when sort_by = 'created' and not sort_ascending then matched.created_at end desc nulls last,
    case when sort_by = 'updated' and sort_ascending then matched.updated_at end asc nulls last,
    case when coalesce(sort_by, 'updated') <> 'updated' or not sort_ascending then matched.updated_at end desc nulls last
  limit least(greatest(coalesce(page_limit, 20), 1), 50)
  offset greatest(coalesce(page_offset, 0), 0);
$$;

revoke all on function public.search_issues(text, uuid, uuid, uuid, uuid, text, text, boolean, integer, integer) from public, anon;
grant execute on function public.search_issues(text, uuid, uuid, uuid, uuid, text, text, boolean, integer, integer) to authenticated;
