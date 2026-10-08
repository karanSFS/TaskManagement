"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { type ActionState } from "@/lib/auth/paths"
import { getCurrentUser } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"
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
}

function dbError(message: string) {
  if (message.includes("projects_key_key") || message.includes("duplicate key")) {
    return "That project key is already in use."
  }

  if (message.includes("Project lead must be a member")) {
    return "The project lead has to be a member."
  }

  if (message.includes("at least one owner")) {
    return "A project must keep at least one owner."
  }

  if (
    message.includes("No TaskForge account") ||
    message.includes("already a member") ||
    message.includes("cannot manage members") ||
    message.includes("Only an owner") ||
    message.includes("Enter a valid email") ||
    message.includes("Role must be")
  ) {
    return message.replace(/^ERROR:\s*/, "").replace(/\s*\(SQLSTATE.*\)$/, "")
  }

  return "Could not save the project. Try again."
}

async function requireUser() {
  const user = await getCurrentUser()
  if (!user) {
    return null
  }

  return user
}

export async function createProject(values: unknown): Promise<ActionState> {
  const parsed = createProjectSchema.safeParse(values)
  if (!parsed.success) {
    return { error: "Check the project name and key." }
  }

  const user = await requireUser()
  if (!user) {
    return { error: "Sign in to create a project." }
  }

  const supabase = await createClient()
  const { error } = await supabase.from("projects").insert({
    name: parsed.data.name,
    key: parsed.data.key,
    description: parsed.data.description,
    icon: parsed.data.icon || null,
    created_by: user.id,
    lead_id: user.id,
  })

  if (error) {
    return { error: dbError(error.message) }
  }

  const { data, error: readError } = await supabase
    .from("projects")
    .select("id")
    .eq("key", parsed.data.key)
    .maybeSingle()

  if (readError || !data) {
    redirect("/projects")
  }

  projectPaths(data.id)
  redirect(`/projects/${data.id}`)
}

export async function updateProject(projectId: string, values: unknown): Promise<ActionState> {
  const parsed = updateProjectSchema.safeParse(values)
  if (!parsed.success) {
    return { error: "Check the project details and try again." }
  }

  const user = await requireUser()
  if (!user) {
    return { error: "Sign in to edit this project." }
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("projects")
    .update({
      name: parsed.data.name,
      key: parsed.data.key,
      description: parsed.data.description,
      icon: parsed.data.icon || null,
      lead_id: parsed.data.leadId,
    })
    .eq("id", projectId)
    .select("id")

  if (error) {
    return { error: dbError(error.message) }
  }

  if (!data?.length) {
    return { error: "You cannot edit this project." }
  }

  projectPaths(projectId)
  return { success: "Project saved." }
}

export async function setProjectArchived(projectId: string, archived: boolean): Promise<ActionState> {
  const user = await requireUser()
  if (!user) {
    return { error: "Sign in to update this project." }
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("projects")
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq("id", projectId)
    .select("id")

  if (error) {
    return { error: dbError(error.message) }
  }

  if (!data?.length) {
    return { error: "You cannot edit this project." }
  }

  projectPaths(projectId)
  return { success: archived ? "Project archived." : "Project restored." }
}

export async function addProjectMember(projectId: string, values: unknown): Promise<ActionState> {
  const parsed = addMemberSchema.safeParse(values)
  if (!parsed.success) {
    return { error: "Enter the member's email and role." }
  }

  const user = await requireUser()
  if (!user) {
    return { error: "Sign in to manage members." }
  }

  const allowed = await callerCanGrant(projectId, user.id, parsed.data.role)
  if (allowed) {
    return allowed
  }

  const supabase = await createClient()
  const { error } = await supabase.rpc("add_project_member", {
    target_project_id: projectId,
    member_email: parsed.data.email,
    member_role: parsed.data.role,
  })

  if (error) {
    return { error: dbError(error.message) }
  }

  projectPaths(projectId)
  return { success: "Member added." }
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

  const user = await requireUser()
  if (!user) {
    return { error: "Sign in to manage members." }
  }

  const allowed = await callerCanGrant(projectId, user.id, parsed.data.role)
  if (allowed) {
    return allowed
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("project_members")
    .update({ role: parsed.data.role })
    .eq("id", membershipId)
    .eq("project_id", projectId)
    .select("id")

  if (error) {
    return { error: dbError(error.message) }
  }

  if (!data?.length) {
    return { error: "You cannot manage members of this project." }
  }

  projectPaths(projectId)
  return { success: "Role updated." }
}

export async function removeProjectMember(projectId: string, membershipId: string): Promise<ActionState> {
  const user = await requireUser()
  if (!user) {
    return { error: "Sign in to manage members." }
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("project_members")
    .delete()
    .eq("id", membershipId)
    .eq("project_id", projectId)
    .select("id, user_id")

  if (error) {
    return { error: dbError(error.message) }
  }

  if (!data?.length) {
    return { error: "You cannot remove that member." }
  }

  projectPaths(projectId)
  if (data[0]?.user_id === user.id) {
    redirect("/projects")
  }

  return { success: "Member removed." }
}

async function callerCanGrant(projectId: string, userId: string, role: ProjectRole): Promise<ActionState | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("project_members")
    .select("role")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .maybeSingle()

  if (error || !data || (data.role !== "owner" && data.role !== "admin")) {
    return { error: "You cannot manage members of this project." }
  }

  if (role === "owner" && data.role !== "owner") {
    return { error: "Only an owner can add another owner." }
  }

  return null
}
