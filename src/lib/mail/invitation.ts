import { createTransport } from "nodemailer"

import { invitationMessage, type InvitationMail } from "@/lib/invitations/format"

export type { InvitationMail }

const savedWithoutEmail = "Invitation saved, but the email could not be sent. Resend it from the members page."

export async function sendInvitationEmail(invite: InvitationMail, origin: string) {
  const key = process.env.BREVO_SMTP_KEY
  const login = process.env.BREVO_SMTP_LOGIN
  const from = process.env.INVITE_FROM_EMAIL
  if (!key || !login || !from) {
    return "Invitation saved, but email is not configured. Resend it from the members page."
  }

  const message = invitationMessage(invite, origin)
  const transport = createTransport({
    host: "smtp-relay.brevo.com",
    port: 587,
    secure: false,
    auth: { user: login, pass: key },
  })

  try {
    await transport.sendMail({
      from: { name: "FixTask", address: from },
      to: invite.email,
      subject: message.subject,
      html: message.html,
      text: message.text,
    })
  } catch {
    return savedWithoutEmail
  }

  return null
}
