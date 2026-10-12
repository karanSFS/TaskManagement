"use client"

import { Check, Copy } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { resendProjectInvitation, revokeProjectInvitation } from "@/lib/actions/projects"
import { invitationStatusLabel } from "@/lib/invitations/format"
import { formatProjectDate, roleLabel } from "@/lib/projects/format"
import type { SentInvitation } from "@/lib/services/invitation.service"

export function InvitationList({
  projectId,
  invitations,
  canResend,
}: {
  projectId: string
  invitations: SentInvitation[]
  canResend: boolean
}) {
  const pending = invitations.filter((invitation) => invitation.status === "pending")
  const history = invitations.filter((invitation) => invitation.status !== "pending")
  if (invitations.length === 0) return null

  return (
    <div className="grid gap-5">
      {pending.length > 0 ? (
        <section aria-labelledby="pending-invites" className="grid gap-2">
          <h2 id="pending-invites" className="text-sm font-semibold tracking-tight">
            Waiting to accept <span className="text-muted-foreground">({pending.length})</span>
          </h2>
          <ul className="divide-y overflow-hidden rounded-xl border bg-card shadow-sm">
            {pending.map((invitation) => (
              <PendingRow key={invitation.id} projectId={projectId} invitation={invitation} canResend={canResend} />
            ))}
          </ul>
        </section>
      ) : null}

      {history.length > 0 ? (
        <details className="grid gap-2">
          <summary className="cursor-pointer text-sm font-semibold tracking-tight text-muted-foreground hover:text-foreground">
            Invitation history ({history.length})
          </summary>
          <ul className="mt-2 divide-y overflow-hidden rounded-xl border bg-card">
            {history.map((invitation) => (
              <li key={invitation.id} className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="truncate">{invitation.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {roleLabel(invitation.role)} · Sent {formatProjectDate(invitation.createdAt)} by {invitation.inviterName}
                  </p>
                </div>
                <Badge variant={invitation.status === "accepted" ? "secondary" : "outline"}>
                  {invitationStatusLabel(invitation.status)}
                </Badge>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  )
}

function PendingRow({
  projectId,
  invitation,
  canResend,
}: {
  projectId: string
  invitation: SentInvitation
  canResend: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [cancelError, setCancelError] = useState("")
  const [copied, setCopied] = useState(false)

  function resend() {
    startTransition(async () => {
      const result = await resendProjectInvitation(projectId, invitation.id)
      if (result.error) {
        toast.error(result.error)
        router.refresh()
        return
      }
      toast.success(result.success ?? "Invitation sent again.")
      router.refresh()
    })
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/join/${invitation.token}`)
      setCopied(true)
      toast.success("Invite link copied. Only the invited email can accept it.")
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Could not copy the link.")
    }
  }

  return (
    <li className="grid gap-2 px-3 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{invitation.email}</p>
        <p className="text-xs text-muted-foreground">
          {roleLabel(invitation.role)} · Sent {formatProjectDate(invitation.createdAt)} by {invitation.inviterName} · Expires{" "}
          {formatProjectDate(invitation.expiresAt)}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" onClick={copyLink}>
          {copied ? <Check /> : <Copy />}
          Copy link
        </Button>
        {canResend ? (
          <Button type="button" size="sm" variant="outline" disabled={pending} onClick={resend}>
            {pending ? "Sending…" : "Resend email"}
          </Button>
        ) : null}
        <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={() => setConfirmCancel(true)}>
          Cancel
        </Button>
      </div>
      <ConfirmDialog
        open={confirmCancel}
        onOpenChange={(next) => {
          if (!next) setCancelError("")
          setConfirmCancel(next)
        }}
        title={`Cancel the invitation for ${invitation.email}?`}
        description="The link stops working. You can invite them again later."
        confirmLabel="Cancel invitation"
        destructive
        pending={pending}
        error={cancelError}
        onConfirm={() => {
          startTransition(async () => {
            const result = await revokeProjectInvitation(projectId, invitation.id)
            if (result.error) {
              setCancelError(result.error)
              return
            }
            toast.success(result.success ?? "Invitation cancelled.")
            setConfirmCancel(false)
            router.refresh()
          })
        }}
      />
    </li>
  )
}
