-- Archived projects stay readable. Writes are rejected except restoring the
-- project, changing or removing members, completing the sprint that is already
-- running, and deleting the project. Sprint history stores the sprint name.

-- ---------------------------------------------------------------------------
-- Sprint names in history
-- ---------------------------------------------------------------------------

create or replace function private.record_issue_history()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
begin
  if tg_op = 'INSERT' then
    insert into public.issue_history (issue_id, actor_id, field, new_value)
    values (new.id, actor, 'created', new.title);
    return new;
  end if;

  if new.status_id is distinct from old.status_id then
    insert into public.issue_history (issue_id, actor_id, field, old_value, new_value)
    values (new.id, actor, 'status', old.status_id::text, new.status_id::text);
  end if;
  if new.assignee_id is distinct from old.assignee_id then
    insert into public.issue_history (issue_id, actor_id, field, old_value, new_value)
    values (new.id, actor, 'assignee', old.assignee_id::text, new.assignee_id::text);
  end if;
  if new.priority_id is distinct from old.priority_id then
    insert into public.issue_history (issue_id, actor_id, field, old_value, new_value)
    values (new.id, actor, 'priority', old.priority_id::text, new.priority_id::text);
  end if;
  if new.issue_type_id is distinct from old.issue_type_id then
    insert into public.issue_history (issue_id, actor_id, field, old_value, new_value)
    values (new.id, actor, 'type', old.issue_type_id::text, new.issue_type_id::text);
  end if;
  if new.description is distinct from old.description then
    insert into public.issue_history (issue_id, actor_id, field, new_value)
    values (new.id, actor, 'description', 'updated');
  end if;
  if new.sprint_id is distinct from old.sprint_id then
    insert into public.issue_history (issue_id, actor_id, field, old_value, new_value)
    values (
      new.id,
      actor,
      'sprint',
      (select sprint.name from public.sprints as sprint where sprint.id = old.sprint_id),
      (select sprint.name from public.sprints as sprint where sprint.id = new.sprint_id)
    );
  end if;
  if new.due_date is distinct from old.due_date then
    insert into public.issue_history (issue_id, actor_id, field, old_value, new_value)
    values (new.id, actor, 'due_date', old.due_date::text, new.due_date::text);
  end if;
  if new.title is distinct from old.title then
    insert into public.issue_history (issue_id, actor_id, field, old_value, new_value)
    values (new.id, actor, 'title', old.title, new.title);
  end if;

  return new;
end;
$$;

update public.issue_history as history
set new_value = sprint.name
from public.sprints as sprint
where history.field = 'sprint'
  and history.new_value = sprint.id::text;

update public.issue_history as history
set old_value = sprint.name
from public.sprints as sprint
where history.field = 'sprint'
  and history.old_value = sprint.id::text;

-- ---------------------------------------------------------------------------
-- Archived projects are read-only
-- ---------------------------------------------------------------------------

create or replace function private.reject_archived_project(target_project uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(current_setting('fixtask.project_delete', true), '') = 'on' then
    return;
  end if;

  if target_project is not null and exists (
    select 1
    from public.projects
    where id = target_project
      and archived_at is not null
  ) then
    raise exception 'Archived projects are read-only';
  end if;
end;
$$;

create or replace function private.guard_archived_issue_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE'
    and coalesce(current_setting('fixtask.sprint_transition', true), '') = 'on'
  then
    return new;
  end if;

  perform private.reject_archived_project(coalesce(new.project_id, old.project_id));
  return coalesce(new, old);
end;
$$;

create trigger issues_guard_archived_write
  before update or delete on public.issues
  for each row execute function private.guard_archived_issue_write();

create or replace function private.guard_archived_issue_child()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_issue uuid := coalesce(new.issue_id, old.issue_id);
  target_project uuid;
begin
  select issue.project_id into target_project
  from public.issues as issue
  where issue.id = target_issue;

  perform private.reject_archived_project(target_project);
  return coalesce(new, old);
end;
$$;

create trigger comments_guard_archived
  before insert or update or delete on public.comments
  for each row execute function private.guard_archived_issue_child();

create trigger issue_labels_guard_archived
  before insert or delete on public.issue_labels
  for each row execute function private.guard_archived_issue_child();

create trigger attachments_guard_archived
  before insert or update or delete on public.attachments
  for each row execute function private.guard_archived_issue_child();

create or replace function private.guard_archived_issue_link()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_project uuid;
begin
  select issue.project_id into target_project
  from public.issues as issue
  where issue.id = coalesce(new.source_issue_id, old.source_issue_id);

  perform private.reject_archived_project(target_project);
  return coalesce(new, old);
end;
$$;

create trigger issue_links_guard_archived
  before insert or delete on public.issue_links
  for each row execute function private.guard_archived_issue_link();

create or replace function private.guard_archived_label()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.reject_archived_project(coalesce(new.project_id, old.project_id));
  return coalesce(new, old);
end;
$$;

create trigger labels_guard_archived
  before insert or update or delete on public.labels
  for each row execute function private.guard_archived_label();

create or replace function private.guard_archived_sprint()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(current_setting('fixtask.sprint_transition', true), '') = 'on' then
    return coalesce(new, old);
  end if;

  perform private.reject_archived_project(coalesce(new.project_id, old.project_id));
  return coalesce(new, old);
end;
$$;

create trigger sprints_guard_archived
  before insert or update or delete on public.sprints
  for each row execute function private.guard_archived_sprint();

create or replace function private.guard_archived_project_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.archived_at is not null and new.archived_at is not null then
    if (new.name, new.key, new.description, new.icon, new.lead_id, new.next_issue_number, new.created_by)
      is distinct from
      (old.name, old.key, old.description, old.icon, old.lead_id, old.next_issue_number, old.created_by)
    then
      raise exception 'Archived projects are read-only';
    end if;
  end if;

  return new;
end;
$$;

create trigger projects_guard_archived_update
  before update on public.projects
  for each row execute function private.guard_archived_project_update();

create or replace function private.mark_project_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform set_config('fixtask.project_delete', 'on', true);
  return old;
end;
$$;

create or replace function private.clear_project_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform set_config('fixtask.project_delete', '', true);
  return null;
end;
$$;

create trigger projects_mark_delete
  before delete on public.projects
  for each row execute function private.mark_project_delete();

create trigger projects_clear_delete
  after delete on public.projects
  for each row execute function private.clear_project_delete();

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
    from public.projects
    where id = target.project_id
      and archived_at is not null
  ) then
    raise exception 'Archived projects are read-only';
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

  perform set_config('fixtask.sprint_transition', 'on', true);

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

  perform set_config('fixtask.sprint_transition', '', true);

  return target.id;
end;
$$;

revoke all on function private.reject_archived_project(uuid) from public;
revoke all on function private.guard_archived_issue_write() from public;
revoke all on function private.guard_archived_issue_child() from public;
revoke all on function private.guard_archived_issue_link() from public;
revoke all on function private.guard_archived_label() from public;
revoke all on function private.guard_archived_sprint() from public;
revoke all on function private.guard_archived_project_update() from public;
revoke all on function private.mark_project_delete() from public;
revoke all on function private.clear_project_delete() from public;
