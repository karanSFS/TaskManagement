-- Public landing for an invitation link. Anyone holding the secret token can see
-- who invited them to which project, so a person without an account can choose
-- between creating one and signing in. It never reveals other invitations.

create or replace function public.invitation_landing(target_token uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  invite public.project_invitations%rowtype;
  status text;
begin
  select * into invite
  from public.project_invitations
  where token = target_token;

  if not found then
    return null;
  end if;

  status := case
    when invite.status = 'pending' and invite.expires_at < now() then 'expired'
    else invite.status
  end;

  return jsonb_build_object(
    'email', invite.email,
    'role', invite.role,
    'status', status,
    'expiresAt', invite.expires_at,
    'projectName', coalesce((select name from public.projects where id = invite.project_id), 'Project'),
    'projectKey', coalesce((select key from public.projects where id = invite.project_id), ''),
    'inviterName', coalesce((select display_name from public.profiles where id = invite.invited_by), 'A teammate'),
    'hasAccount', exists (select 1 from auth.users where lower(email) = invite.email)
  );
end;
$$;

revoke all on function public.invitation_landing(uuid) from public;
grant execute on function public.invitation_landing(uuid) to anon, authenticated;
