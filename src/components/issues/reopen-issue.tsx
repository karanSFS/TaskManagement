"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"

import { useIssueChanged, useIssueValues } from "@/components/issues/issue-inline"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { reopenIssue } from "@/lib/actions/issues"
import { commentSchema } from "@/lib/validations/issue"

type StatusOption = { id: string; category?: string }

export function ReopenIssue({
  issueId,
  statuses,
  assigneeName,
}: {
  issueId: string
  statuses: StatusOption[]
  assigneeName?: string | null
}) {
  const { values, canEdit } = useIssueValues()
  const changed = useIssueChanged()
  const [pending, startTransition] = useTransition()
  const [note, setNote] = useState("")
  const [error, setError] = useState<string | null>(null)
  const status = statuses.find((item) => item.id === values.statusId)

  if (!canEdit || status?.category !== "done") return null

  function submit() {
    const parsed = commentSchema.safeParse({ body: note })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Write a note about what is still broken.")
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await reopenIssue(issueId, parsed.data)
      if (result?.error) {
        setError(result.error)
        toast.error(result.error)
        return
      }
      setNote("")
      toast.success(result?.success ?? "Issue reopened. Your note is on the ticket.")
      changed()
    })
  }

  return (
    <section className="grid gap-3 rounded-xl border border-warning/40 bg-warning/10 px-3 py-3">
      <div className="grid gap-1">
        <h2 className="text-sm font-semibold">Check this finished issue</h2>
        <p className="text-sm text-muted-foreground">
          {assigneeName
            ? `${assigneeName} marked this done. If you checked the work and it is still broken, reopen it and leave a note.`
            : "This issue is marked done. If you checked the work and it is still broken, reopen it and leave a note."}
        </p>
      </div>
      <Textarea
        aria-label="Reopen note"
        value={note}
        rows={3}
        maxLength={8000}
        placeholder="What did you check, and what is still broken?"
        onChange={(event) => setNote(event.target.value)}
      />
      {error ? <p role="alert" className="text-xs text-destructive">{error}</p> : null}
      <div>
        <Button type="button" size="sm" disabled={pending || note.trim() === ""} onClick={submit}>
          {pending ? "Reopening…" : "Reopen issue"}
        </Button>
      </div>
    </section>
  )
}
