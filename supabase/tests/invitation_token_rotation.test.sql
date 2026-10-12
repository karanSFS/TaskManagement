-- Checks for 20261012090000_rotate_invitation_token.sql.
-- Runs in one transaction and rolls back. Throwaway database only:
--   psql -h /tmp/fixtask-pg -p 55432 -U postgres -v ON_ERROR_STOP=1 -f supabase/tests/invitation_token_rotation.test.sql

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
  ('00000000-0000-4000-8000-0000000000c1', 'owner.rotate@example.com', '{"full_name":"Owner"}');

select pg_temp.act_as('00000000-0000-4000-8000-0000000000c1');
insert into public.projects (id, name, key, created_by) values
  ('00000000-0000-4000-8000-0000000000c2', 'Rotate', 'ROTA', '00000000-0000-4000-8000-0000000000c1');

do $$
declare
  first_token uuid;
  second_token uuid;
  landing jsonb;
begin
  select (public.create_project_invitation('00000000-0000-4000-8000-0000000000c2', 'new.person@example.com', 'member')->>'token')::uuid
    into first_token;
  select (public.create_project_invitation('00000000-0000-4000-8000-0000000000c2', 'new.person@example.com', 'member')->>'token')::uuid
    into second_token;

  if first_token is null or second_token is null or first_token = second_token then
    raise exception 'FAIL  resend rotates the token (% -> %)', first_token, second_token;
  end if;

  landing := public.invitation_landing(first_token);
  if landing is not null then
    raise exception 'FAIL  old invitation link still opens';
  end if;

  landing := public.invitation_landing(second_token);
  if landing is null or landing->>'email' is distinct from 'new.person@example.com' then
    raise exception 'FAIL  new invitation link does not open (%)', landing;
  end if;

  raise notice 'PASS  resend rotates the invitation token';
end;
$$;

rollback;
