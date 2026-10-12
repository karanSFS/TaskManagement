-- Close row-level security gaps found in the 2026-10-12 production audit.
-- See docs/PRODUCTION_READINESS.md, section 2.1.

-- ---------------------------------------------------------------------------
-- Issues: reporter is fixed, assignee must be a member, no parent cycles.
-- ---------------------------------------------------------------------------

create or replace function private.guard_issue_people()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  ancestor uuid;
  depth integer := 0;
begin
  if tg_op = 'UPDATE' and new.reporter_id is distinct from old.reporter_id then
    raise exception 'Issue reporter cannot change';
  end if;

  if new.assignee_id is not null
    and (tg_op = 'INSERT' or new.assignee_id is distinct from old.assignee_id)
    and not exists (
      select 1 from public.project_members
      where project_id = new.project_id and user_id = new.assignee_id
    )
  then
    raise exception 'Assignee must be a project member';
  end if;

  if new.parent_issue_id is not null
    and (tg_op = 'INSERT' or new.parent_issue_id is distinct from old.parent_issue_id)
  then
    ancestor := new.parent_issue_id;
    while ancestor is not null and depth < 100 loop
      if ancestor = new.id then
        raise exception 'An issue cannot be its own parent';
      end if;
      select parent_issue_id into ancestor from public.issues where id = ancestor;
      depth := depth + 1;
    end loop;
  end if;

  return new;
end;
$$;

create trigger issues_guard_people
  before insert or update on public.issues
  for each row execute function private.guard_issue_people();

-- ---------------------------------------------------------------------------
-- Comments: a comment cannot move to another issue or author.
-- Owners and admins can remove comments.
-- ---------------------------------------------------------------------------

create or replace function private.guard_comment_owner()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.issue_id is distinct from old.issue_id or new.author_id is distinct from old.author_id then
    raise exception 'Comments cannot move between issues or authors';
  end if;
  return new;
end;
$$;

create trigger comments_guard_owner
  before update on public.comments
  for each row execute function private.guard_comment_owner();

drop policy comments_delete on public.comments;
create policy comments_delete on public.comments
  for delete to authenticated
  using (
    author_id = (select auth.uid())
    or exists (
      select 1 from public.issues
      where issues.id = comments.issue_id
        and private.can_manage_project(issues.project_id)
    )
  );

-- ---------------------------------------------------------------------------
-- Members join only through invitations.
-- ---------------------------------------------------------------------------

revoke execute on function public.add_project_member(uuid, text, text) from authenticated;
revoke execute on function private.add_project_member(uuid, text, text) from authenticated;

create or replace function private.guard_invitation_project()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'pending' and exists (
    select 1 from public.projects where id = new.project_id and archived_at is not null
  ) then
    raise exception 'Archived projects cannot take new members';
  end if;
  return new;
end;
$$;

create trigger project_invitations_guard_project
  before insert or update on public.project_invitations
  for each row execute function private.guard_invitation_project();

-- ---------------------------------------------------------------------------
-- Notifications: recipients can only mark them read.
-- ---------------------------------------------------------------------------

revoke update on table public.notifications from authenticated;
grant update (read_at) on table public.notifications to authenticated;

-- ---------------------------------------------------------------------------
-- Sprints: status changes only through start_sprint and complete_sprint.
-- Completed sprints are read-only. Managers delete planned sprints only.
-- ---------------------------------------------------------------------------

create or replace function private.guard_sprint_status()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  transition boolean := coalesce(current_setting('fixtask.sprint_transition', true), '') = 'on';
begin
  if tg_op = 'INSERT' then
    if new.status <> 'future' then
      raise exception 'New sprints start as planned';
    end if;
    return new;
  end if;

  if not transition then
    if new.status is distinct from old.status then
      raise exception 'Use start or complete to change a sprint status';
    end if;
    if old.status = 'completed' then
      raise exception 'Completed sprints cannot change';
    end if;
  end if;
  return new;
end;
$$;

create trigger sprints_guard_status
  before insert or update on public.sprints
  for each row execute function private.guard_sprint_status();

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

  perform set_config('fixtask.sprint_transition', 'on', true);
  update public.sprints
  set status = 'active',
      start_date = coalesce(start_date, current_date)
  where id = target.id;
  perform set_config('fixtask.sprint_transition', '', true);

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

  perform set_config('fixtask.sprint_transition', 'on', true);
  update public.sprints
  set status = 'completed',
      end_date = coalesce(end_date, current_date)
  where id = target.id;
  perform set_config('fixtask.sprint_transition', '', true);

  return target.id;
end;
$$;

drop policy sprints_delete on public.sprints;
create policy sprints_delete on public.sprints
  for delete to authenticated
  using (private.can_manage_project(project_id) and status = 'future');

-- ---------------------------------------------------------------------------
-- Issue links stay inside one project.
-- ---------------------------------------------------------------------------

create or replace function private.guard_issue_link_project()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select project_id from public.issues where id = new.source_issue_id)
    is distinct from (select project_id from public.issues where id = new.target_issue_id)
  then
    raise exception 'Linked issues must belong to the same project';
  end if;
  return new;
end;
$$;

create trigger issue_links_guard_project
  before insert on public.issue_links
  for each row execute function private.guard_issue_link_project();

-- ---------------------------------------------------------------------------
-- Labels: members create and edit, owners and admins delete.
-- ---------------------------------------------------------------------------

drop policy labels_all on public.labels;

create policy labels_select on public.labels
  for select to authenticated
  using (private.is_project_member(project_id));

create policy labels_insert on public.labels
  for insert to authenticated
  with check (private.is_project_member(project_id));

create policy labels_update on public.labels
  for update to authenticated
  using (private.is_project_member(project_id))
  with check (private.is_project_member(project_id));

create policy labels_delete on public.labels
  for delete to authenticated
  using (private.can_manage_project(project_id));

-- ---------------------------------------------------------------------------
-- Storage: only the uploader or a manager can overwrite a file.
-- ---------------------------------------------------------------------------

drop policy attachments_objects_update on storage.objects;
create policy attachments_objects_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'attachments'
    and private.is_project_member(private.storage_project_id(name))
    and (
      owner_id = (select auth.uid())::text
      or private.can_manage_project(private.storage_project_id(name))
    )
  )
  with check (
    bucket_id = 'attachments'
    and private.is_project_member(private.storage_project_id(name))
  );

-- ---------------------------------------------------------------------------
-- Search and filter indexes.
-- ---------------------------------------------------------------------------

create extension if not exists pg_trgm with schema extensions;

create index if not exists issues_title_trgm_idx
  on public.issues using gin (title extensions.gin_trgm_ops);

create index if not exists labels_name_trgm_idx
  on public.labels using gin (name extensions.gin_trgm_ops);

create index if not exists issues_project_assignee_idx
  on public.issues (project_id, assignee_id);
