-- TaskForge application schema.
-- Access is limited to members of a project. Authorization lives in project_members,
-- never in user-editable auth metadata.

create schema if not exists private;

revoke all on schema private from public;
grant usage on schema private to authenticated;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function private.is_project_member(target_project_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  return exists (
    select 1
    from public.project_members
    where project_id = target_project_id
      and user_id = (select auth.uid())
  );
end;
$$;

create or replace function private.project_role(target_project_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  return (
    select role
    from public.project_members
    where project_id = target_project_id
      and user_id = (select auth.uid())
    limit 1
  );
end;
$$;

create or replace function private.can_manage_project(target_project_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  return private.project_role(target_project_id) in ('owner', 'admin');
end;
$$;

create or replace function private.storage_project_id(object_name text)
returns uuid
language plpgsql
stable
set search_path = ''
as $$
declare
  folder text;
begin
  folder := (storage.foldername(object_name))[1];
  if folder is null or folder !~ '^[0-9a-fA-F-]{36}$' then
    return null;
  end if;
  return folder::uuid;
end;
$$;

revoke all on function private.touch_updated_at() from public;
revoke all on function private.is_project_member(uuid) from public;
revoke all on function private.project_role(uuid) from public;
revoke all on function private.can_manage_project(uuid) from public;
revoke all on function private.storage_project_id(text) from public;

grant execute on function private.touch_updated_at() to authenticated;
grant execute on function private.is_project_member(uuid) to authenticated;
grant execute on function private.project_role(uuid) to authenticated;
grant execute on function private.can_manage_project(uuid) to authenticated;
grant execute on function private.storage_project_id(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Reference data
-- ---------------------------------------------------------------------------

create table public.issue_types (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null unique,
  position integer not null unique,
  created_at timestamptz not null default now()
);

create table public.issue_statuses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null unique,
  category text not null check (category in ('todo', 'in_progress', 'done')),
  position integer not null unique,
  created_at timestamptz not null default now()
);

create table public.priorities (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null unique,
  rank integer not null unique,
  created_at timestamptz not null default now()
);

insert into public.issue_types (slug, name, position) values
  ('task', 'Task', 1),
  ('bug', 'Bug', 2),
  ('story', 'Story', 3),
  ('feature', 'Feature', 4),
  ('improvement', 'Improvement', 5),
  ('epic', 'Epic', 6),
  ('subtask', 'Subtask', 7);

insert into public.issue_statuses (slug, name, category, position) values
  ('backlog', 'Backlog', 'todo', 1),
  ('todo', 'To Do', 'todo', 2),
  ('in_progress', 'In Progress', 'in_progress', 3),
  ('in_review', 'In Review', 'in_progress', 4),
  ('qa', 'QA', 'in_progress', 5),
  ('done', 'Done', 'done', 6);

insert into public.priorities (slug, name, rank) values
  ('lowest', 'Lowest', 1),
  ('low', 'Low', 2),
  ('medium', 'Medium', 3),
  ('high', 'High', 4),
  ('highest', 'Highest', 5);

-- ---------------------------------------------------------------------------
-- People and projects
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 80),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  key text not null check (key ~ '^[A-Z][A-Z0-9]{1,9}$'),
  description text not null default '',
  icon text,
  lead_id uuid references public.profiles (id) on delete set null,
  created_by uuid not null references public.profiles (id) on delete restrict,
  next_issue_number integer not null default 1 check (next_issue_number > 0),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (key)
);

create index projects_lead_id_idx on public.projects (lead_id);
create index projects_created_by_idx on public.projects (created_by);
create index projects_archived_at_idx on public.projects (archived_at) where archived_at is null;

create table public.project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, user_id)
);

create index project_members_user_id_idx on public.project_members (user_id);

-- ---------------------------------------------------------------------------
-- Work
-- ---------------------------------------------------------------------------

create table public.sprints (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  goal text not null default '',
  status text not null default 'future' check (status in ('future', 'active', 'completed')),
  start_date date,
  end_date date,
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date is null or start_date is null or end_date >= start_date)
);

create index sprints_project_id_idx on public.sprints (project_id);
create unique index sprints_one_active_per_project_idx
  on public.sprints (project_id)
  where status = 'active';

