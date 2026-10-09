"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { RevealButton } from "@/components/shared/pending-ui"
import { deleteIssue } from "@/lib/actions/issues"

export function DeleteIssueButton({ issueId, issueKey }: { issueId: string; issueKey: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  return (
    <>
      <RevealButton type="button" size="sm" variant="ghost" className="text-destructive" disabled={pending} onReveal={() => setOpen(true)}>
        Delete issue
      </RevealButton>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={`Delete ${issueKey}?`}
        description="Its comments, labels, and history are removed too."
        confirmLabel={pending ? "Deleting…" : "Delete issue"}
        pending={pending}
        destructive
        onConfirm={() => {
          startTransition(async () => {
            const result = await deleteIssue(issueId)
            if (result?.error) {
              toast.error(result.error)
              return
            }
            toast.success(result?.success ?? "Issue deleted.")
            setOpen(false)
            if (result?.href) router.push(result.href)
          })
        }}
      />
    </>
  )
}
