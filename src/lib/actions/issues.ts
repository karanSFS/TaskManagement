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
  createSubtask as createSubtaskRecord,
  addIssueLink as addIssueLinkRecord,
  removeIssueLink as removeIssueLinkRecord,
  changeIssueStatus as changeIssueStatusRecord,
  deleteIssue as deleteIssueRecord,
  deleteIssueComment,
  removeIssueLabel,
  updateIssue as updateIssueRecord,
  listIssues,
} from "@/lib/services/issue.service"
import { commentSchema, changeStatusSchema, createIssueSchema, issueLinkSchema, labelNameSchema, subtaskSchema, updateIssueSchema } from "@/lib/validations/issue"

function refreshIssue(issueId: string, projectId: string | null) {
  revalidatePath("/issues")
  revalidatePath("/my-work")
  revalidatePath("/dashboard")
  revalidatePath("/board")
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
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the issue title and project." }

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
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the issue details and try again." }

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

export async function changeIssueStatus(issueId: string, statusId: string): Promise<ActionState> {
  const parsed = changeStatusSchema.safeParse({ issueId, statusId })
  if (!parsed.success) return { error: "Choose a valid status." }

  const user = await getCurrentUser()
  if (!user) return { error: "Sign in to move this issue." }

  try {
    const updated = await changeIssueStatusRecord(user.id, parsed.data.issueId, parsed.data.statusId)
    refreshIssue(parsed.data.issueId, updated.project_id)
    return { success: "Status updated." }
  } catch (error) {
    return failure(error, "changeIssueStatus", user.id, issueId)
  }
}

export async function deleteIssue(issueId: string): Promise<ActionState> {
  const user = await getCurrentUser()
  if (!user) return { error: "Sign in to delete this issue." }

  try {
    const projectId = await deleteIssueRecord(issueId)
    refreshIssue(issueId, projectId)
    redirect(projectId ? `/projects/${projectId}` : "/issues")
  } catch (error) {
    return failure(error, "deleteIssue", user.id, issueId)
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

export async function createSubtask(issueId: string, values: unknown): Promise<ActionState> {
  const parsed = subtaskSchema.safeParse(values)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Enter a subtask title." }

  const user = await getCurrentUser()
  if (!user) return { error: "Sign in to add a subtask." }

  try {
    const created = await createSubtaskRecord(user.id, issueId, parsed.data.title)
    refreshIssue(issueId, created.project_id)
    refreshIssue(created.id, created.project_id)
    return { success: "Subtask added." }
  } catch (error) {
    return failure(error, "createSubtask", user.id, issueId)
  }
}

export async function addIssueLink(issueId: string, values: unknown): Promise<ActionState> {
  const parsed = issueLinkSchema.safeParse(values)
  if (!parsed.success) return { error: "Choose an issue and a link type." }

  const user = await getCurrentUser()
  if (!user) return { error: "Sign in to link an issue." }

  try {
    const projectId = await addIssueLinkRecord(user.id, issueId, parsed.data.targetIssueId, parsed.data.linkType)
    refreshIssue(issueId, projectId)
    refreshIssue(parsed.data.targetIssueId, projectId)
    return { success: "Link added." }
  } catch (error) {
    return failure(error, "addIssueLink", user.id, issueId)
  }
}

export async function removeIssueLink(issueId: string, linkId: string): Promise<ActionState> {
  const user = await getCurrentUser()
  if (!user) return { error: "Sign in to remove a link." }

  try {
    const projectId = await removeIssueLinkRecord(linkId, issueId)
    refreshIssue(issueId, projectId)
    return { success: "Link removed." }
  } catch (error) {
    return failure(error, "removeIssueLink", user.id, issueId)
  }
}

export async function searchIssues(query: string) {
  const user = await getCurrentUser()
  const needle = query.trim()
  if (!user || needle.length < 2) return []

  try {
    const result = await listIssues(user.id, 1, { query: needle, limit: 8 })
    return result.items.map((issue) => ({
      id: issue.id,
      key: `${issue.projectKey}-${issue.number}`,
      title: issue.title,
      projectName: issue.projectName,
    }))
  } catch (error) {
    if (!(error instanceof AppError)) throw error
    return []
  }
}