create table public.issues (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  issue_number integer not null check (issue_number > 0),
  title text not null check (char_length(btrim(title)) between 1 and 200),
  description text not null default '',
  issue_type_id uuid not null references public.issue_types (id) on delete restrict,
  status_id uuid not null references public.issue_statuses (id) on delete restrict,
  priority_id uuid not null references public.priorities (id) on delete restrict,
  assignee_id uuid references public.profiles (id) on delete set null,
  reporter_id uuid not null references public.profiles (id) on delete restrict,
  due_date date,
  sprint_id uuid references public.sprints (id) on delete set null,
  parent_issue_id uuid references public.issues (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, issue_number)
);

create index issues_project_status_idx on public.issues (project_id, status_id);
create index issues_project_updated_idx on public.issues (project_id, updated_at desc);
create index issues_assignee_id_idx on public.issues (assignee_id) where assignee_id is not null;
create index issues_reporter_id_idx on public.issues (reporter_id);
create index issues_sprint_id_idx on public.issues (sprint_id) where sprint_id is not null;
create index issues_parent_issue_id_idx on public.issues (parent_issue_id) where parent_issue_id is not null;
create index issues_type_id_idx on public.issues (issue_type_id);
create index issues_priority_id_idx on public.issues (priority_id);
create index issues_due_date_idx on public.issues (due_date) where due_date is not null;

create table public.labels (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 40),
  color text not null default '#c2410c' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, name)
);

create index labels_project_id_idx on public.labels (project_id);

