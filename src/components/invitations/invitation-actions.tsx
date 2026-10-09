"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { respondToInvitation } from "@/lib/actions/projects"
import { invitationStatusLabel } from "@/lib/invitations/format"
import { formatProjectDate, roleLabel } from "@/lib/projects/format"

export function InvitationCard({
  invitation,
}: {
  invitation: {
    id: string
    email: string
    role: string
    status: string
    expiresAt: string
    projectName: string
    projectKey: string
    inviterName: string
    emailMatches: boolean
  }
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const open = invitation.status === "pending"

  function respond(decision: "accept" | "reject") {
    setError(null)
    startTransition(async () => {
      const result = await respondToInvitation(invitation.id, decision)
      if (result.error) {
        setError(result.error)
        return
      }
      if (result.success) toast.success(result.success)
      if (result.href) router.push(result.href)
      else router.refresh()
    })
  }

  return (
    <article className="grid gap-3 rounded-xl border bg-card p-4 shadow-sm">
      <div>
        <p className="text-xs font-medium tracking-wide text-muted-foreground">{invitation.projectKey}</p>
        <h2 className="text-base font-semibold tracking-tight">{invitation.projectName}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {invitation.inviterName} invited {invitation.email} as {roleLabel(invitation.role)}.
        </p>
        <p className="text-sm text-muted-foreground">
          {invitationStatusLabel(invitation.status)} · Expires {formatProjectDate(invitation.expiresAt)}
        </p>
      </div>
      {open && !invitation.emailMatches ? (
        <p className="text-sm text-destructive">This invitation was sent to {invitation.email}. Sign in with that address to respond.</p>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {open && invitation.emailMatches ? (
        <div className="flex gap-2">
          <Button type="button" disabled={pending} onClick={() => respond("accept")}>
            {pending ? "Working…" : "Accept"}
          </Button>
          <Button type="button" variant="outline" disabled={pending} onClick={() => respond("reject")}>
            Reject
          </Button>
        </div>
      ) : null}
    </article>
  )
}
