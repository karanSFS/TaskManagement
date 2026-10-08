import { notFound } from "next/navigation"
import { Suspense } from "react"

import { MemberManager } from "@/components/projects/member-manager"
import { Skeleton } from "@/components/ui/skeleton"
import { getCurrentUser } from "@/lib/auth/session"
import { getProject } from "@/lib/services/project.service"

export const metadata = { title: "Members" }

export default function MembersPage({ params }: { params: Promise<{ projectId: string }> }) {
  return (
    <Suspense fallback={<Skeleton className="h-40 w-full" />}>
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
      <p className="text-sm text-muted-foreground">
        {canManage
          ? "Add someone who already has a TaskForge account. They are notified in the app."
          : "Owners and admins can add or remove members."}
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
