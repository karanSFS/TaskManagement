import { AppError } from "@/lib/errors/app-error"
import { AuthorizationError } from "@/lib/errors/authorization-error"
import { DatabaseError } from "@/lib/errors/database-error"
import { NotFoundError } from "@/lib/errors/not-found-error"
import { createClient } from "@/lib/supabase/server"
import { isAllowedAttachmentType, maxAttachmentBytes } from "@/lib/validations/attachment"

export type IssueAttachment = {
  id: string
  fileName: string
  mimeType: string
  sizeBytes: number
  createdAt: string
  canDelete: boolean
}

export async function listIssueAttachments(userId: string, issueId: string): Promise<IssueAttachment[]> {
  const supabase = await createClient()
  const { data: issue, error: issueError } = await supabase
    .from("issues")
    .select("project_id")
    .eq("id", issueId)
    .maybeSingle()

  if (issueError) throw new DatabaseError("Could not load attachments.")
  if (!issue) return []

  const [files, membership] = await Promise.all([
    supabase
      .from("attachments")
      .select("id, file_name, mime_type, size_bytes, created_at, uploaded_by")
      .eq("issue_id", issueId)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("project_members")
      .select("role")
      .eq("project_id", issue.project_id)
      .eq("user_id", userId)
      .maybeSingle(),
  ])

  if (files.error || membership.error) throw new DatabaseError("Could not load attachments.")

  const manager = membership.data?.role === "owner" || membership.data?.role === "admin"
  return (files.data ?? []).map((file) => ({
    id: file.id,
    fileName: file.file_name,
    mimeType: file.mime_type,
    sizeBytes: file.size_bytes,
    createdAt: file.created_at,
    canDelete: manager || file.uploaded_by === userId,
  }))
}

export async function registerAttachment(userId: string, issueId: string, storagePath: string, fileName: string) {
  const supabase = await createClient()
  const { data: issue, error: issueError } = await supabase
    .from("issues")
    .select("project_id")
    .eq("id", issueId)
    .maybeSingle()

  if (issueError) throw new DatabaseError("Could not save the attachment.")
  if (!issue) throw new NotFoundError("ISSUE_NOT_FOUND", "Issue could not be found.")

  const expected = new RegExp(
    `^${issue.project_id}/${issueId}/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$`,
    "i",
  )
  if (!expected.test(storagePath)) {
    throw new AppError("INVALID_ATTACHMENT", "That file could not be saved. Try the upload again.", 422)
  }

  const info = await supabase.storage.from("attachments").info(storagePath)
  if (info.error || !info.data) {
    throw new AppError("INVALID_ATTACHMENT", "That file could not be saved. Try the upload again.", 422)
  }

  const size = info.data.size ?? 0
  const mimeType = (info.data.contentType ?? "").split(";")[0]?.trim().toLowerCase() ?? ""
  if (!isAllowedAttachmentType(mimeType)) {
    await supabase.storage.from("attachments").remove([storagePath])
    throw new AppError("INVALID_ATTACHMENT", "That file type is not allowed.", 422)
  }
  if (size <= 0 || size > maxAttachmentBytes) {
    await supabase.storage.from("attachments").remove([storagePath])
    throw new AppError("INVALID_ATTACHMENT", "Files must be 50 MB or smaller.", 422)
  }

  const safeName = fileName.split(/[/\\]/).pop()?.replace(/[^\w.\- ()]+/g, "").trim().slice(0, 180) || "file"
  const { error } = await supabase.from("attachments").insert({
    issue_id: issueId,
    storage_path: storagePath,
    file_name: safeName,
    mime_type: mimeType,
    size_bytes: size,
    uploaded_by: userId,
  })

  if (error) {
    await supabase.storage.from("attachments").remove([storagePath])
    if (error.message.includes("row-level security") || error.message.includes("permission denied")) {
      throw new AuthorizationError("ISSUE_ACCESS_DENIED", "You don't have permission to attach a file here.")
    }
    throw new DatabaseError("Could not save the attachment.")
  }

  return issue.project_id
}

export async function removeAttachment(userId: string, issueId: string, attachmentId: string) {
  const supabase = await createClient()
  const { data: file, error: readError } = await supabase
    .from("attachments")
    .select("id, storage_path, issue_id")
    .eq("id", attachmentId)
    .eq("issue_id", issueId)
    .maybeSingle()

  if (readError) throw new DatabaseError("Could not remove the attachment.")
  if (!file) throw new NotFoundError("ISSUE_NOT_FOUND", "Attachment could not be found.")

  const { data: removed, error } = await supabase
    .from("attachments")
    .delete()
    .eq("id", file.id)
    .eq("issue_id", issueId)
    .select("id")

  if (error) throw new DatabaseError("Could not remove the attachment.")
  if (!removed?.length) {
    throw new AuthorizationError("ISSUE_ACCESS_DENIED", "You can only remove files you uploaded.")
  }

  await supabase.storage.from("attachments").remove([file.storage_path])
  void userId

  const { data: issue } = await supabase.from("issues").select("project_id").eq("id", issueId).maybeSingle()
  return issue?.project_id ?? null
}

export async function createAttachmentUrl(attachmentId: string) {
  const supabase = await createClient()
  const { data: file, error } = await supabase
    .from("attachments")
    .select("storage_path")
    .eq("id", attachmentId)
    .maybeSingle()

  if (error) throw new DatabaseError("Could not open the attachment.")
  if (!file) throw new NotFoundError("ISSUE_NOT_FOUND", "Attachment could not be found.")

  const signed = await supabase.storage.from("attachments").createSignedUrl(file.storage_path, 120)
  if (signed.error || !signed.data?.signedUrl) {
    throw new AuthorizationError("ISSUE_ACCESS_DENIED", "You don't have permission to open that file.")
  }

  return signed.data.signedUrl
}
