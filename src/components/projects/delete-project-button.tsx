"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { Button } from "@/components/ui/button"
import { deleteArchivedProject } from "@/lib/actions/projects"

export function DeleteProjectButton({ projectId, projectName }: { projectId: string; projectName: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState("")
  const [pending, startTransition] = useTransition()

  return (
    <>
      <Button type="button" variant="destructive" disabled={pending} onClick={() => setOpen(true)}>
        Delete project
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={(next) => {
          if (!next) setError("")
          setOpen(next)
        }}
        title={`Delete ${projectName}?`}
        description="This permanently deletes the project and its issues, sprints, and comments. It cannot be undone."
        confirmLabel="Delete project"
        pending={pending}
        destructive
        error={error}
        onConfirm={() => {
          setError("")
          startTransition(async () => {
            const result = await deleteArchivedProject(projectId)
            if (result?.error) {
              setError(result.error)
              return
            }
            toast.success(result?.success ?? "Project deleted.")
            setOpen(false)
            router.push(result?.href ?? "/projects")
          })
        }}
      />
    </>
  )
}
