import { createTransport } from "nodemailer"

import { invitationMessage, type InvitationMail } from "@/lib/invitations/format"

export type { InvitationMail }

const savedWithoutEmail = "The invitation was saved, but the email could not be sent. Use Resend on the members page."

export async function sendInvitationEmail(invite: InvitationMail, origin: string) {
  const key = process.env.BREVO_SMTP_KEY
  const login = process.env.BREVO_SMTP_LOGIN
  const from = process.env.INVITE_FROM_EMAIL
  if (!key || !login || !from) {
    return "The invitation was saved, but email is not configured. Add the Brevo settings, then use Resend."
  }

  const message = invitationMessage(invite, origin)
  const transport = createTransport({
    host: "smtp-relay.brevo.com",
    port: 587,
    secure: false,
    auth: { user: login, pass: key },
  })

  try {
    const info = await transport.sendMail({
      from: { name: "FixTask", address: from },
      to: invite.email,
      subject: message.subject,
      html: message.html,
      text: message.text,
    })
    if (info.rejected && info.rejected.length > 0) return savedWithoutEmail
  } catch (error) {
    return mailFailureMessage(error)
  }

  return null
}

function mailFailureMessage(error: unknown) {
  const responseCode = error && typeof error === "object" && "responseCode" in error ? Number(error.responseCode) : 0
  if (responseCode === 525) {
    return "The invitation was saved, but Brevo blocked this server's IP address. Allow it in Brevo, then use Resend."
  }
  if (responseCode === 535) {
    return "The invitation was saved, but Brevo rejected the SMTP login. Check the login and key, then use Resend."
  }
  return savedWithoutEmail
}
