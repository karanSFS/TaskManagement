import { CalendarClock, Mail, ShieldCheck } from "lucide-react"

import { formatProjectDate, roleLabel } from "@/lib/projects/format"

export type InvitationSummaryData = {
  email: string
  role: string
  status: string
  expiresAt: string
  projectName: string
  projectKey: string
  inviterName: string
}

export function invitationStatusNote(status: string, inviterName: string) {
  switch (status) {
    case "accepted":
      return "This invitation was already accepted."
    case "rejected":
      return "This invitation was declined."
    case "expired":
      return `This invitation expired. Ask ${inviterName} to send a new one.`
    case "revoked":
      return "The project cancelled this invitation."
    default:
      return null
  }
}

export function InvitationSummary({
  invitation,
  compact = false,
}: {
  invitation: InvitationSummaryData
  compact?: boolean
}) {
  const note = invitationStatusNote(invitation.status, invitation.inviterName)

  return (
    <div className="grid min-w-0 gap-4 [overflow-wrap:anywhere]">
      <div className="flex min-w-0 items-start gap-3">
        <span
          aria-hidden
          className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-sm font-semibold text-accent-foreground"
        >
          {invitation.projectKey.slice(0, 3) || "P"}
        </span>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">
            {invitation.inviterName} invited you to join
          </p>
          <h2 className={compact ? "text-base font-semibold tracking-tight" : "text-lg font-semibold tracking-tight"}>
            {invitation.projectName}
          </h2>
        </div>
      </div>

      <dl className="grid gap-2 rounded-lg border bg-muted/40 p-3 text-sm sm:grid-cols-2">
        <div className="flex min-w-0 items-center gap-2 sm:col-span-2">
          <Mail className="size-4 shrink-0 text-muted-foreground" />
          <dt className="sr-only">Sent to</dt>
          <dd className="min-w-0 truncate">{invitation.email}</dd>
        </div>
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-4 shrink-0 text-muted-foreground" />
          <dt className="sr-only">Role</dt>
          <dd>Join as {roleLabel(invitation.role)}</dd>
        </div>
        {invitation.status === "pending" ? (
          <div className="flex items-center gap-2">
            <CalendarClock className="size-4 shrink-0 text-muted-foreground" />
            <dt className="sr-only">Expires</dt>
            <dd>Expires {formatProjectDate(invitation.expiresAt)}</dd>
          </div>
        ) : null}
      </dl>

      {note ? (
        <p role="status" className="rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground">
          {note}
        </p>
      ) : null}
    </div>
  )
}
