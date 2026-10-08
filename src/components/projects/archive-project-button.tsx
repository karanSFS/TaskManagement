"use client"

import { useTransition } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { setProjectArchived } from "@/lib/actions/projects"

export function ArchiveProjectButton({ projectId, archived }: { projectId: string; archived: boolean }) {
  const [pending, startTransition] = useTransition()

  return (
    <Button
      type="button"
      variant={archived ? "outline" : "destructive"}
      disabled={pending}
      onClick={() => {
        if (!archived && !window.confirm("Archive this project? Nobody can file new issues until it is restored.")) {
          return
        }
        startTransition(async () => {
          const result = await setProjectArchived(projectId, !archived)
          if (result?.error) {
            toast.error(result.error)
            return
          }
          toast.success(result?.success ?? "Project updated.")
        })
      }}
    >
      {pending ? "Saving…" : archived ? "Restore project" : "Archive project"}
    </Button>
  )
}
