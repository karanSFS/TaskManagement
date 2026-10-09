-- Record type and description changes alongside the fields already stored.

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
