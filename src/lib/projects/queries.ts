import { cache } from "react"

import { createClient } from "@/lib/supabase/server"
import { isProjectRole } from "@/lib/projects/format"
import type { ProjectRole } from "@/lib/validations/project"

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

export const getProjects = cache(async (userId: string): Promise<ProjectSummary[]> => {
  const supabase = await createClient()
  const [{ data: projects, error }, { data: issues, error: issueError }] = await Promise.all([
    supabase
      .from("projects")
      .select(
        "id, name, key, description, icon, lead_id, created_at, archived_at, lead:profiles!projects_lead_id_fkey(display_name), project_members(user_id, role)",
      )
      .order("name"),
    supabase.from("issues").select("project_id, issue_statuses!issues_status_id_fkey(category)"),
  ])

  if (error || issueError) {
    throw new Error("Could not load projects.")
  }

  const counts = new Map<string, { open: number; done: number }>()
  for (const issue of issues ?? []) {
    const status = one(issue.issue_statuses as StatusEmbed)
    const current = counts.get(issue.project_id) ?? { open: 0, done: 0 }
    if (status?.category === "done") {
      current.done += 1
    } else {
      current.open += 1
    }
    counts.set(issue.project_id, current)
  }

  return (projects ?? []).map((project) => {
    const members = project.project_members ?? []
    const mine = members.find((member) => member.user_id === userId)
    const tally = counts.get(project.id) ?? { open: 0, done: 0 }
    const lead = one(project.lead as ProfileEmbed)

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
    throw new Error("Could not load this project.")
  }

  if (!project) {
    return null
  }

  const { data: issues, error: issueError } = await supabase
    .from("issues")
    .select("id, issue_number, title, updated_at, issue_statuses!issues_status_id_fkey(name, category)")
    .eq("project_id", projectId)
    .order("updated_at", { ascending: false })

  if (issueError) {
    throw new Error("Could not load this project.")
  }

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
    openIssueCount: mappedIssues.filter((issue) => issue.category !== "done").length,
    doneIssueCount: mappedIssues.filter((issue) => issue.category === "done").length,
    members: members.sort((a, b) => a.name.localeCompare(b.name)),
    issues: mappedIssues,
  }
})
