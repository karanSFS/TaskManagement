"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { actionError } from "@/lib/actions/result"
import { type ActionState } from "@/lib/auth/paths"
import { getCurrentUser } from "@/lib/auth/session"
import { AppError } from "@/lib/errors/app-error"
import {
  addIssueComment,
  addIssueLabel,
  createIssue as createIssueRecord,
  deleteIssueComment,
  removeIssueLabel,
  updateIssue as updateIssueRecord,
} from "@/lib/services/issue.service"
import { commentSchema, createIssueSchema, labelNameSchema, updateIssueSchema } from "@/lib/validations/issue"

function refreshIssue(issueId: string, projectId: string | null) {
  revalidatePath("/issues")
  revalidatePath("/my-work")
  revalidatePath(`/issues/${issueId}`)
  revalidatePath("/projects")
  if (projectId) revalidatePath(`/projects/${projectId}`)
}

function failure(error: unknown, operation: string, userId?: string, resourceId?: string): ActionState {
  if (!(error instanceof AppError)) throw error
  return actionError(error, operation, userId, resourceId)
}

export async function createIssue(values: unknown): Promise<ActionState> {
  const parsed = createIssueSchema.safeParse(values)
  if (!parsed.success) return { error: "Check the issue title and project." }

  const user = await getCurrentUser()
  if (!user) return { error: "Sign in to create an issue." }

  try {
    const created = await createIssueRecord(user.id, parsed.data)
    refreshIssue(created.id, created.project_id)
    redirect(`/issues/${created.id}`)
  } catch (error) {
    return failure(error, "createIssue", user.id, parsed.data.projectId)
  }
}

export async function updateIssue(issueId: string, values: unknown): Promise<ActionState> {
  const parsed = updateIssueSchema.safeParse(values)
  if (!parsed.success) return { error: "Check the issue details and try again." }

  const user = await getCurrentUser()
  if (!user) return { error: "Sign in to update this issue." }

  try {
    const updated = await updateIssueRecord(user.id, issueId, parsed.data)
    refreshIssue(issueId, updated.project_id)
    return { success: "Issue saved." }
  } catch (error) {
    return failure(error, "updateIssue", user.id, issueId)
  }
}

export async function addComment(issueId: string, values: unknown): Promise<ActionState> {
  const parsed = commentSchema.safeParse(values)
  if (!parsed.success) return { error: "Write a comment before sending it." }

  const user = await getCurrentUser()
  if (!user) return { error: "Sign in to comment." }

  try {
    const projectId = await addIssueComment(user.id, issueId, parsed.data.body)
    refreshIssue(issueId, projectId)
    return { success: "Comment added." }
  } catch (error) {
    return failure(error, "addComment", user.id, issueId)
  }
}

export async function deleteComment(issueId: string, commentId: string): Promise<ActionState> {
  const user = await getCurrentUser()
  if (!user) return { error: "Sign in to delete a comment." }

  try {
    const projectId = await deleteIssueComment(user.id, issueId, commentId)
    refreshIssue(issueId, projectId)
    return { success: "Comment deleted." }
  } catch (error) {
    return failure(error, "deleteComment", user.id, issueId)
  }
}

export async function addLabel(issueId: string, values: unknown): Promise<ActionState> {
  const parsed = labelNameSchema.safeParse(values)
  if (!parsed.success) return { error: "Enter a label name." }

  const user = await getCurrentUser()
  if (!user) return { error: "Sign in to add a label." }

  try {
    const projectId = await addIssueLabel(user.id, issueId, parsed.data.name)
    refreshIssue(issueId, projectId)
    return { success: "Label added." }
  } catch (error) {
    return failure(error, "addLabel", user.id, issueId)
  }
}

export async function removeLabel(issueId: string, labelId: string): Promise<ActionState> {
  const user = await getCurrentUser()
  if (!user) return { error: "Sign in to remove a label." }

  try {
    const projectId = await removeIssueLabel(issueId, labelId)
    refreshIssue(issueId, projectId)
    return { success: "Label removed." }
  } catch (error) {
    return failure(error, "removeLabel", user.id, issueId)
  }
}
