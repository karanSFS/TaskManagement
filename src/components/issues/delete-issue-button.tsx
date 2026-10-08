"use client"

import { useTransition } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { deleteIssue } from "@/lib/actions/issues"

export function DeleteIssueButton({ issueId, issueKey }: { issueId: string; issueKey: string }) {
  const [pending, startTransition] = useTransition()

  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      className="text-destructive"
      disabled={pending}
      onClick={() => {
        if (!window.confirm(`Delete ${issueKey}? Its comments, labels, and history are removed too.`)) {
          return
        }
        startTransition(async () => {
          const result = await deleteIssue(issueId)
          if (result?.error) toast.error(result.error)
        })
      }}
    >
      {pending ? "Deleting…" : "Delete issue"}
    </Button>
  )
}
