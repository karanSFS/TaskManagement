-- Comments already notify the assignee. Mentions notify other project members
-- whose display name appears as @Name in the comment. Longer names win, so
-- @Ann Smith does not also notify a member named Ann.

create or replace function private.notify_comment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  recipient uuid;
  project uuid;
  member record;
  needle text;
  working text;
begin
  select assignee_id, project_id into recipient, project
  from public.issues
  where id = new.issue_id;

  if recipient is not null and recipient is distinct from new.author_id then
    insert into public.notifications (user_id, actor_id, project_id, issue_id, kind, body)
    values (recipient, new.author_id, project, new.issue_id, 'commented', left(new.body, 140));
  end if;

  working := lower(new.body);
  for member in
    select pm.user_id, btrim(p.display_name) as display_name
    from public.project_members pm
    join public.profiles p on p.id = pm.user_id
    where pm.project_id = project
      and char_length(btrim(p.display_name)) >= 2
      and position('@' in p.display_name) = 0
      and position(E'\n' in p.display_name) = 0
      and pm.user_id is distinct from new.author_id
      and pm.user_id is distinct from recipient
    order by char_length(btrim(p.display_name)) desc
  loop
    needle := lower('@' || member.display_name);
    if position(needle in working) > 0 then
      insert into public.notifications (user_id, actor_id, project_id, issue_id, kind, body)
      values (member.user_id, new.author_id, project, new.issue_id, 'mentioned', left(new.body, 140));
      working := replace(working, needle, '');
    end if;
  end loop;

  return new;
end;
$$;
