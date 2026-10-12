-- Resending an invitation replaces the link. The previous token no longer opens it.

create or replace function private.create_project_invitation(
  target_project_id uuid,
  member_email text,
  member_role text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  clean_email text := lower(btrim(coalesce(member_email, '')));
  clean_role text := lower(btrim(coalesce(member_role, '')));
  invite public.project_invitations%rowtype;
  project_name text;
  project_key text;
  inviter_name text;
  resent boolean := false;
  target_user uuid;
begin
  if actor is null then
    raise exception 'Sign in to manage members';
  end if;

  if clean_role not in ('owner', 'admin', 'member') then
    raise exception 'Role must be owner, admin, or member';
  end if;

  if position('@' in clean_email) = 0 then
    raise exception 'Enter a valid email';
  end if;

  if not private.can_manage_project(target_project_id) then
    raise exception 'You cannot manage members of this project';
  end if;

  if clean_role = 'owner' and private.project_role(target_project_id) is distinct from 'owner' then
    raise exception 'Only an owner can add another owner';
  end if;

  if exists (
    select 1
    from public.project_members as member
    join auth.users as account on account.id = member.user_id
    where member.project_id = target_project_id
      and lower(account.email) = clean_email
  ) then
    raise exception 'That account is already a member';
  end if;

  select name, key into project_name, project_key
  from public.projects
  where id = target_project_id;

  if project_name is null then
    raise exception 'You cannot manage members of this project';
  end if;

  select display_name into inviter_name
  from public.profiles
  where id = actor;

  update public.project_invitations
  set
    role = clean_role,
    invited_by = actor,
    token = gen_random_uuid(),
    expires_at = now() + interval '7 days'
  where project_id = target_project_id
    and email = clean_email
    and status = 'pending'
  returning * into invite;

  if found then
    resent := true;
  else
    insert into public.project_invitations (project_id, email, role, invited_by)
    values (target_project_id, clean_email, clean_role, actor)
    returning * into invite;
  end if;

  select profile.id into target_user
  from public.profiles as profile
  join auth.users as account on account.id = profile.id
  where lower(account.email) = clean_email;

  if target_user is not null and not invite.invitee_notified then
    insert into public.notifications (user_id, actor_id, project_id, kind, body)
    values (target_user, actor, target_project_id, 'project_invited', project_name);
    update public.project_invitations
    set invitee_notified = true
    where id = invite.id;
  end if;

  return jsonb_build_object(
    'id', invite.id,
    'token', invite.token,
    'email', invite.email,
    'role', invite.role,
    'projectName', project_name,
    'projectKey', project_key,
    'inviterName', coalesce(inviter_name, 'A teammate'),
    'expiresAt', invite.expires_at,
    'resent', resent
  );
end;
$$;
