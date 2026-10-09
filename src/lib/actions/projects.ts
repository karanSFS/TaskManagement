"use server"

import { revalidatePath } from "next/cache"

import { actionError } from "@/lib/actions/result"
import { type ActionState } from "@/lib/auth/paths"
import { getCurrentUser } from "@/lib/auth/session"
import { AppError } from "@/lib/errors/app-error"
import {
  addProjectMemberRecord,
  createProjectRecord,
  removeProjectMemberRecord,
  setProjectArchived as archiveProjectRecord,
  updateMemberRoleRecord,
  updateProjectRecord,
} from "@/lib/services/project.service"
import {
  addMemberSchema,
  createProjectSchema,
  memberRoleSchema,
  updateProjectSchema,
  type ProjectRole,
} from "@/lib/validations/project"

function projectPaths(projectId: string) {
  revalidatePath("/projects")
  revalidatePath(`/projects/${projectId}`)
  revalidatePath(`/projects/${projectId}/members`)
  revalidatePath(`/projects/${projectId}/settings`)
  revalidatePath("/issues")
  revalidatePath("/issues/new")
  revalidatePath("/my-work")
  revalidatePath("/dashboard")
  revalidatePath("/board")
}

function failure(error: unknown, operation: string, userId?: string, resourceId?: string): ActionState {
  if (!(error instanceof AppError)) {
    throw error
  }

  return actionError(error, operation, userId, resourceId)
}

export async function createProject(values: unknown): Promise<ActionState> {
  const parsed = createProjectSchema.safeParse(values)
  if (!parsed.success) {
    return { error: "Check the project name and key." }
  }

  const user = await getCurrentUser()
  if (!user) {
    return { error: "Sign in to create a project." }
  }

  try {
    const projectId = await createProjectRecord(user.id, parsed.data)
    if (!projectId) return { error: "The project was created, but it could not be opened." }

    projectPaths(projectId)
    return { success: "Project created.", href: `/projects/${projectId}` }
  } catch (error) {
    return failure(error, "createProject", user.id)
  }
}

export async function updateProject(projectId: string, values: unknown): Promise<ActionState> {
  const parsed = updateProjectSchema.safeParse(values)
  if (!parsed.success) {
    return { error: "Check the project details and try again." }
  }

  const user = await getCurrentUser()
  if (!user) {
    return { error: "Sign in to edit this project." }
  }

  try {
    await updateProjectRecord(user.id, projectId, parsed.data)
    projectPaths(projectId)
    return { success: "Project saved." }
  } catch (error) {
    return failure(error, "updateProject", user.id, projectId)
  }
}

export async function setProjectArchived(projectId: string, archived: boolean): Promise<ActionState> {
  const user = await getCurrentUser()
  if (!user) {
    return { error: "Sign in to update this project." }
  }

  try {
    await archiveProjectRecord(user.id, projectId, archived)
    projectPaths(projectId)
    return { success: archived ? "Project archived." : "Project restored." }
  } catch (error) {
    return failure(error, "setProjectArchived", user.id, projectId)
  }
}

export async function addProjectMember(projectId: string, values: unknown): Promise<ActionState> {
  const parsed = addMemberSchema.safeParse(values)
  if (!parsed.success) {
    return { error: "Enter the member's email and role." }
  }

  const user = await getCurrentUser()
  if (!user) {
    return { error: "Sign in to manage members." }
  }

  try {
    await addProjectMemberRecord(user.id, projectId, parsed.data)
    projectPaths(projectId)
    return { success: "Member added." }
  } catch (error) {
    return failure(error, "addProjectMember", user.id, projectId)
  }
}

export async function updateMemberRole(
  projectId: string,
  membershipId: string,
  role: ProjectRole,
): Promise<ActionState> {
  const parsed = memberRoleSchema.safeParse({ role })
  if (!parsed.success) {
    return { error: "Choose a valid role." }
  }

  const user = await getCurrentUser()
  if (!user) {
    return { error: "Sign in to manage members." }
  }

  try {
    await updateMemberRoleRecord(user.id, projectId, membershipId, parsed.data.role)
    projectPaths(projectId)
    return { success: "Role updated." }
  } catch (error) {
    return failure(error, "updateMemberRole", user.id, projectId)
  }
}

export async function removeProjectMember(projectId: string, membershipId: string): Promise<ActionState> {
  const user = await getCurrentUser()
  if (!user) {
    return { error: "Sign in to manage members." }
  }

  try {
    const removedUserId = await removeProjectMemberRecord(user.id, projectId, membershipId)
    projectPaths(projectId)
    if (removedUserId === user.id) {
      return { success: "You left the project.", href: "/projects" }
    }

    return { success: "Member removed." }
  } catch (error) {
    return failure(error, "removeProjectMember", user.id, projectId)
  }
}
