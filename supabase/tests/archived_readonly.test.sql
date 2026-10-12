-- Checks for 20261012080000_archived_readonly_and_sprint_history.sql.
-- Runs in one transaction and rolls back. Throwaway database only:
--   psql -h /tmp/fixtask-pg -p 55432 -U postgres -v ON_ERROR_STOP=1 -f supabase/tests/archived_readonly.test.sql

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

create function pg_temp.expect_error(label text, statement text) returns void language plpgsql as $$
begin
  begin
    execute statement;
  exception when others then
    raise notice 'PASS  % (%)', label, sqlerrm;
    return;
  end;
  raise exception 'FAIL  % (statement succeeded)', label;
end;
$$;

create function pg_temp.expect_rows(label text, statement text, expected integer) returns void language plpgsql as $$
declare
  affected integer;
begin
  execute statement;
  get diagnostics affected = row_count;
  if affected <> expected then
    raise exception 'FAIL  % (% rows, expected %)', label, affected, expected;
  end if;
  raise notice 'PASS  %', label;
end;
$$;

grant execute on all functions in schema pg_temp to authenticated;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-4000-8000-0000000000b1', 'owner.archive@example.com', '{"full_name":"Owner"}'),
  ('00000000-0000-4000-8000-0000000000b2', 'member.archive@example.com', '{"full_name":"Member"}');

select pg_temp.act_as('00000000-0000-4000-8000-0000000000b1');
insert into public.projects (id, name, key, created_by) values
  ('00000000-0000-4000-8000-0000000000b3', 'Archive me', 'ARCH', '00000000-0000-4000-8000-0000000000b1');

select pg_temp.act_as(null);
insert into public.project_members (project_id, user_id, role) values
  ('00000000-0000-4000-8000-0000000000b3', '00000000-0000-4000-8000-0000000000b2', 'member');

select pg_temp.act_as('00000000-0000-4000-8000-0000000000b1');
insert into public.issues (id, project_id, issue_number, title, issue_type_id, status_id, priority_id, reporter_id)
select '00000000-0000-4000-8000-0000000000b4', '00000000-0000-4000-8000-0000000000b3', 1, 'Open work',
  (select id from public.issue_types order by position limit 1),
  (select id from public.issue_statuses where category <> 'done' order by position limit 1),
  (select id from public.priorities order by rank limit 1),
  '00000000-0000-4000-8000-0000000000b1';
insert into public.sprints (id, project_id, name, created_by) values
  ('00000000-0000-4000-8000-0000000000b5', '00000000-0000-4000-8000-0000000000b3', 'Now', '00000000-0000-4000-8000-0000000000b1'),
  ('00000000-0000-4000-8000-0000000000b6', '00000000-0000-4000-8000-0000000000b3', 'Later', '00000000-0000-4000-8000-0000000000b1');

select public.start_sprint('00000000-0000-4000-8000-0000000000b5');
update public.issues set sprint_id = '00000000-0000-4000-8000-0000000000b5'
where id = '00000000-0000-4000-8000-0000000000b4';

do $$
declare
  recorded text;
begin
  select new_value into recorded
  from public.issue_history
  where issue_id = '00000000-0000-4000-8000-0000000000b4'
    and field = 'sprint'
  order by created_at desc
  limit 1;
  if recorded is distinct from 'Now' then
    raise exception 'FAIL  sprint history stores the name (got %)', recorded;
  end if;
  raise notice 'PASS  sprint history stores the name';
end;
$$;

update public.projects set archived_at = now() where id = '00000000-0000-4000-8000-0000000000b3';

select pg_temp.expect_error('archived issue cannot be edited',
  $$update public.issues set title = 'Changed' where id = '00000000-0000-4000-8000-0000000000b4'$$);
select pg_temp.expect_error('archived issue cannot be deleted',
  $$delete from public.issues where id = '00000000-0000-4000-8000-0000000000b4'$$);
select pg_temp.expect_error('archived project cannot take a comment',
  $$insert into public.comments (issue_id, author_id, body) values ('00000000-0000-4000-8000-0000000000b4', '00000000-0000-4000-8000-0000000000b1', 'Nope')$$);
select pg_temp.expect_error('archived project cannot take a label',
  $$insert into public.labels (project_id, name) values ('00000000-0000-4000-8000-0000000000b3', 'late')$$);
select pg_temp.expect_error('archived project cannot take a sprint',
  $$insert into public.sprints (project_id, name, created_by) values ('00000000-0000-4000-8000-0000000000b3', 'Extra', '00000000-0000-4000-8000-0000000000b1')$$);
select pg_temp.expect_error('archived project cannot start a sprint',
  $$select public.start_sprint('00000000-0000-4000-8000-0000000000b6')$$);
select pg_temp.expect_error('archived project settings stay put',
  $$update public.projects set name = 'Renamed' where id = '00000000-0000-4000-8000-0000000000b3'$$);

select pg_temp.expect_rows('member role can still change',
  $$update public.project_members set role = 'admin' where project_id = '00000000-0000-4000-8000-0000000000b3' and user_id = '00000000-0000-4000-8000-0000000000b2'$$, 1);

select public.complete_sprint('00000000-0000-4000-8000-0000000000b5');

do $$
declare
  sprint_status text;
  still_scheduled uuid;
  removed text;
begin
  select status into sprint_status from public.sprints where id = '00000000-0000-4000-8000-0000000000b5';
  select sprint_id into still_scheduled from public.issues where id = '00000000-0000-4000-8000-0000000000b4';
  select old_value into removed
  from public.issue_history
  where issue_id = '00000000-0000-4000-8000-0000000000b4'
    and field = 'sprint'
    and new_value is null;
  if sprint_status is distinct from 'completed' or still_scheduled is not null or removed is distinct from 'Now' then
    raise exception 'FAIL  complete sprint on archived project (status %, sprint %, history %)', sprint_status, still_scheduled, removed;
  end if;
  raise notice 'PASS  complete sprint on archived project';
end;
$$;

select pg_temp.expect_rows('archived project can be restored',
  $$update public.projects set archived_at = null where id = '00000000-0000-4000-8000-0000000000b3'$$, 1);
select pg_temp.expect_rows('restored project can be edited',
  $$update public.issues set title = 'Changed' where id = '00000000-0000-4000-8000-0000000000b4'$$, 1);

update public.projects set archived_at = now() where id = '00000000-0000-4000-8000-0000000000b3';
select pg_temp.expect_rows('archived project can be deleted',
  $$delete from public.projects where id = '00000000-0000-4000-8000-0000000000b3'$$, 1);

rollback;
