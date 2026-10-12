-- Checks for 20261012050000_security_hardening.sql.
-- Runs in one transaction and rolls back. Run against a local or throwaway database only:
--   psql "$LOCAL_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/security_hardening.test.sql

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
  ('00000000-0000-4000-8000-00000000000a', 'owner@example.com', '{"full_name":"Owner"}'),
  ('00000000-0000-4000-8000-00000000000b', 'member@example.com', '{"full_name":"Member"}'),
  ('00000000-0000-4000-8000-00000000000c', 'outsider@example.com', '{"full_name":"Outsider"}');

select pg_temp.act_as('00000000-0000-4000-8000-00000000000a');
insert into public.projects (id, name, key, created_by) values
  ('00000000-0000-4000-8000-0000000000a1', 'Alpha', 'ALPHA', '00000000-0000-4000-8000-00000000000a'),
  ('00000000-0000-4000-8000-0000000000a2', 'Beta', 'BETA', '00000000-0000-4000-8000-00000000000a');

select pg_temp.act_as(null);
insert into public.project_members (project_id, user_id, role) values
  ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-00000000000b', 'member'),
  ('00000000-0000-4000-8000-0000000000a2', '00000000-0000-4000-8000-00000000000b', 'member');

select pg_temp.act_as('00000000-0000-4000-8000-00000000000a');
insert into public.issues (id, project_id, issue_number, title, issue_type_id, status_id, priority_id, reporter_id)
select '00000000-0000-4000-8000-0000000000e1', '00000000-0000-4000-8000-0000000000a1', 1, 'First',
  (select id from public.issue_types order by position limit 1),
  (select id from public.issue_statuses order by position limit 1),
  (select id from public.priorities order by rank limit 1),
  '00000000-0000-4000-8000-00000000000a';
insert into public.issues (id, project_id, issue_number, title, issue_type_id, status_id, priority_id, reporter_id)
select '00000000-0000-4000-8000-0000000000e2', '00000000-0000-4000-8000-0000000000a2', 1, 'Other project',
  (select id from public.issue_types order by position limit 1),
  (select id from public.issue_statuses order by position limit 1),
  (select id from public.priorities order by rank limit 1),
  '00000000-0000-4000-8000-00000000000a';
insert into public.comments (id, issue_id, author_id, body) values
  ('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000e1', '00000000-0000-4000-8000-00000000000a', 'Owner note');
insert into public.labels (id, project_id, name) values
  ('00000000-0000-4000-8000-0000000000f1', '00000000-0000-4000-8000-0000000000a1', 'bug');
insert into public.sprints (id, project_id, name, created_by) values
  ('00000000-0000-4000-8000-0000000000d1', '00000000-0000-4000-8000-0000000000a1', 'Sprint 1', '00000000-0000-4000-8000-00000000000a');

select pg_temp.act_as('00000000-0000-4000-8000-00000000000b');

select pg_temp.expect_error('member cannot take over the reporter',
  $$update public.issues set reporter_id = '00000000-0000-4000-8000-00000000000b' where id = '00000000-0000-4000-8000-0000000000e1'$$);
select pg_temp.expect_error('assignee must be a project member',
  $$update public.issues set assignee_id = '00000000-0000-4000-8000-00000000000c' where id = '00000000-0000-4000-8000-0000000000e1'$$);
select pg_temp.expect_rows('member can assign a teammate',
  $$update public.issues set assignee_id = '00000000-0000-4000-8000-00000000000b' where id = '00000000-0000-4000-8000-0000000000e1'$$, 1);
select pg_temp.expect_error('linked issues stay in one project',
  $$insert into public.issue_links (source_issue_id, target_issue_id, link_type, created_by) values ('00000000-0000-4000-8000-0000000000e1', '00000000-0000-4000-8000-0000000000e2', 'relates', '00000000-0000-4000-8000-00000000000b')$$);
select pg_temp.expect_error('add_project_member is not callable',
  $$select public.add_project_member('00000000-0000-4000-8000-0000000000a1', 'outsider@example.com', 'member')$$);
select pg_temp.expect_error('sprint status changes only through start_sprint',
  $$update public.sprints set status = 'active' where id = '00000000-0000-4000-8000-0000000000d1'$$);
select pg_temp.expect_rows('member cannot delete a label',
  $$delete from public.labels where id = '00000000-0000-4000-8000-0000000000f1'$$, 0);
select pg_temp.expect_rows('member cannot delete a planned sprint',
  $$delete from public.sprints where id = '00000000-0000-4000-8000-0000000000d1'$$, 0);

insert into public.comments (id, issue_id, author_id, body) values
  ('00000000-0000-4000-8000-0000000000c2', '00000000-0000-4000-8000-0000000000e1', '00000000-0000-4000-8000-00000000000b', 'Member note');
select pg_temp.expect_error('comment cannot move to another issue',
  $$update public.comments set issue_id = '00000000-0000-4000-8000-0000000000e2' where id = '00000000-0000-4000-8000-0000000000c2'$$);
select pg_temp.expect_rows('author can edit their comment',
  $$update public.comments set body = 'Edited' where id = '00000000-0000-4000-8000-0000000000c2'$$, 1);

select pg_temp.act_as('00000000-0000-4000-8000-00000000000a');
select public.start_sprint('00000000-0000-4000-8000-0000000000d1');
select public.complete_sprint('00000000-0000-4000-8000-0000000000d1');
select pg_temp.expect_error('completed sprint is read-only',
  $$update public.sprints set name = 'Renamed' where id = '00000000-0000-4000-8000-0000000000d1'$$);
select pg_temp.expect_rows('owner can remove a member comment',
  $$delete from public.comments where id = '00000000-0000-4000-8000-0000000000c2'$$, 1);
select pg_temp.expect_rows('owner can delete a label',
  $$delete from public.labels where id = '00000000-0000-4000-8000-0000000000f1'$$, 1);

select pg_temp.act_as(null);
insert into public.notifications (id, user_id, kind, body)
values ('00000000-0000-4000-8000-0000000000b1', '00000000-0000-4000-8000-00000000000b', 'assigned', 'Hello');

select pg_temp.act_as('00000000-0000-4000-8000-00000000000b');
select pg_temp.expect_error('notification body is read-only',
  $$update public.notifications set body = 'Changed' where id = '00000000-0000-4000-8000-0000000000b1'$$);
select pg_temp.expect_rows('recipient can mark a notification read',
  $$update public.notifications set read_at = now() where id = '00000000-0000-4000-8000-0000000000b1'$$, 1);

select pg_temp.act_as('00000000-0000-4000-8000-00000000000a');
update public.projects set archived_at = now() where id = '00000000-0000-4000-8000-0000000000a1';
select pg_temp.expect_error('archived project cannot take invitations',
  $$select public.create_project_invitation('00000000-0000-4000-8000-0000000000a1', 'outsider@example.com', 'member')$$);

rollback;
