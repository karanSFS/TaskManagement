export type InvitationMail = {
  email: string
  projectName: string
  projectKey: string
  role: string
  inviterName: string
  expiresAt: string
  token: string
}

export function invitationMessage(invite: InvitationMail, origin: string) {
  const link = `${origin}/invitations/${invite.token}`
  const expires = new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(invite.expiresAt))
  const role = mailRole(invite.role)
  const subject = `${invite.inviterName} invited you to ${invite.projectName}`
  const text = [
    `${invite.inviterName} invited you to ${invite.projectName} (${invite.projectKey}) as ${role}.`,
    `This invitation expires on ${expires}.`,
    "Open it in FixTask to accept or reject it.",
    "Use a FixTask account with this email address. If you do not have one yet, create it from the invitation page.",
    link,
  ].join("\n\n")
  const html = `<p>${escapeHtml(invite.inviterName)} invited you to <strong>${escapeHtml(invite.projectName)}</strong> (${escapeHtml(invite.projectKey)}) as ${escapeHtml(role)}.</p><p>This invitation expires on ${escapeHtml(expires)}.</p><p><a href="${escapeHtml(link)}">Open the invitation</a></p><p>Use a FixTask account with this email address. If you do not have one yet, create it from the invitation page.</p>`
  return { subject, text, html }
}

function mailRole(role: string) {
  if (role === "owner") return "Owner"
  if (role === "admin") return "Admin"
  return "Member"
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}

export function invitationStatusLabel(status: string) {
  switch (status) {
    case "pending":
      return "Pending"
    case "accepted":
      return "Accepted"
    case "rejected":
      return "Rejected"
    case "expired":
      return "Expired"
    case "revoked":
      return "Cancelled"
    default:
      return "Invitation"
  }
}
