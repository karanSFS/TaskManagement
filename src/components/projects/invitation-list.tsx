"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { resendProjectInvitation, revokeProjectInvitation } from "@/lib/actions/projects"
import { invitationWasSaved } from "@/lib/invitations/format"
import { invitationStatusLabel } from "@/lib/invitations/format"
import { formatProjectDate, roleLabel } from "@/lib/projects/format"
import type { ProjectInvitation } from "@/lib/services/invitation.service"

export function InvitationList({
  projectId,
  invitations,
}: {
  projectId: string
  invitations: ProjectInvitation[]
}) {
  if (invitations.length === 0) return null

  return (
    <section className="grid gap-2">
      <h2 className="text-sm font-semibold tracking-tight">Invitations</h2>
      <ul className="divide-y overflow-hidden rounded-xl border bg-card shadow-sm">
        {invitations.map((invitation) => (
          <InvitationRow key={invitation.id} projectId={projectId} invitation={invitation} />
        ))}
      </ul>
    </section>
  )
}

function InvitationRow({ projectId, invitation }: { projectId: string; invitation: ProjectInvitation }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function run(action: () => Promise<{ error?: string; success?: string }>) {
    setError(null)
    startTransition(async () => {
      const result = await action()
      if (result.error) {
        setError(result.error)
        toast.error(result.error)
        if (invitationWasSaved(result.error)) router.refresh()
        return
      }
      if (result.success) toast.success(result.success)
      router.refresh()
    })
  }

  return (
    <li className="grid gap-2 px-3 py-3 sm:grid-cols-[1fr_auto] sm:items-center">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{invitation.email}</p>
        <p className="text-xs text-muted-foreground">
          {roleLabel(invitation.role)} · {invitationStatusLabel(invitation.status)} · Invited by {invitation.inviterName}
        </p>
        <p className="text-xs text-muted-foreground">
          Sent {formatProjectDate(invitation.createdAt)} · Expires {formatProjectDate(invitation.expiresAt)}
        </p>
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </div>
      {invitation.status === "pending" ? (
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => run(() => resendProjectInvitation(projectId, invitation.id))}>
            {pending ? "Working…" : "Resend"}
          </Button>
          <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => run(() => revokeProjectInvitation(projectId, invitation.id))}>
            Cancel
          </Button>
        </div>
      ) : null}
    </li>
  )
}
