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
  const html = invitationHtml({
    inviterName: escapeHtml(invite.inviterName),
    projectName: escapeHtml(invite.projectName),
    projectKey: escapeHtml(invite.projectKey),
    role: escapeHtml(role),
    expires: escapeHtml(expires),
    link: escapeHtml(link),
  })
  return { subject, text, html }
}

function invitationHtml(details: {
  inviterName: string
  projectName: string
  projectKey: string
  role: string
  expires: string
  link: string
}) {
  return `<!DOCTYPE html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f5f6fa;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f6fa;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid #e4e4e7;border-radius:16px;">
            <tr>
              <td style="padding:28px 28px 8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td width="28" height="28" align="center" valign="middle" style="width:28px;height:28px;background:#4f46e5;border-radius:8px;color:#ffffff;font-size:16px;font-weight:700;line-height:28px;">&#10003;</td>
                    <td style="padding-left:8px;font-size:15px;font-weight:600;letter-spacing:-0.02em;color:#18181b;">FixTask</td>
                  </tr>
                </table>
                <p style="margin:22px 0 0;font-size:12px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:#71717a;">Project invitation</p>
                <h1 style="margin:8px 0 0;font-size:22px;line-height:1.3;font-weight:600;letter-spacing:-0.02em;color:#18181b;">${details.inviterName} invited you to ${details.projectName}</h1>
                <p style="margin:12px 0 0;font-size:14px;line-height:1.5;color:#3f3f46;">Join as ${details.role}. This invitation expires on ${details.expires}.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 28px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f6fa;border-radius:12px;">
                  <tr>
                    <td style="padding:14px 16px;">
                      <p style="margin:0;font-size:12px;color:#71717a;">Project</p>
                      <p style="margin:4px 0 0;font-size:14px;font-weight:600;color:#18181b;">${details.projectName} <span style="font-weight:500;color:#71717a;">${details.projectKey}</span></p>
                    </td>
                    <td style="padding:14px 16px;" align="right">
                      <p style="margin:0;font-size:12px;color:#71717a;">Role</p>
                      <p style="margin:4px 0 0;font-size:14px;font-weight:600;color:#18181b;">${details.role}</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:22px 28px 8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td bgcolor="#4f46e5" style="border-radius:8px;">
                      <a href="${details.link}" style="display:inline-block;padding:12px 18px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;font-weight:600;line-height:1;color:#ffffff;text-decoration:none;border-radius:8px;">Review invitation</a>
                    </td>
                  </tr>
                </table>
                <p style="margin:14px 0 0;font-size:12px;line-height:1.5;color:#71717a;">Or open this link:<br /><a href="${details.link}" style="color:#4f46e5;word-break:break-all;">${details.link}</a></p>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 28px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
                <p style="margin:0;font-size:13px;line-height:1.5;color:#3f3f46;">Use a FixTask account with this email address. If you do not have one yet, create it from the invitation page. Signing up does not accept the invitation for you.</p>
                <p style="margin:18px 0 0;font-size:12px;line-height:1.5;color:#71717a;">FixTask — Plan together. Solve faster. Ship better.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
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

export function invitationWasSaved(message: string | undefined) {
  return message?.startsWith("The invitation was saved") ?? false
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
