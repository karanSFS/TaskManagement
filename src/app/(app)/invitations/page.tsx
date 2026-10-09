import { Mail } from "lucide-react"
import { Suspense } from "react"

import { InvitationCard } from "@/components/invitations/invitation-actions"
import { PageHeader } from "@/components/layout/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { ListSkeleton } from "@/components/shared/page-skeleton"
import { getCurrentUser } from "@/lib/auth/session"
import { listMyInvitations } from "@/lib/services/invitation.service"

export const metadata = { title: "Invitations" }

export default function InvitationsPage() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <InvitationsContent />
    </Suspense>
  )
}

async function InvitationsContent() {
  const user = await getCurrentUser()
  if (!user?.email) return null
  const invitations = await listMyInvitations(user.email)

  return (
    <div className="grid gap-4">
      <PageHeader title="Invitations" description="Project invitations sent to your email. Accepting adds you to that project." />
      {invitations.length === 0 ? (
        <EmptyState icon={Mail} title="No invitations" description="When someone invites this email to a project, it shows up here." />
      ) : (
        <div className="grid gap-3">
          {invitations.map((invitation) => (
            <InvitationCard key={invitation.id} invitation={{ ...invitation, emailMatches: true }} />
          ))}
        </div>
      )}
    </div>
  )
}
