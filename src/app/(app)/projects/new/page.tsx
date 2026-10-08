import Link from "next/link"

import { PageHeader } from "@/components/layout/page-header"
import { ProjectForm } from "@/components/projects/project-form"
import { Button } from "@/components/ui/button"

export const metadata = { title: "New project" }

export default function NewProjectPage() {
  return (
    <div className="grid gap-4">
      <PageHeader
        title="New project"
        description="Name the workspace and choose a short key. You become the owner and the lead."
        actions={
          <Button asChild variant="outline">
            <Link href="/projects">Back</Link>
          </Button>
        }
      />
      <ProjectForm mode="create" defaultValues={{ name: "", key: "", description: "", icon: "folder-kanban" }} />
    </div>
  )
}
