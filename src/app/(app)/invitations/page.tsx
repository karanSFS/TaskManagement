import { Mail } from "lucide-react"
import Link from "next/link"
import { Suspense } from "react"

import { InvitationCard } from "@/components/invitations/invitation-actions"
import { PageHeader } from "@/components/layout/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { ListSkeleton } from "@/components/shared/page-skeleton"
import { Badge } from "@/components/ui/badge"
import { getCurrentUser } from "@/lib/auth/session"
import { invitationStatusLabel } from "@/lib/invitations/format"
import { formatProjectDate, roleLabel } from "@/lib/projects/format"
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
  const waiting = invitations.filter((invitation) => invitation.status === "pending")
  const past = invitations.filter((invitation) => invitation.status !== "pending")

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-6">
      <PageHeader
        title="Invitations"
        description={`Invitations sent to ${user.email}. Accepting one adds you to that project.`}
      />

      <section aria-labelledby="waiting-heading" className="grid gap-3">
        <h2 id="waiting-heading" className="text-sm font-semibold">
          Waiting for you {waiting.length > 0 ? <span className="text-muted-foreground">({waiting.length})</span> : null}
        </h2>
        {waiting.length === 0 ? (
          <EmptyState
            icon={Mail}
            title="You're all caught up"
            description="When someone invites you to a project, it appears here and on your Home page."
          />
        ) : (
          waiting.map((invitation) => (
            <InvitationCard key={invitation.id} invitation={{ ...invitation, emailMatches: true }} />
          ))
        )}
      </section>

      {past.length > 0 ? (
        <section aria-labelledby="past-heading" className="grid gap-3">
          <h2 id="past-heading" className="text-sm font-semibold">Past invitations</h2>
          <ul className="divide-y rounded-xl border bg-card">
            {past.map((invitation) => (
              <li key={invitation.id} className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-sm">
                <div className="min-w-0 flex-1">
                  {invitation.status === "accepted" ? (
                    <Link href={`/projects/${invitation.projectId}`} className="block truncate font-medium hover:underline">
                      {invitation.projectName}
                    </Link>
                  ) : (
                    <p className="truncate font-medium">{invitation.projectName}</p>
                  )}
                  <p className="truncate text-xs text-muted-foreground">
                    From {invitation.inviterName} · {roleLabel(invitation.role)} · {formatProjectDate(invitation.createdAt)}
                  </p>
                </div>
                <Badge variant={invitation.status === "accepted" ? "secondary" : "outline"}>
                  {invitationStatusLabel(invitation.status)}
                </Badge>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
