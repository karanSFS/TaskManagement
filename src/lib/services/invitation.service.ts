import { z } from "zod"

import { DatabaseError } from "@/lib/errors/database-error"
import { isProjectRole } from "@/lib/projects/format"
import { createClient } from "@/lib/supabase/server"
import type { ProjectRole } from "@/lib/validations/project"

import { raiseProjectWriteError } from "@/lib/services/project.service"

const payloadSchema = z.object({
  id: z.uuid(),
  token: z.uuid(),
  email: z.string(),
  role: z.string(),
  projectName: z.string(),
  projectKey: z.string(),
  inviterName: z.string(),
  expiresAt: z.string(),
  resent: z.boolean(),
})

const previewSchema = z.object({
  id: z.uuid(),
  email: z.string(),
  role: z.string(),
  status: z.string(),
  expiresAt: z.string(),
  projectName: z.string(),
  projectKey: z.string(),
  inviterName: z.string(),
  emailMatches: z.boolean(),
})

export type InvitationPayload = z.infer<typeof payloadSchema>
export type InvitationPreview = z.infer<typeof previewSchema>

export type ProjectInvitation = {
  id: string
  email: string
  role: ProjectRole
  status: string
  createdAt: string
  expiresAt: string
  inviterName: string
  projectId: string
  projectName: string
  projectKey: string
}

type InviterEmbed = { display_name: string } | { display_name: string }[] | null
type ProjectEmbed = { name: string; key: string } | { name: string; key: string }[] | null

function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

async function syncInvitations() {
  const supabase = await createClient()
  const { error } = await supabase.rpc("sync_invitations")
  if (error) throw new DatabaseError("Could not load invitations.")
}

export async function createInvitationRecord(projectId: string, email: string, role: ProjectRole) {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("create_project_invitation", {
    target_project_id: projectId,
    member_email: email,
    member_role: role,
  })
  if (error) raiseProjectWriteError(error.message)
  const parsed = payloadSchema.safeParse(data)
  if (!parsed.success || !isProjectRole(parsed.data.role)) {
    throw new DatabaseError("Could not send the invitation.")
  }
  return parsed.data
}

export async function revokeInvitationRecord(invitationId: string) {
  const supabase = await createClient()
  const { error } = await supabase.rpc("revoke_project_invitation", { target_invitation_id: invitationId })
  if (error) raiseProjectWriteError(error.message)
}

export async function respondToInvitationRecord(invitationId: string, decision: "accept" | "reject") {
  const supabase = await createClient()
  const { error } = await supabase.rpc("respond_to_invitation", {
    target_invitation_id: invitationId,
    decision,
  })
  if (error) raiseProjectWriteError(error.message)
}

export async function listProjectInvitations(projectId: string): Promise<ProjectInvitation[]> {
  await syncInvitations()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("project_invitations")
    .select("id, email, role, status, created_at, expires_at, project_id, inviter:profiles!project_invitations_invited_by_fkey(display_name), project:projects!project_invitations_project_id_fkey(name, key)")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })

  if (error || data === null) throw new DatabaseError("Could not load invitations.")
  return data.flatMap(mapInvitation)
}

export async function listMyInvitations(email: string): Promise<ProjectInvitation[]> {
  await syncInvitations()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("project_invitations")
    .select("id, email, role, status, created_at, expires_at, project_id, inviter:profiles!project_invitations_invited_by_fkey(display_name), project:projects!project_invitations_project_id_fkey(name, key)")
    .eq("email", email.trim().toLowerCase())
    .order("created_at", { ascending: false })

  if (error || data === null) throw new DatabaseError("Could not load invitations.")
  return data.flatMap(mapInvitation)
}

export async function getInvitationPreview(token: string): Promise<InvitationPreview | null> {
  await syncInvitations()
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("invitation_preview", { target_token: token })
  if (error) raiseProjectWriteError(error.message)
  if (data === null) return null
  const parsed = previewSchema.safeParse(data)
  if (!parsed.success) throw new DatabaseError("Could not load this invitation.")
  return parsed.data
}

function mapInvitation(row: {
  id: string
  email: string
  role: string
  status: string
  created_at: string
  expires_at: string
  project_id: string
  inviter: InviterEmbed
  project: ProjectEmbed
}): ProjectInvitation[] {
  if (!isProjectRole(row.role)) return []
  const project = one(row.project)
  return [{
    id: row.id,
    email: row.email,
    role: row.role,
    status: row.status,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    inviterName: one(row.inviter)?.display_name ?? "A teammate",
    projectId: row.project_id,
    projectName: project?.name ?? "Project",
    projectKey: project?.key ?? "",
  }]
}