create table public.issue_labels (
  issue_id uuid not null references public.issues (id) on delete cascade,
  label_id uuid not null references public.labels (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (issue_id, label_id)
);

create index issue_labels_label_id_idx on public.issue_labels (label_id);

create table public.sprint_issues (
  sprint_id uuid not null references public.sprints (id) on delete cascade,
  issue_id uuid not null references public.issues (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (sprint_id, issue_id),
  unique (issue_id)
);

create index sprint_issues_sprint_id_idx on public.sprint_issues (sprint_id);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references public.issues (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete restrict,
  body text not null check (char_length(btrim(body)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index comments_issue_created_idx on public.comments (issue_id, created_at);

create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references public.issues (id) on delete cascade,
  comment_id uuid references public.comments (id) on delete set null,
  storage_path text not null unique,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes >= 0),
  uploaded_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index attachments_issue_id_idx on public.attachments (issue_id);
create index attachments_comment_id_idx on public.attachments (comment_id) where comment_id is not null;
create index attachments_uploaded_by_idx on public.attachments (uploaded_by);

create table public.issue_history (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references public.issues (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  field text not null,
  old_value text,
  new_value text,
  created_at timestamptz not null default now()
);

create index issue_history_issue_created_idx on public.issue_history (issue_id, created_at);

create table public.issue_links (
  id uuid primary key default gen_random_uuid(),
  source_issue_id uuid not null references public.issues (id) on delete cascade,
  target_issue_id uuid not null references public.issues (id) on delete cascade,
  link_type text not null check (link_type in ('blocks', 'relates', 'duplicates')),
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  check (source_issue_id <> target_issue_id),
  unique (source_issue_id, target_issue_id, link_type)
);

create index issue_links_target_issue_id_idx on public.issue_links (target_issue_id);
create index issue_links_created_by_idx on public.issue_links (created_by);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  project_id uuid references public.projects (id) on delete cascade,
  issue_id uuid references public.issues (id) on delete cascade,
  kind text not null check (kind in (
    'assigned',
    'mentioned',
    'commented',
    'issue_updated',
    'project_member_added',
    'sprint_changed'
  )),
  body text not null default '',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_created_idx on public.notifications (user_id, created_at desc);
create index notifications_user_unread_idx
  on public.notifications (user_id, created_at desc)
  where read_at is null;
create index notifications_project_id_idx on public.notifications (project_id);
create index notifications_issue_id_idx on public.notifications (issue_id);
create index notifications_actor_id_idx on public.notifications (actor_id);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    left(coalesce(nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1), 'User'), 80)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

insert into public.profiles (id, display_name)
select
  id,
  left(coalesce(nullif(btrim(raw_user_meta_data ->> 'full_name'), ''), split_part(email, '@', 1), 'User'), 80)
from auth.users
on conflict (id) do nothing;

create or replace function private.normalize_project()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.key = upper(btrim(new.key));
  new.name = btrim(new.name);
  if new.created_by is null then
    new.created_by = (select auth.uid());
  end if;
  if new.lead_id is null then
    new.lead_id = new.created_by;
  end if;
  return new;
end;
$$;

create trigger projects_normalize
  before insert or update on public.projects
  for each row execute function private.normalize_project();

create or replace function private.add_project_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.project_members (project_id, user_id, role)
  values (new.id, new.created_by, 'owner')
  on conflict (project_id, user_id) do nothing;
  return new;
end;
$$;

create trigger projects_add_owner
  after insert on public.projects
  for each row execute function private.add_project_owner();

create or replace function private.enforce_project_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  remaining_owners integer;
begin
  if tg_op = 'DELETE' and old.role = 'owner' then
    select count(*) into remaining_owners
    from public.project_members
    where project_id = old.project_id
      and role = 'owner'
      and user_id <> old.user_id;
    if remaining_owners = 0 then
      raise exception 'A project must keep at least one owner';
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

create trigger project_members_keep_owner
  before update or delete on public.project_members
  for each row execute function private.enforce_project_owner();

create or replace function private.assign_issue_number()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  assigned integer;
begin
  update public.projects
  set next_issue_number = next_issue_number + 1
  where id = new.project_id
  returning next_issue_number - 1 into assigned;

  if assigned is null then
    raise exception 'Project % does not exist', new.project_id;
  end if;

  new.issue_number = assigned;
  if new.reporter_id is null then
    new.reporter_id = (select auth.uid());
  end if;
  return new;
end;
$$;

create trigger issues_assign_number
  before insert on public.issues
  for each row execute function private.assign_issue_number();

create or replace function private.protect_issue_relations()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  parent_project uuid;
  sprint_project uuid;
begin
  if tg_op = 'UPDATE' then
    if new.project_id is distinct from old.project_id then
      raise exception 'Issues cannot move between projects';
    end if;
    if new.issue_number is distinct from old.issue_number then
      raise exception 'Issue numbers cannot change';
    end if;
  end if;

  if new.parent_issue_id is not null then
    select project_id into parent_project
    from public.issues
    where id = new.parent_issue_id;
    if parent_project is null or parent_project <> new.project_id then
      raise exception 'Parent issue must belong to the same project';
    end if;
    if new.parent_issue_id = new.id then
      raise exception 'An issue cannot be its own parent';
    end if;
  end if;

  if new.sprint_id is not null then
    select project_id into sprint_project
    from public.sprints
    where id = new.sprint_id;
    if sprint_project is null or sprint_project <> new.project_id then
      raise exception 'Sprint must belong to the same project';
    end if;
  end if;

  return new;
end;
$$;

create trigger issues_protect_relations
  before insert or update on public.issues
  for each row execute function private.protect_issue_relations();

create or replace function private.sync_sprint_issue()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and old.sprint_id is not distinct from new.sprint_id then
    return new;
  end if;

  delete from public.sprint_issues where issue_id = new.id;

  if new.sprint_id is not null then
    insert into public.sprint_issues (sprint_id, issue_id)
    values (new.sprint_id, new.id);
  end if;

  return new;
end;
$$;

create trigger issues_sync_sprint
  after insert or update of sprint_id on public.issues
  for each row execute function private.sync_sprint_issue();

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
  if new.sprint_id is distinct from old.sprint_id then
    insert into public.issue_history (issue_id, actor_id, field, old_value, new_value)
    values (new.id, actor, 'sprint', old.sprint_id::text, new.sprint_id::text);
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

create trigger issues_record_history
  after insert or update on public.issues
  for each row execute function private.record_issue_history();

create or replace function private.notify_issue_changes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
begin
  if new.assignee_id is not null
    and (tg_op = 'INSERT' or new.assignee_id is distinct from old.assignee_id)
    and new.assignee_id is distinct from actor
  then
    insert into public.notifications (user_id, actor_id, project_id, issue_id, kind, body)
    values (new.assignee_id, actor, new.project_id, new.id, 'assigned', new.title);
  end if;

  if tg_op = 'UPDATE' and new.sprint_id is distinct from old.sprint_id and new.assignee_id is not null
    and new.assignee_id is distinct from actor
  then
    insert into public.notifications (user_id, actor_id, project_id, issue_id, kind, body)
    values (new.assignee_id, actor, new.project_id, new.id, 'sprint_changed', new.title);
  end if;

  return new;
end;
$$;

create trigger issues_notify
  after insert or update of assignee_id, sprint_id on public.issues
  for each row execute function private.notify_issue_changes();

create or replace function private.notify_comment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  recipient uuid;
  project uuid;
begin
  select assignee_id, project_id into recipient, project
  from public.issues
  where id = new.issue_id;

  if recipient is not null and recipient is distinct from new.author_id then
    insert into public.notifications (user_id, actor_id, project_id, issue_id, kind, body)
    values (recipient, new.author_id, project, new.issue_id, 'commented', left(new.body, 140));
  end if;

  return new;
end;
$$;

create trigger comments_notify
  after insert on public.comments
  for each row execute function private.notify_comment();

create or replace function private.notify_project_member()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.user_id is distinct from (select auth.uid()) then
    insert into public.notifications (user_id, actor_id, project_id, kind, body)
    values (new.user_id, (select auth.uid()), new.project_id, 'project_member_added', 'You were added to a project');
  end if;
  return new;
end;
$$;

create trigger project_members_notify
  after insert on public.project_members
  for each row execute function private.notify_project_member();

create or replace function private.labels_same_project()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  label_project uuid;
  issue_project uuid;
begin
  select project_id into label_project from public.labels where id = new.label_id;
  select project_id into issue_project from public.issues where id = new.issue_id;
  if label_project is null or issue_project is null or label_project <> issue_project then
    raise exception 'Label and issue must belong to the same project';
  end if;
  return new;
end;
$$;

create trigger issue_labels_same_project
  before insert or update on public.issue_labels
  for each row execute function private.labels_same_project();

create trigger profiles_touch before update on public.profiles
  for each row execute function private.touch_updated_at();
create trigger projects_touch before update on public.projects
  for each row execute function private.touch_updated_at();
create trigger project_members_touch before update on public.project_members
  for each row execute function private.touch_updated_at();
create trigger sprints_touch before update on public.sprints
  for each row execute function private.touch_updated_at();
create trigger issues_touch before update on public.issues
  for each row execute function private.touch_updated_at();
create trigger labels_touch before update on public.labels
  for each row execute function private.touch_updated_at();
create trigger comments_touch before update on public.comments
  for each row execute function private.touch_updated_at();
create trigger attachments_touch before update on public.attachments
  for each row execute function private.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.issue_types enable row level security;
alter table public.issue_statuses enable row level security;
alter table public.priorities enable row level security;
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.sprints enable row level security;
alter table public.issues enable row level security;
alter table public.labels enable row level security;
alter table public.issue_labels enable row level security;
alter table public.sprint_issues enable row level security;
alter table public.comments enable row level security;
alter table public.attachments enable row level security;
alter table public.issue_history enable row level security;
alter table public.issue_links enable row level security;
alter table public.notifications enable row level security;

create policy issue_types_read on public.issue_types
  for select to authenticated using (true);
create policy issue_statuses_read on public.issue_statuses
  for select to authenticated using (true);
create policy priorities_read on public.priorities
  for select to authenticated using (true);

create policy profiles_select on public.profiles
  for select to authenticated
  using (
    id = (select auth.uid())
    or exists (
      select 1
      from public.project_members mine
      join public.project_members theirs on theirs.project_id = mine.project_id
      where mine.user_id = (select auth.uid())
        and theirs.user_id = profiles.id
    )
  );

create policy profiles_update on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy projects_select on public.projects
  for select to authenticated
  using (private.is_project_member(id));

create policy projects_insert on public.projects
  for insert to authenticated
  with check (created_by = (select auth.uid()));

create policy projects_update on public.projects
  for update to authenticated
  using (private.can_manage_project(id) or lead_id = (select auth.uid()))
  with check (private.can_manage_project(id) or lead_id = (select auth.uid()));

create policy project_members_select on public.project_members
  for select to authenticated
  using (private.is_project_member(project_id));

create policy project_members_insert on public.project_members
  for insert to authenticated
  with check (private.can_manage_project(project_id));

create policy project_members_update on public.project_members
  for update to authenticated
  using (private.can_manage_project(project_id))
  with check (private.can_manage_project(project_id));

create policy project_members_delete on public.project_members
  for delete to authenticated
  using (private.can_manage_project(project_id) or user_id = (select auth.uid()));

create policy sprints_select on public.sprints
  for select to authenticated
  using (private.is_project_member(project_id));

create policy sprints_insert on public.sprints
  for insert to authenticated
  with check (
    private.is_project_member(project_id)
    and created_by = (select auth.uid())
  );

create policy sprints_update on public.sprints
  for update to authenticated
  using (private.is_project_member(project_id))
  with check (private.is_project_member(project_id));

create policy sprints_delete on public.sprints
  for delete to authenticated
  using (private.is_project_member(project_id));

create policy issues_select on public.issues
  for select to authenticated
  using (private.is_project_member(project_id));

create policy issues_insert on public.issues
  for insert to authenticated
  with check (
    private.is_project_member(project_id)
    and reporter_id = (select auth.uid())
  );

create policy issues_update on public.issues
  for update to authenticated
  using (private.is_project_member(project_id))
  with check (private.is_project_member(project_id));

create policy issues_delete on public.issues
  for delete to authenticated
  using (
    private.can_manage_project(project_id)
    or reporter_id = (select auth.uid())
  );

create policy labels_all on public.labels
  for all to authenticated
  using (private.is_project_member(project_id))
  with check (private.is_project_member(project_id));

create policy issue_labels_all on public.issue_labels
  for all to authenticated
  using (
    exists (
      select 1 from public.issues
      where issues.id = issue_labels.issue_id
        and private.is_project_member(issues.project_id)
    )
  )
  with check (
    exists (
      select 1 from public.issues
      where issues.id = issue_labels.issue_id
        and private.is_project_member(issues.project_id)
    )
  );

create policy sprint_issues_select on public.sprint_issues
  for select to authenticated
  using (
    exists (
      select 1 from public.issues
      where issues.id = sprint_issues.issue_id
        and private.is_project_member(issues.project_id)
    )
  );

create policy comments_select on public.comments
  for select to authenticated
  using (
    exists (
      select 1 from public.issues
      where issues.id = comments.issue_id
        and private.is_project_member(issues.project_id)
    )
  );

create policy comments_insert on public.comments
  for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and exists (
      select 1 from public.issues
      where issues.id = comments.issue_id
        and private.is_project_member(issues.project_id)
    )
  );

create policy comments_update on public.comments
  for update to authenticated
  using (author_id = (select auth.uid()))
  with check (author_id = (select auth.uid()));

create policy comments_delete on public.comments
  for delete to authenticated
  using (author_id = (select auth.uid()));

create policy attachments_select on public.attachments
  for select to authenticated
  using (
    exists (
      select 1 from public.issues
      where issues.id = attachments.issue_id
        and private.is_project_member(issues.project_id)
    )
  );

create policy attachments_insert on public.attachments
  for insert to authenticated
  with check (
    uploaded_by = (select auth.uid())
    and exists (
      select 1 from public.issues
      where issues.id = attachments.issue_id
        and private.is_project_member(issues.project_id)
    )
  );

create policy attachments_delete on public.attachments
  for delete to authenticated
  using (
    uploaded_by = (select auth.uid())
    or exists (
      select 1 from public.issues
      where issues.id = attachments.issue_id
        and private.can_manage_project(issues.project_id)
    )
  );

create policy issue_history_select on public.issue_history
  for select to authenticated
  using (
    exists (
      select 1 from public.issues
      where issues.id = issue_history.issue_id
        and private.is_project_member(issues.project_id)
    )
  );

create policy issue_links_select on public.issue_links
  for select to authenticated
  using (
    exists (
      select 1 from public.issues
      where issues.id = issue_links.source_issue_id
        and private.is_project_member(issues.project_id)
    )
  );

create policy issue_links_insert on public.issue_links
  for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and exists (
      select 1 from public.issues source
      where source.id = issue_links.source_issue_id
        and private.is_project_member(source.project_id)
    )
    and exists (
      select 1 from public.issues target
      where target.id = issue_links.target_issue_id
        and private.is_project_member(target.project_id)
    )
  );

create policy issue_links_delete on public.issue_links
  for delete to authenticated
  using (
    exists (
      select 1 from public.issues
      where issues.id = issue_links.source_issue_id
        and private.is_project_member(issues.project_id)
    )
  );

create policy notifications_select on public.notifications
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy notifications_update on public.notifications
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

revoke all on table
  public.issue_types,
  public.issue_statuses,
  public.priorities,
  public.profiles,
  public.projects,
  public.project_members,
  public.sprints,
  public.issues,
  public.labels,
  public.issue_labels,
  public.sprint_issues,
  public.comments,
  public.attachments,
  public.issue_history,
  public.issue_links,
  public.notifications
from anon;

grant select on table
  public.issue_types,
  public.issue_statuses,
  public.priorities,
  public.profiles,
  public.projects,
  public.project_members,
  public.sprints,
  public.issues,
  public.labels,
  public.issue_labels,
  public.sprint_issues,
  public.comments,
  public.attachments,
  public.issue_history,
  public.issue_links,
  public.notifications
to authenticated;

grant insert, update on table public.profiles to authenticated;
grant insert, update on table public.projects to authenticated;
grant insert, update, delete on table public.project_members to authenticated;
grant insert, update, delete on table public.sprints to authenticated;
grant insert, update, delete on table public.issues to authenticated;
grant insert, update, delete on table public.labels to authenticated;
grant insert, update, delete on table public.issue_labels to authenticated;
grant insert, update, delete on table public.comments to authenticated;
grant insert, delete on table public.attachments to authenticated;
grant insert, delete on table public.issue_links to authenticated;
grant update on table public.notifications to authenticated;

-- ---------------------------------------------------------------------------
-- Storage
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'attachments',
  'attachments',
  false,
  52428800,
  array[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain',
    'text/markdown',
    'text/csv',
    'application/json',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]
);

create policy attachments_objects_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'attachments'
    and private.is_project_member(private.storage_project_id(name))
  );

