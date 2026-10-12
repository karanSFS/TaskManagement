"use server"

import { unstable_rethrow } from "next/navigation"

import { actionError } from "@/lib/actions/result"
import { refreshWorkspace } from "@/lib/actions/revalidate"
import { type ActionState } from "@/lib/auth/paths"
import { getCurrentUser } from "@/lib/auth/session"
import {
  completeSprintRecord,
  createSprintRecord,
  deleteSprintRecord,
  moveIssueToSprint,
  startSprintRecord,
  updateSprintRecord,
} from "@/lib/services/sprint.service"
import { createSprintSchema, moveIssueSchema, updateSprintSchema } from "@/lib/validations/sprint"

function failure(error: unknown, operation: string, userId?: string, resourceId?: string): ActionState {
  unstable_rethrow(error)
  return actionError(error, operation, userId, resourceId)
}

export async function createSprint(values: unknown): Promise<ActionState> {
  const parsed = createSprintSchema.safeParse(values)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the sprint name and dates." }

  const user = await getCurrentUser()
  if (!user) return { error: "Sign in to plan a sprint." }

  try {
    await createSprintRecord(user.id, parsed.data)
    refreshWorkspace()
    return { success: "Sprint planned." }
  } catch (error) {
    return failure(error, "createSprint", user.id, parsed.data.projectId)
  }
}

export async function updateSprint(values: unknown): Promise<ActionState> {
  const parsed = updateSprintSchema.safeParse(values)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the sprint name and dates." }

  const user = await getCurrentUser()
  if (!user) return { error: "Sign in to edit a sprint." }

  try {
    await updateSprintRecord(user.id, parsed.data)
    refreshWorkspace()
    return { success: "Sprint updated." }
  } catch (error) {
    return failure(error, "updateSprint", user.id, parsed.data.sprintId)
  }
}

export async function deleteSprint(projectId: string, sprintId: string): Promise<ActionState> {
  void projectId
  const user = await getCurrentUser()
  if (!user) return { error: "Sign in to delete a sprint." }

  try {
    await deleteSprintRecord(user.id, sprintId)
    refreshWorkspace()
    return { success: "Sprint deleted. Its issues are back in the backlog." }
  } catch (error) {
    return failure(error, "deleteSprint", user.id, sprintId)
  }
}

export async function startSprint(projectId: string, sprintId: string): Promise<ActionState> {
  const user = await getCurrentUser()
  if (!user) return { error: "Sign in to start a sprint." }

  try {
    await startSprintRecord(user.id, sprintId)
    refreshWorkspace()
    return { success: "Sprint started." }
  } catch (error) {
    return failure(error, "startSprint", user.id, sprintId)
  }
}

export async function completeSprint(projectId: string, sprintId: string): Promise<ActionState> {
  const user = await getCurrentUser()
  if (!user) return { error: "Sign in to complete a sprint." }

  try {
    await completeSprintRecord(user.id, sprintId)
    refreshWorkspace()
    return { success: "Sprint completed. Unfinished issues are back in the backlog." }
  } catch (error) {
    return failure(error, "completeSprint", user.id, sprintId)
  }
}

export async function assignIssueToSprint(projectId: string, issueId: string, sprintId: string): Promise<ActionState> {
  const parsed = moveIssueSchema.safeParse({ issueId, sprintId })
  if (!parsed.success) return { error: "Choose an issue and a sprint." }

  const user = await getCurrentUser()
  if (!user) return { error: "Sign in to move this issue." }

  try {
    await moveIssueToSprint(user.id, parsed.data.issueId, parsed.data.sprintId || null)
    refreshWorkspace()
    return { success: parsed.data.sprintId ? "Issue added to the sprint." : "Issue returned to the backlog." }
  } catch (error) {
    return failure(error, "assignIssueToSprint", user.id, issueId)
  }
}
