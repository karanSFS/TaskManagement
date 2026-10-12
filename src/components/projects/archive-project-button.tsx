"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { Button } from "@/components/ui/button"
import { setProjectArchived } from "@/lib/actions/projects"

export function ArchiveProjectButton({
  projectId,
  archived,
  compact = false,
}: {
  projectId: string
  archived: boolean
  compact?: boolean
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  function run() {
    startTransition(async () => {
      const result = await setProjectArchived(projectId, !archived)
      if (result?.error) {
        toast.error(result.error)
        return
      }
      toast.success(result?.success ?? "Project updated.")
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <>
      <Button
        type="button"
        size={compact ? "sm" : "default"}
        variant={archived || compact ? "outline" : "destructive"}
        disabled={pending}
        onClick={() => (archived ? run() : setOpen(true))}
      >
        {pending ? "Saving…" : archived ? (compact ? "Restore" : "Restore project") : compact ? "Archive" : "Archive project"}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Archive this project?"
        description="The project becomes read-only. Nobody can create issues, invite people, or plan sprints until it is restored."
        confirmLabel="Archive project"
        pending={pending}
        destructive
        onConfirm={run}
      />
    </>
  )
}
