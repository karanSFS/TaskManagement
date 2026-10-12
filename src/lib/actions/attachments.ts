"use server"

import { unstable_rethrow } from "next/navigation"

import { actionError } from "@/lib/actions/result"
import { refreshWorkspace } from "@/lib/actions/revalidate"
import { type ActionState } from "@/lib/auth/paths"
import { getCurrentUser } from "@/lib/auth/session"
import { createAttachmentUrl, registerAttachment, removeAttachment } from "@/lib/services/attachment.service"
import { attachmentRegistrationSchema } from "@/lib/validations/attachment"

function failure(error: unknown, operation: string, userId?: string, resourceId?: string): ActionState {
  unstable_rethrow(error)
  return actionError(error, operation, userId, resourceId)
}

export async function saveAttachment(values: unknown): Promise<ActionState> {
  const parsed = attachmentRegistrationSchema.safeParse(values)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Choose a file." }

  const user = await getCurrentUser()
  if (!user) return { error: "Sign in to attach a file." }

  try {
    await registerAttachment(user.id, parsed.data.issueId, parsed.data.storagePath, parsed.data.fileName)
    refreshWorkspace()
    return { success: "File attached." }
  } catch (error) {
    return failure(error, "saveAttachment", user.id, parsed.data.issueId)
  }
}

export async function deleteAttachment(issueId: string, attachmentId: string): Promise<ActionState> {
  const user = await getCurrentUser()
  if (!user) return { error: "Sign in to remove a file." }

  try {
    await removeAttachment(user.id, issueId, attachmentId)
    refreshWorkspace()
    return { success: "File removed." }
  } catch (error) {
    return failure(error, "deleteAttachment", user.id, attachmentId)
  }
}

export async function openAttachment(attachmentId: string): Promise<{ error?: string; url?: string }> {
  const user = await getCurrentUser()
  if (!user) return { error: "Sign in to open a file." }

  try {
    const url = await createAttachmentUrl(attachmentId)
    return { url }
  } catch (error) {
    return failure(error, "openAttachment", user.id, attachmentId)
  }
}
