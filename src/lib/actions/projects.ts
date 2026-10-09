"use server"

import { revalidatePath } from "next/cache"
import { headers } from "next/headers"

import { actionError } from "@/lib/actions/result"
import { type ActionState } from "@/lib/auth/paths"
import { getCurrentUser } from "@/lib/auth/session"
import { AppError } from "@/lib/errors/app-error"
import { sendInvitationEmail } from "@/lib/mail/invitation"
import {
  createInvitationRecord,
  listMyInvitations,
  listProjectInvitations,
  respondToInvitationRecord,
  revokeInvitationRecord,
} from "@/lib/services/invitation.service"
import {
  createProjectRecord,
  deleteArchivedProjectRecord,
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

async function siteOrigin() {
  const headerStore = await headers()
  const origin = headerStore.get("origin")
  if (origin) return origin
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host")
  const proto = headerStore.get("x-forwarded-proto") ?? "https"
  return host ? `${proto}://${host}` : "http://localhost:3000"
}

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
    const invite = await createInvitationRecord(projectId, parsed.data.email, parsed.data.role)
    const warning = await sendInvitationEmail(invite, await siteOrigin())
    projectPaths(projectId)
    revalidatePath("/invitations")
    revalidatePath("/dashboard")
    revalidatePath("/notifications")
    return { success: warning ?? "Invitation sent." }
  } catch (error) {
    return failure(error, "addProjectMember", user.id, projectId)
  }
}

export async function resendProjectInvitation(projectId: string, invitationId: string): Promise<ActionState> {
  const user = await getCurrentUser()
  if (!user) return { error: "Sign in to manage members." }

  try {
    const invitations = await listProjectInvitations(projectId)
    const invite = invitations.find((item) => item.id === invitationId && item.status === "pending")
    if (!invite) return { error: "This invitation is no longer open." }
    const sent = await createInvitationRecord(projectId, invite.email, invite.role)
    const warning = await sendInvitationEmail(sent, await siteOrigin())
    projectPaths(projectId)
    revalidatePath("/invitations")
    return { success: warning ?? "Invitation sent." }
  } catch (error) {
    return failure(error, "resendProjectInvitation", user.id, projectId)
  }
}

export async function revokeProjectInvitation(projectId: string, invitationId: string): Promise<ActionState> {
  const user = await getCurrentUser()
  if (!user) return { error: "Sign in to manage members." }

  try {
    await revokeInvitationRecord(invitationId)
    projectPaths(projectId)
    revalidatePath("/invitations")
    revalidatePath("/notifications")
    return { success: "Invitation cancelled." }
  } catch (error) {
    return failure(error, "revokeProjectInvitation", user.id, projectId)
  }
}

export async function respondToInvitation(invitationId: string, decision: "accept" | "reject"): Promise<ActionState> {
  const user = await getCurrentUser()
  if (!user) return { error: "Sign in to answer this invitation." }

  try {
    const mine = user.email ? await listMyInvitations(user.email) : []
    const invite = mine.find((item) => item.id === invitationId)
    await respondToInvitationRecord(invitationId, decision)
    revalidatePath("/invitations")
    revalidatePath("/projects")
    revalidatePath("/dashboard")
    revalidatePath("/notifications")
    revalidatePath("/my-work")
    if (invite) revalidatePath(`/projects/${invite.projectId}`)
    return {
      success: decision === "accept" ? "Invitation accepted." : "Invitation rejected.",
      href: decision === "accept" && invite ? `/projects/${invite.projectId}` : undefined,
    }
  } catch (error) {
    return failure(error, "respondToInvitation", user.id, invitationId)
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

export async function deleteArchivedProject(projectId: string): Promise<ActionState> {
  const user = await getCurrentUser()
  if (!user) {
    return { error: "Sign in to delete this project." }
  }

  try {
    await deleteArchivedProjectRecord(user.id, projectId)
    projectPaths(projectId)
    return { success: "Project deleted.", href: "/projects" }
  } catch (error) {
    return failure(error, "deleteArchivedProject", user.id, projectId)
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
