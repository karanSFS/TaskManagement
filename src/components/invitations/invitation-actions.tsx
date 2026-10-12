"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { InvitationSummary, type InvitationSummaryData } from "@/components/invitations/invitation-summary"
import { Button } from "@/components/ui/button"
import { switchAccount } from "@/lib/actions/auth"
import { respondToInvitation } from "@/lib/actions/projects"

export function InvitationCard({
  invitation,
  switchTo,
}: {
  invitation: InvitationSummaryData & { id: string; emailMatches: boolean }
  switchTo?: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [confirmDecline, setConfirmDecline] = useState(false)
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

  function signInAgain() {
    startTransition(() => switchAccount(switchTo ?? "/invitations", invitation.email))
  }

  return (
    <article className="grid min-w-0 gap-4 rounded-xl border bg-card p-4 shadow-sm sm:p-5">
      <InvitationSummary invitation={invitation} compact />

      {open && !invitation.emailMatches ? (
        <div className="grid gap-3 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
          <p>
            This invitation is for <span className="font-medium">{invitation.email}</span>, but you are signed in with a
            different email. Sign in with that address to accept it.
          </p>
          <Button type="button" variant="outline" className="justify-self-start" disabled={pending} onClick={signInAgain}>
            Switch account
          </Button>
        </div>
      ) : null}

      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}

      {open && invitation.emailMatches ? (
        confirmDecline ? (
          <div className="flex flex-wrap items-center gap-2">
            <p className="mr-auto text-sm text-muted-foreground">Decline this invitation? You will need a new one to join later.</p>
            <Button type="button" variant="ghost" disabled={pending} onClick={() => setConfirmDecline(false)}>
              Keep it
            </Button>
            <Button type="button" variant="destructive" disabled={pending} onClick={() => respond("reject")}>
              {pending ? "Declining…" : "Decline"}
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="lg" className="flex-1 sm:flex-none" disabled={pending} onClick={() => respond("accept")}>
              {pending ? "Joining…" : "Accept and join"}
            </Button>
            <Button type="button" size="lg" variant="outline" disabled={pending} onClick={() => setConfirmDecline(true)}>
              Decline
            </Button>
          </div>
        )
      ) : null}
    </article>
  )
}