create policy attachments_objects_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'attachments'
    and private.is_project_member(private.storage_project_id(name))
  );

create policy attachments_objects_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'attachments'
    and private.is_project_member(private.storage_project_id(name))
  )
  with check (
    bucket_id = 'attachments'
    and private.is_project_member(private.storage_project_id(name))
  );

create policy attachments_objects_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'attachments'
    and private.is_project_member(private.storage_project_id(name))
    and (
      owner_id = (select auth.uid())::text
      or private.can_manage_project(private.storage_project_id(name))
    )
  );

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------

alter publication supabase_realtime add table public.issues, public.comments, public.notifications;

revoke all on function private.handle_new_user() from public;
revoke all on function private.normalize_project() from public;
revoke all on function private.add_project_owner() from public;
revoke all on function private.enforce_project_owner() from public;
revoke all on function private.assign_issue_number() from public;
revoke all on function private.protect_issue_relations() from public;
revoke all on function private.sync_sprint_issue() from public;
revoke all on function private.record_issue_history() from public;
revoke all on function private.notify_issue_changes() from public;
revoke all on function private.notify_comment() from public;
revoke all on function private.notify_project_member() from public;
revoke all on function private.labels_same_project() from public;

grant execute on function private.normalize_project() to authenticated;
grant execute on function private.add_project_owner() to authenticated;
grant execute on function private.enforce_project_owner() to authenticated;
grant execute on function private.assign_issue_number() to authenticated;
grant execute on function private.protect_issue_relations() to authenticated;
grant execute on function private.sync_sprint_issue() to authenticated;
grant execute on function private.record_issue_history() to authenticated;
grant execute on function private.notify_issue_changes() to authenticated;
grant execute on function private.notify_comment() to authenticated;
grant execute on function private.notify_project_member() to authenticated;
grant execute on function private.labels_same_project() to authenticated;
