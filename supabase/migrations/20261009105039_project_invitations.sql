-- Invitations replace instant membership. Accept is what adds a project member.
-- A pending invite lasts 7 days. Listing marks overdue rows expired and notifies once.

alter table public.notifications drop constraint if exists notifications_kind_check;

alter table public.notifications
  add constraint notifications_kind_check check (kind in (
    'assigned',
    'mentioned',
    'commented',
    'issue_updated',
    'project_member_added',
    'sprint_changed',
    'project_invited',
    'invitation_accepted',
    'invitation_rejected',
    'invitation_expired',
    'invitation_revoked'
  ));

create table public.project_invitations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  email text not null check (position('@' in email) > 1),
  role text not null check (role in ('owner', 'admin', 'member')),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected', 'expired', 'revoked')),
  token uuid not null unique default gen_random_uuid(),
  invited_by uuid references public.profiles (id) on delete set null,
  invitee_notified boolean not null default false,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  responded_at timestamptz
);

create unique index project_invitations_one_pending_idx
  on public.project_invitations (project_id, email)
  where status = 'pending';

create index project_invitations_email_idx on public.project_invitations (email, status);
create index project_invitations_project_idx on public.project_invitations (project_id, created_at desc);

alter table public.project_invitations enable row level security;

create or replace function private.current_email()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select lower(email) from auth.users where id = (select auth.uid());
$$;

create policy project_invitations_select on public.project_invitations
  for select to authenticated
  using (
    private.can_manage_project(project_id)
    or email = private.current_email()
  );

create or replace function private.expire_project_invitations()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  row record;
begin
  for row in
    update public.project_invitations as invitation
    set status = 'expired', responded_at = now()
    where invitation.status = 'pending'
      and invitation.expires_at < now()
    returning invitation.id, invitation.project_id, invitation.invited_by, invitation.email
  loop
    if row.invited_by is not null then
      insert into public.notifications (user_id, actor_id, project_id, kind, body)
      values (row.invited_by, row.invited_by, row.project_id, 'invitation_expired', row.email);
    end if;
  end loop;
end;
$$;

create or replace function private.notify_current_invitee()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  actor_email text := private.current_email();
  row record;
begin
  if actor is null or actor_email is null then
    return;
  end if;

  for row in
    select invitation.id, invitation.project_id, invitation.invited_by
    from public.project_invitations as invitation
    where invitation.email = actor_email
      and invitation.status = 'pending'
      and invitation.invitee_notified = false
      and invitation.expires_at >= now()
  loop
    insert into public.notifications (user_id, actor_id, project_id, kind, body)
    values (actor, row.invited_by, row.project_id, 'project_invited', 'You have a project invitation');
    update public.project_invitations
    set invitee_notified = true
    where id = row.id;
  end loop;
end;
$$;

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

