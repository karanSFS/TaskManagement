import { cache } from "react"

import { AuthorizationError } from "@/lib/errors/authorization-error"
import { AppError } from "@/lib/errors/app-error"
import { DatabaseError } from "@/lib/errors/database-error"
import { NotFoundError } from "@/lib/errors/not-found-error"
import { ValidationError } from "@/lib/errors/validation-error"
import { isProjectRole } from "@/lib/projects/format"
import { createClient } from "@/lib/supabase/server"
import type { CreateProjectValues, ProjectRole, UpdateProjectValues } from "@/lib/validations/project"

export type ProjectMember = {
  id: string
  userId: string
  name: string
  role: ProjectRole
}

export type ProjectSummary = {
  id: string
  name: string
  key: string
  description: string
  icon: string | null
  leadId: string | null
  leadName: string
  createdAt: string
  archivedAt: string | null
  role: ProjectRole
  memberCount: number
  roster: { id: string; name: string }[]
  openIssueCount: number
  doneIssueCount: number
}

export type ProjectIssue = {
  id: string
  number: number
  title: string
  status: string
  category: string
  updatedAt: string
}

export type ProjectDetail = ProjectSummary & {
  createdByName: string
  nextIssueNumber: number
  members: ProjectMember[]
  issues: ProjectIssue[]
}

const recentIssueLimit = 10

type ProfileEmbed = { display_name: string } | { display_name: string }[] | null
type StatusEmbed = { name: string; category: string } | { name: string; category: string }[] | null

function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null
  }

  return value ?? null
}

function asRole(role: string): ProjectRole {
  return isProjectRole(role) ? role : "member"
}

function raiseProjectWriteError(message: string): never {
  if (message.includes("projects_key_key") || message.includes("duplicate key")) {
    throw new AppError("DUPLICATE_PROJECT_KEY", "That project key is already in use.", 409)
  }

  if (message.includes("Project lead must be a member")) {
    throw new AppError("INVALID_PROJECT_LEAD", "The project lead has to be a member.", 422)
  }

  if (message.includes("at least one owner")) {
    throw new AppError("LAST_OWNER", "A project must keep at least one owner.", 409)
  }

  if (message.includes("No TaskForge account")) {
    throw new NotFoundError("MEMBER_NOT_FOUND", "No TaskForge account uses that email")
  }

  if (message.includes("already a member")) {
    throw new AppError("MEMBER_EXISTS", "That account is already a member", 409)
  }

  if (message.includes("cannot manage members")) {
    throw new AuthorizationError("PROJECT_ACCESS_DENIED", "You cannot manage members of this project")
  }

  if (message.includes("Only an owner can remove another owner")) {
    throw new AuthorizationError("PROJECT_ACCESS_DENIED", "Only an owner can remove another owner.")
  }

  if (message.includes("Only an owner can change another owner")) {
    throw new AuthorizationError("PROJECT_ACCESS_DENIED", "Only an owner can change another owner's role.")
  }

  if (message.includes("Only an owner")) {
    throw new AuthorizationError("PROJECT_ACCESS_DENIED", "Only an owner can add another owner.")
  }

  if (message.includes("Enter a valid email")) {
    throw new ValidationError("Enter a valid email")
  }

  if (message.includes("Role must be")) {
    throw new ValidationError("Role must be owner, admin, or member")
  }

  throw new DatabaseError("Could not save the project. Try again.")
}

async function requireManager(projectId: string, userId: string, role: ProjectRole) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("project_members")
    .select("role")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .maybeSingle()

  if (error) {
    throw new DatabaseError("Could not check project access.")
  }

  if (!data || (data.role !== "owner" && data.role !== "admin")) {
    throw new AuthorizationError("PROJECT_ACCESS_DENIED", "You cannot manage members of this project.")
  }

  if (role === "owner" && data.role !== "owner") {
    throw new AuthorizationError("PROJECT_ACCESS_DENIED", "Only an owner can add another owner.")
  }
}

const getIssueCounts = cache(async () => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("project_issue_counts")
  if (error || data === null) {
    throw new DatabaseError("Could not load issue counts.")
  }

  return new Map((data ?? []).map((row) => [row.project_id, { open: row.open_count, done: row.done_count }]))
})

export const getProjects = cache(async (userId: string): Promise<ProjectSummary[]> => {
  const supabase = await createClient()
  const [{ data: projects, error }, counts] = await Promise.all([
    supabase
      .from("projects")
      .select(
        "id, name, key, description, icon, lead_id, created_at, archived_at, lead:profiles!projects_lead_id_fkey(display_name), project_members(user_id, role, profile:profiles!project_members_user_id_fkey(display_name))",
      )
      .order("name"),
    getIssueCounts(),
  ])

  if (error) {
    throw new DatabaseError("Could not load projects.")
  }

  return (projects ?? []).map((project) => {
    const memberships = project.project_members ?? []
    const mine = memberships.find((member) => member.user_id === userId)
    const tally = counts.get(project.id) ?? { open: 0, done: 0 }
    const lead = one(project.lead as ProfileEmbed)
    const members = memberships
      .map((member) => ({
        id: member.user_id,
        name: one(member.profile as ProfileEmbed)?.display_name ?? "Member",
      }))
      .sort((a, b) => a.name.localeCompare(b.name))

    return {
      id: project.id,
      name: project.name,
      key: project.key,
      description: project.description,
      icon: project.icon,
      leadId: project.lead_id,
      leadName: lead?.display_name ?? "No lead",
      createdAt: project.created_at,
      archivedAt: project.archived_at,
      role: asRole(mine?.role ?? "member"),
      memberCount: members.length,
      roster: members,
      openIssueCount: tally.open,
      doneIssueCount: tally.done,
    }
  })
})

