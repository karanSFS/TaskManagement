declare module "nodemailer" {
  export function createTransport(options: {
    host: string
    port: number
    secure: boolean
    auth: { user: string; pass: string }
  }): {
    sendMail(message: {
      from: { name: string; address: string }
      to: string
      subject: string
      html: string
      text: string
    }): Promise<unknown>
  }
}