create or replace function private.respond_to_invitation(
  target_invitation_id uuid,
  decision text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  actor_email text := private.current_email();
  invite public.project_invitations%rowtype;
  clean_decision text := lower(btrim(coalesce(decision, '')));
begin
  if actor is null or actor_email is null then
    raise exception 'Sign in to manage members';
  end if;

  if clean_decision not in ('accept', 'reject') then
    raise exception 'Choose accept or reject';
  end if;

  select * into invite
  from public.project_invitations
  where id = target_invitation_id;

  if not found then
    raise exception 'This invitation is no longer open';
  end if;

  if invite.email <> actor_email then
    raise exception 'This invitation was sent to another email';
  end if;

  if invite.status = 'pending' and invite.expires_at < now() then
    update public.project_invitations
    set status = 'expired', responded_at = now()
    where id = invite.id;
    if invite.invited_by is not null then
      insert into public.notifications (user_id, actor_id, project_id, kind, body)
      values (invite.invited_by, invite.invited_by, invite.project_id, 'invitation_expired', invite.email);
    end if;
    raise exception 'This invitation has expired';
  end if;

  if invite.status <> 'pending' then
    raise exception 'This invitation is no longer open';
  end if;

  if clean_decision = 'accept' then
    insert into public.profiles (id, display_name)
    values (actor, left(split_part(actor_email, '@', 1), 80))
    on conflict (id) do nothing;

    insert into public.project_members (project_id, user_id, role)
    values (invite.project_id, actor, invite.role)
    on conflict (project_id, user_id) do nothing;

    update public.project_invitations
    set status = 'accepted', responded_at = now()
    where id = invite.id;

    if invite.invited_by is not null and invite.invited_by <> actor then
      insert into public.notifications (user_id, actor_id, project_id, kind, body)
      values (invite.invited_by, actor, invite.project_id, 'invitation_accepted', invite.email);
    end if;
    return;
  end if;

  update public.project_invitations
  set status = 'rejected', responded_at = now()
  where id = invite.id;

  if invite.invited_by is not null and invite.invited_by <> actor then
    insert into public.notifications (user_id, actor_id, project_id, kind, body)
    values (invite.invited_by, actor, invite.project_id, 'invitation_rejected', invite.email);
  end if;
end;
$$;

create or replace function private.revoke_project_invitation(target_invitation_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  invite public.project_invitations%rowtype;
  target_user uuid;
begin
  if actor is null then
    raise exception 'Sign in to manage members';
  end if;

  select * into invite
  from public.project_invitations
  where id = target_invitation_id;

  if not found or invite.status <> 'pending' then
    raise exception 'This invitation is no longer open';
  end if;

  if not private.can_manage_project(invite.project_id) then
    raise exception 'You cannot manage members of this project';
  end if;

  update public.project_invitations
  set status = 'revoked', responded_at = now()
  where id = invite.id;

  select profile.id into target_user
  from public.profiles as profile
  join auth.users as account on account.id = profile.id
  where lower(account.email) = invite.email;

  if target_user is not null then
    insert into public.notifications (user_id, actor_id, project_id, kind, body)
    values (target_user, actor, invite.project_id, 'invitation_revoked', invite.email);
  end if;
end;
$$;

create or replace function private.invitation_preview(target_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  invite public.project_invitations%rowtype;
  project_name text;
  project_key text;
  inviter_name text;
begin
  if (select auth.uid()) is null then
    raise exception 'Sign in to manage members';
  end if;

  perform private.expire_project_invitations();

  select * into invite
  from public.project_invitations
  where token = target_token;

  if not found then
    return null;
  end if;

  select name, key into project_name, project_key
  from public.projects
  where id = invite.project_id;

  select display_name into inviter_name
  from public.profiles
  where id = invite.invited_by;

  return jsonb_build_object(
    'id', invite.id,
    'email', invite.email,
    'role', invite.role,
    'status', invite.status,
    'expiresAt', invite.expires_at,
    'projectName', coalesce(project_name, 'Project'),
    'projectKey', coalesce(project_key, ''),
    'inviterName', coalesce(inviter_name, 'A teammate'),
    'emailMatches', invite.email = private.current_email()
  );
end;
$$;

create or replace function public.sync_invitations()
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  perform private.expire_project_invitations();
  perform private.notify_current_invitee();
end;
$$;

create or replace function public.create_project_invitation(
  target_project_id uuid,
  member_email text,
  member_role text
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.create_project_invitation(target_project_id, member_email, member_role);
$$;

create or replace function public.respond_to_invitation(
  target_invitation_id uuid,
  decision text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  perform private.respond_to_invitation(target_invitation_id, decision);
end;
$$;

create or replace function public.revoke_project_invitation(target_invitation_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  perform private.revoke_project_invitation(target_invitation_id);
end;
$$;

create or replace function public.invitation_preview(target_token uuid)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.invitation_preview(target_token);
$$;

revoke all on function private.current_email() from public;
revoke all on function private.expire_project_invitations() from public;
revoke all on function private.notify_current_invitee() from public;
revoke all on function private.create_project_invitation(uuid, text, text) from public;
revoke all on function private.respond_to_invitation(uuid, text) from public;
revoke all on function private.revoke_project_invitation(uuid) from public;
revoke all on function private.invitation_preview(uuid) from public;
revoke all on function public.sync_invitations() from public, anon;
revoke all on function public.create_project_invitation(uuid, text, text) from public, anon;
revoke all on function public.respond_to_invitation(uuid, text) from public, anon;
revoke all on function public.revoke_project_invitation(uuid) from public, anon;
revoke all on function public.invitation_preview(uuid) from public, anon;

grant execute on function private.current_email() to authenticated;
grant execute on function private.expire_project_invitations() to authenticated;
grant execute on function private.notify_current_invitee() to authenticated;
grant execute on function private.create_project_invitation(uuid, text, text) to authenticated;
grant execute on function private.respond_to_invitation(uuid, text) to authenticated;
grant execute on function private.revoke_project_invitation(uuid) to authenticated;
grant execute on function private.invitation_preview(uuid) to authenticated;
grant execute on function public.sync_invitations() to authenticated;
grant execute on function public.create_project_invitation(uuid, text, text) to authenticated;
grant execute on function public.respond_to_invitation(uuid, text) to authenticated;
grant execute on function public.revoke_project_invitation(uuid) to authenticated;
grant execute on function public.invitation_preview(uuid) to authenticated;

grant select on table public.project_invitations to authenticated;