export const getProject = cache(async (projectId: string, userId: string): Promise<ProjectDetail | null> => {
  const supabase = await createClient()
  const { data: project, error } = await supabase
    .from("projects")
    .select(
      "id, name, key, description, icon, lead_id, created_at, archived_at, next_issue_number, lead:profiles!projects_lead_id_fkey(display_name), creator:profiles!projects_created_by_fkey(display_name), project_members(id, user_id, role, profile:profiles!project_members_user_id_fkey(display_name))",
    )
    .eq("id", projectId)
    .maybeSingle()

  if (error) {
    throw new DatabaseError("Could not load this project.")
  }

  if (!project) {
    return null
  }

  const [{ data: issues, error: issueError }, counts] = await Promise.all([
    supabase
      .from("issues")
      .select("id, issue_number, title, updated_at, issue_statuses!issues_status_id_fkey(name, category)")
      .eq("project_id", projectId)
      .order("updated_at", { ascending: false })
      .limit(recentIssueLimit),
    getIssueCounts(),
  ])

  if (issueError) {
    throw new DatabaseError("Could not load this project.")
  }

  const tally = counts.get(project.id) ?? { open: 0, done: 0 }

  const members = (project.project_members ?? []).map((member) => {
    const profile = one(member.profile as ProfileEmbed)
    return {
      id: member.id,
      userId: member.user_id,
      name: profile?.display_name ?? "Member",
      role: asRole(member.role),
    }
  })
  const mine = members.find((member) => member.userId === userId)
  const mappedIssues = (issues ?? []).map((issue) => {
    const status = one(issue.issue_statuses as StatusEmbed)
    return {
      id: issue.id,
      number: issue.issue_number,
      title: issue.title,
      status: status?.name ?? "Unknown",
      category: status?.category ?? "todo",
      updatedAt: issue.updated_at,
    }
  })

  return {
    id: project.id,
    name: project.name,
    key: project.key,
    description: project.description,
    icon: project.icon,
    leadId: project.lead_id,
    leadName: one(project.lead as ProfileEmbed)?.display_name ?? "No lead",
    createdByName: one(project.creator as ProfileEmbed)?.display_name ?? "Unknown",
    createdAt: project.created_at,
    archivedAt: project.archived_at,
    nextIssueNumber: project.next_issue_number,
    role: asRole(mine?.role ?? "member"),
    memberCount: members.length,
    roster: members.map((member) => ({ id: member.userId, name: member.name })),
    openIssueCount: tally.open,
    doneIssueCount: tally.done,
    members: members.sort((a, b) => a.name.localeCompare(b.name)),
    issues: mappedIssues,
  }
})

export async function createProjectRecord(userId: string, input: CreateProjectValues) {
  const supabase = await createClient()
  // Returning the new row fails RLS until the owner-membership trigger runs.
  const { error } = await supabase.from("projects").insert({
    name: input.name,
    key: input.key,
    description: input.description,
    icon: input.icon || null,
    created_by: userId,
    lead_id: userId,
  })

  if (error) {
    raiseProjectWriteError(error.message)
  }

  const { data, error: readError } = await supabase.from("projects").select("id").eq("key", input.key).maybeSingle()

  if (readError) {
    throw new DatabaseError("Could not open the new project.")
  }

  return data?.id ?? null
}

export async function updateProjectRecord(_userId: string, projectId: string, input: UpdateProjectValues) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("projects")
    .update({
      name: input.name,
      key: input.key,
      description: input.description,
      icon: input.icon || null,
      lead_id: input.leadId,
    })
    .eq("id", projectId)
    .select("id")

  if (error) {
    raiseProjectWriteError(error.message)
  }

  if (!data?.length) {
    throw new AuthorizationError("PROJECT_ACCESS_DENIED", "You cannot edit this project.")
  }
}

export async function setProjectArchived(_userId: string, projectId: string, archived: boolean) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("projects")
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq("id", projectId)
    .select("id")

  if (error) {
    raiseProjectWriteError(error.message)
  }

  if (!data?.length) {
    throw new AuthorizationError("PROJECT_ACCESS_DENIED", "You cannot edit this project.")
  }
}

export async function addProjectMemberRecord(
  userId: string,
  projectId: string,
  input: { email: string; role: ProjectRole },
) {
  await requireManager(projectId, userId, input.role)
  const supabase = await createClient()
  const { error } = await supabase.rpc("add_project_member", {
    target_project_id: projectId,
    member_email: input.email,
    member_role: input.role,
  })

  if (error) {
    raiseProjectWriteError(error.message)
  }
}

export async function updateMemberRoleRecord(
  userId: string,
  projectId: string,
  membershipId: string,
  role: ProjectRole,
) {
  await requireManager(projectId, userId, role)
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("project_members")
    .update({ role })
    .eq("id", membershipId)
    .eq("project_id", projectId)
    .select("id")

  if (error) {
    raiseProjectWriteError(error.message)
  }

  if (!data?.length) {
    throw new AuthorizationError("PROJECT_ACCESS_DENIED", "You cannot manage members of this project.")
  }
}

export async function removeProjectMemberRecord(projectId: string, membershipId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("project_members")
    .delete()
    .eq("id", membershipId)
    .eq("project_id", projectId)
    .select("id, user_id")

  if (error) {
    raiseProjectWriteError(error.message)
  }

  if (!data?.length || !data[0]) {
    throw new AuthorizationError("PROJECT_ACCESS_DENIED", "You cannot remove that member.")
  }

  return data[0].user_id
}
