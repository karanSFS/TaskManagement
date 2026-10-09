import { z } from "zod"

export const maxAttachmentBytes = 50 * 1024 * 1024

export const attachmentMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/json",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
] as const

const allowed = new Set<string>(attachmentMimeTypes)

export function isAllowedAttachmentType(mimeType: string) {
  return allowed.has(mimeType)
}

export const attachmentRegistrationSchema = z.object({
  issueId: z.uuid("Choose an issue"),
  storagePath: z.string().trim().min(1).max(240),
  fileName: z.string().trim().min(1, "Choose a file").max(180, "File name is too long"),
})
