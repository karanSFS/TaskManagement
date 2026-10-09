"use server"

import { revalidatePath } from "next/cache"

import { actionError } from "@/lib/actions/result"
import { type ActionState } from "@/lib/auth/paths"
import { getCurrentUser } from "@/lib/auth/session"
import { AppError } from "@/lib/errors/app-error"
import {
  completeSprintRecord,
  createSprintRecord,
  moveIssueToSprint,
  startSprintRecord,
  updateSprintRecord,
} from "@/lib/services/sprint.service"
import { createSprintSchema, moveIssueSchema, updateSprintSchema } from "@/lib/validations/sprint"

function refreshSprint(projectId: string) {
  revalidatePath("/backlog")
  revalidatePath("/sprints")
  revalidatePath("/board")
  revalidatePath("/issues")
  revalidatePath("/my-work")
  revalidatePath("/dashboard")
  revalidatePath("/reports")
  revalidatePath(`/projects/${projectId}`)
}

function failure(error: unknown, operation: string, userId?: string, resourceId?: string): ActionState {
  if (!(error instanceof AppError)) throw error
  return actionError(error, operation, userId, resourceId)
}

export async function createSprint(values: unknown): Promise<ActionState> {
  const parsed = createSprintSchema.safeParse(values)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the sprint name and dates." }

  const user = await getCurrentUser()
  if (!user) return { error: "Sign in to plan a sprint." }

  try {
    const created = await createSprintRecord(user.id, parsed.data)
    refreshSprint(created.project_id)
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
    const updated = await updateSprintRecord(user.id, parsed.data)
    refreshSprint(updated.project_id)
    return { success: "Sprint updated." }
  } catch (error) {
    return failure(error, "updateSprint", user.id, parsed.data.sprintId)
  }
}

export async function startSprint(projectId: string, sprintId: string): Promise<ActionState> {
  const user = await getCurrentUser()
  if (!user) return { error: "Sign in to start a sprint." }

  try {
    await startSprintRecord(user.id, sprintId)
    refreshSprint(projectId)
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
    refreshSprint(projectId)
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
    refreshSprint(projectId)
    return { success: parsed.data.sprintId ? "Issue added to the sprint." : "Issue returned to the backlog." }
  } catch (error) {
    return failure(error, "assignIssueToSprint", user.id, issueId)
  }
}
