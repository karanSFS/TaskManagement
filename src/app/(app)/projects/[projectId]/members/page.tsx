import { notFound } from "next/navigation"
import { Suspense } from "react"

import { InvitationList } from "@/components/projects/invitation-list"
import { MemberManager } from "@/components/projects/member-manager"
import { DetailSkeleton } from "@/components/shared/page-skeleton"
import { getCurrentUser } from "@/lib/auth/session"
import { invitationMailConfigured } from "@/lib/mail/invitation"
import { listProjectInvitations } from "@/lib/services/invitation.service"
import { getProject } from "@/lib/services/project.service"

export const metadata = { title: "Members" }

export default function MembersPage({ params }: { params: Promise<{ projectId: string }> }) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <MembersContent params={params} />
    </Suspense>
  )
}

async function MembersContent({ params }: { params: Promise<{ projectId: string }> }) {
  const [{ projectId }, user] = await Promise.all([params, getCurrentUser()])
  if (!user) {
    return null
  }

  const project = await getProject(projectId, user.id)
  if (!project) {
    notFound()
  }

  const canManage = project.role === "owner" || project.role === "admin"
  const archived = Boolean(project.archivedAt)
  const invitations = canManage ? await listProjectInvitations(project.id) : []

  return (
    <div className="grid max-w-4xl gap-6">
      {canManage && !archived && !invitationMailConfigured() ? (
        <p className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm">
          Invitation email is not configured. People can still join from a copied link. Add the Brevo settings to send the email.
        </p>
      ) : null}
      {archived ? (
        <p className="text-sm text-muted-foreground">
          Invitations are paused while the project is archived. You can still change roles and remove members.
        </p>
      ) : !canManage ? (
        <p className="text-sm text-muted-foreground">Owners and admins can invite people, change roles, and remove members.</p>
      ) : null}
      <MemberManager
        projectId={project.id}
        canManage={canManage}
        canInvite={canManage && !archived}
        actorRole={project.role}
        members={project.members.map((member) => ({
          ...member,
          isYou: member.userId === user.id,
        }))}
      />
      {canManage ? <InvitationList projectId={project.id} invitations={invitations} canResend={!archived} /> : null}
    </div>
  )
}
