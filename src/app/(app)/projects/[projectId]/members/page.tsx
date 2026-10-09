import { notFound } from "next/navigation"
import { Suspense } from "react"

import { MemberManager } from "@/components/projects/member-manager"
import { DetailSkeleton } from "@/components/shared/page-skeleton"
import { getCurrentUser } from "@/lib/auth/session"
import { getProject } from "@/lib/services/project.service"

export const metadata = { title: "Members" }

export default function MembersPage({ params }: { params: Promise<{ projectId: string }> }) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <MembersContent params={params} />
    </Suspense>
  )
}

async function MembersContent({ params }: { params: Promise<{ projectId: string }> }) {
  const [{ projectId }, user] = await Promise.all([params, getCurrentUser()])
  if (!user) {
    return null
  }

  const project = await getProject(projectId, user.id)
  if (!project) {
    notFound()
  }

  const canManage = project.role === "owner" || project.role === "admin"

  return (
    <div className="grid gap-3">
      <h2 className="text-sm font-semibold tracking-tight">
        {project.memberCount} {project.memberCount === 1 ? "member" : "members"}
      </h2>
      <p className="text-sm text-muted-foreground">
        {canManage
          ? "Add someone who already has a FixTask account. Owners and admins can change roles and remove members."
          : "You can leave this project. Owners and admins can add people, change roles, and remove members."}
      </p>
      <MemberManager
        projectId={project.id}
        canManage={canManage}
        actorRole={project.role}
        members={project.members.map((member) => ({
          ...member,
          isYou: member.userId === user.id,
        }))}
      />
    </div>
  )
}
