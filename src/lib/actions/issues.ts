"use server"

import { unstable_rethrow } from "next/navigation"

import { refreshWorkspace } from "@/lib/actions/revalidate"

import { actionError } from "@/lib/actions/result"
import { type ActionState } from "@/lib/auth/paths"
import { getCurrentUser } from "@/lib/auth/session"
import { AppError } from "@/lib/errors/app-error"
import {
  addIssueComment,
  addIssueLabel,
  getIssue,
  getIssueCatalog,
  listWritableProjects,
  createIssue as createIssueRecord,
  createSubtask as createSubtaskRecord,
  addIssueLink as addIssueLinkRecord,
  removeIssueLink as removeIssueLinkRecord,
  changeIssueStatus as changeIssueStatusRecord,
  reopenIssue as reopenIssueRecord,
  deleteIssue as deleteIssueRecord,
  deleteIssueComment,
  removeIssueLabel,
  updateIssue as updateIssueRecord,
  listIssues,
} from "@/lib/services/issue.service"
import { commentSchema, changeStatusSchema, createIssueSchema, issueLinkSchema, labelNameSchema, subtaskSchema, updateIssueSchema } from "@/lib/validations/issue"

function failure(error: unknown, operation: string, userId?: string, resourceId?: string): ActionState {
  unstable_rethrow(error)
  return actionError(error, operation, userId, resourceId)
}

export async function createIssue(values: unknown): Promise<ActionState> {
  const parsed = createIssueSchema.safeParse(values)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the issue title and project." }

  const user = await getCurrentUser()
  if (!user) return { error: "Sign in to create an issue." }

  try {
    const created = await createIssueRecord(user.id, parsed.data)
    refreshWorkspace()
    return { success: "Issue created.", href: `/issues/${created.id}` }
  } catch (error) {
    return failure(error, "createIssue", user.id, parsed.data.projectId)
  }
}

export async function loadCreateIssueForm(projectId?: string) {
  const user = await getCurrentUser()
  if (!user) return { error: "Sign in to create an issue." }

  try {
    const [{ active, archivedCount }, catalog] = await Promise.all([listWritableProjects(user.id), getIssueCatalog()])
    const requested = active.find((project) => project.id === projectId)
    return {
      projects: active,
      archivedCount,
      types: catalog.types,
      statuses: catalog.statuses,
      priorities: catalog.priorities,
      defaultProjectId: requested?.id ?? active[0]?.id ?? "",
    }
  } catch (error) {
    return failure(error, "loadCreateIssueForm", user.id)
  }
}

export async function loadIssueDrawer(issueId: string) {
  const user = await getCurrentUser()
  if (!user) return { error: "Sign in to view this issue." }

  try {
    const [issue, catalog] = await Promise.all([getIssue(issueId, user.id), getIssueCatalog()])
    if (!issue) return { error: "That issue could not be found." }
    return {
      issue,
      userId: user.id,
      types: catalog.types,
      statuses: catalog.statuses,
      priorities: catalog.priorities,
    }
  } catch (error) {
    return failure(error, "loadIssueDrawer", user.id, issueId)
  }
}

export async function updateIssue(issueId: string, values: unknown): Promise<ActionState> {
  const parsed = updateIssueSchema.safeParse(values)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the issue details and try again." }

  const user = await getCurrentUser()
  if (!user) return { error: "Sign in to update this issue." }

  try {
    await updateIssueRecord(user.id, issueId, parsed.data)
    refreshWorkspace()
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
    await changeIssueStatusRecord(user.id, parsed.data.issueId, parsed.data.statusId)
    refreshWorkspace()
    return { success: "Status updated." }
  } catch (error) {
    return failure(error, "changeIssueStatus", user.id, issueId)
  }
}

export async function reopenIssue(issueId: string, values: unknown): Promise<ActionState> {
  const parsed = commentSchema.safeParse(values)
  if (!parsed.success) return { error: "Write a note about what is still broken." }

  const user = await getCurrentUser()
  if (!user) return { error: "Sign in to reopen this issue." }

  try {
    await reopenIssueRecord(user.id, issueId, parsed.data.body)
    refreshWorkspace()
    return { success: "Issue reopened. Your note is on the ticket." }
  } catch (error) {
    return failure(error, "reopenIssue", user.id, issueId)
  }
}

export async function deleteIssue(issueId: string): Promise<ActionState> {
  const user = await getCurrentUser()
  if (!user) return { error: "Sign in to delete this issue." }

  try {
    const projectId = await deleteIssueRecord(issueId)
    refreshWorkspace()
    return { success: "Issue deleted.", href: projectId ? `/projects/${projectId}` : "/issues" }
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
    await addIssueComment(user.id, issueId, parsed.data.body)
    refreshWorkspace()
    return { success: "Comment added." }
  } catch (error) {
    return failure(error, "addComment", user.id, issueId)
  }
}

export async function deleteComment(issueId: string, commentId: string): Promise<ActionState> {
  const user = await getCurrentUser()
  if (!user) return { error: "Sign in to delete a comment." }

  try {
    await deleteIssueComment(user.id, issueId, commentId)
    refreshWorkspace()
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
    await addIssueLabel(user.id, issueId, parsed.data.name)
    refreshWorkspace()
    return { success: "Label added." }
  } catch (error) {
    return failure(error, "addLabel", user.id, issueId)
  }
}

export async function removeLabel(issueId: string, labelId: string): Promise<ActionState> {
  const user = await getCurrentUser()
  if (!user) return { error: "Sign in to remove a label." }

  try {
    await removeIssueLabel(issueId, labelId)
    refreshWorkspace()
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
    await createSubtaskRecord(user.id, issueId, parsed.data.title)
    refreshWorkspace()
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
    await addIssueLinkRecord(user.id, issueId, parsed.data.targetIssueId, parsed.data.linkType)
    refreshWorkspace()
    return { success: "Link added." }
  } catch (error) {
    return failure(error, "addIssueLink", user.id, issueId)
  }
}

export async function removeIssueLink(issueId: string, linkId: string): Promise<ActionState> {
  const user = await getCurrentUser()
  if (!user) return { error: "Sign in to remove a link." }

  try {
    await removeIssueLinkRecord(linkId, issueId)
    refreshWorkspace()
    return { success: "Link removed." }
  } catch (error) {
    return failure(error, "removeIssueLink", user.id, issueId)
  }
}

export async function searchIssues(query: string): Promise<{ issues: { id: string; key: string; title: string; projectName: string }[]; error?: string }> {
  const user = await getCurrentUser()
  const needle = query.trim()
  if (!user || needle.length < 2) return { issues: [] }

  try {
    const result = await listIssues(user.id, 1, { query: needle, limit: 8 })
    return {
      issues: result.items.map((issue) => ({
        id: issue.id,
        key: `${issue.projectKey}-${issue.number}`,
        title: issue.title,
        projectName: issue.projectName,
      })),
    }
  } catch (error) {
    if (error instanceof AppError) return { issues: [], error: error.message }
    return { issues: [], error: "Search failed. Try again." }
  }
}

