"use client"

import { useState, useTransition, type FormEvent, type KeyboardEvent } from "react"
import { toast } from "sonner"

import { useIssueChanged } from "@/components/issues/issue-inline"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { addComment, deleteComment } from "@/lib/actions/issues"
import { userInitials } from "@/lib/auth/user"
import { formatProjectDate } from "@/lib/projects/format"
import { commentSchema } from "@/lib/validations/issue"

export function CommentSection({
  issueId,
  currentUserId,
  comments,
  mentionNames,
  canComment = true,
}: {
  issueId: string
  currentUserId: string
  comments: { id: string; body: string; createdAt: string; authorId: string; authorName: string }[]
  mentionNames: string[]
  canComment?: boolean
}) {
  const changed = useIssueChanged()
  const [pending, startTransition] = useTransition()
  const [body, setBody] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  function submit(event?: FormEvent) {
    event?.preventDefault()
    const parsed = commentSchema.safeParse({ body })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Write a comment")
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await addComment(issueId, parsed.data)
      if (result?.error) {
        setError(result.error)
        return
      }
      setBody("")
      changed()
    })
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) submit()
  }

  return (
    <section className="grid min-w-0 gap-3">
      {comments.length === 0 ? <p className="text-sm text-muted-foreground">No comments yet. Start the conversation.</p> : null}
      {comments.length >= 50 ? <p className="text-xs text-muted-foreground">Older comments are not listed.</p> : null}
      <ul className="grid gap-3">
        {comments.map((comment) => (
          <li key={comment.id} className="flex min-w-0 gap-3">
            <span className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-accent text-[11px] font-medium text-accent-foreground">
              {userInitials(comment.authorName)}
            </span>
            <div className="min-w-0 flex-1 rounded-lg border bg-card px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-xs">
                  <span className="font-medium">{comment.authorName}</span>
                  <span className="text-muted-foreground"> · {formatProjectDate(comment.createdAt)}</span>
                </p>
                {comment.authorId === currentUserId ? (
                  <Button type="button" size="xs" variant="ghost" disabled={pending} onClick={() => setDeleteId(comment.id)}>
                    Delete
                  </Button>
                ) : null}
              </div>
              <p className="mt-1 text-sm whitespace-pre-wrap [overflow-wrap:anywhere]">{comment.body}</p>
            </div>
          </li>
        ))}
      </ul>

      {canComment ? (
        <form onSubmit={submit} className="grid gap-2">
          <Textarea
            aria-label="Add a comment"
            value={body}
            rows={3}
            maxLength={8000}
            placeholder={mentionNames.length > 0 ? `Add a comment… Mention a teammate with @${mentionNames[0]}` : "Add a comment…"}
            onChange={(event) => setBody(event.target.value)}
            onKeyDown={onKeyDown}
          />
          {error ? <p role="alert" className="text-xs text-destructive">{error}</p> : null}
          <div className="flex items-center gap-2">
            <Button type="submit" size="sm" disabled={pending || body.trim() === ""}>
              {pending ? "Posting…" : "Comment"}
            </Button>
            <span className="hidden text-xs text-muted-foreground sm:inline">⌘/Ctrl + Enter to post</span>
          </div>
        </form>
      ) : null}

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(next) => { if (!next) setDeleteId(null) }}
        title="Delete this comment?"
        description="The comment is removed for everyone on this issue."
        confirmLabel="Delete comment"
        pending={pending}
        destructive
        onConfirm={() => {
          if (!deleteId) return
          startTransition(async () => {
            const result = await deleteComment(issueId, deleteId)
            if (result?.error) {
              toast.error(result.error)
              return
            }
            toast.success(result?.success ?? "Comment deleted.")
            setDeleteId(null)
            changed()
          })
        }}
      />
    </section>
  )
}
