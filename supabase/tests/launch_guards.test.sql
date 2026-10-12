-- Checks for 20261012100000_launch_guards.sql.
-- Runs in one transaction and rolls back. Throwaway database only:
--   psql -h /tmp/fixtask-pg -p 55432 -U postgres -v ON_ERROR_STOP=1 -f supabase/tests/launch_guards.test.sql

begin;

create function pg_temp.act_as(target uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(target::text, ''), true);
  if target is null then
    execute 'reset role';
  else
    execute 'set local role authenticated';
  end if;
end;
$$;

grant execute on function pg_temp.act_as(uuid) to authenticated;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-4000-8000-0000000000d1', 'owner.launch@example.com', '{"full_name":"Owner"}');

select pg_temp.act_as('00000000-0000-4000-8000-0000000000d1');
insert into public.projects (id, name, key, created_by) values
  ('00000000-0000-4000-8000-0000000000d2', 'Launch', 'LNCH', '00000000-0000-4000-8000-0000000000d1');

do $$
declare
  status_id uuid;
  type_id uuid;
  priority_id uuid;
  issue_id uuid := '00000000-0000-4000-8000-0000000000d3';
  queued text;
  sent integer;
  blocked boolean := false;
begin
  select id into status_id from public.issue_statuses where category = 'todo' order by position limit 1;
  select id into type_id from public.issue_types order by position limit 1;
  select id into priority_id from public.priorities order by rank limit 1;

  insert into public.issues (id, project_id, issue_number, title, issue_type_id, status_id, priority_id, reporter_id)
  values (issue_id, '00000000-0000-4000-8000-0000000000d2', 1, 'Queued file', type_id, status_id, priority_id, '00000000-0000-4000-8000-0000000000d1');

  insert into public.attachments (issue_id, storage_path, file_name, mime_type, size_bytes, uploaded_by)
  values (issue_id, 'launch/note.txt', 'note.txt', 'text/plain', 12, '00000000-0000-4000-8000-0000000000d1');

  delete from public.attachments where storage_path = 'launch/note.txt';
  perform pg_temp.act_as(null);
  select object_path into queued from public.storage_cleanup where object_path = 'launch/note.txt';
  perform pg_temp.act_as('00000000-0000-4000-8000-0000000000d1');
  if queued is distinct from 'launch/note.txt' then
    raise exception 'FAIL  deleted attachment was not queued (%)', queued;
  end if;

  for sent in 1..20 loop
    perform public.create_project_invitation(
      '00000000-0000-4000-8000-0000000000d2',
      'person' || sent || '@example.com',
      'member'
    );
  end loop;

  begin
    perform public.create_project_invitation('00000000-0000-4000-8000-0000000000d2', 'over-limit@example.com', 'member');
  exception
    when others then
      blocked := sqlerrm like '%Too many invitations%';
      if not blocked then
        raise exception 'FAIL  unexpected invitation error: %', sqlerrm;
      end if;
  end;

  if not blocked then
    raise exception 'FAIL  the 21st invitation was allowed';
  end if;

  raise notice 'PASS  attachment cleanup is queued and invitations stop at 20 per hour';
end;
$$;

rollback;
