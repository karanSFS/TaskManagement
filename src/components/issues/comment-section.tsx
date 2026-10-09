"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { FormDialog } from "@/components/shared/form-dialog"
import { RevealButton } from "@/components/shared/pending-ui"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form"
import { Textarea } from "@/components/ui/textarea"
import { addComment, deleteComment } from "@/lib/actions/issues"
import { formatProjectDate } from "@/lib/projects/format"
import { commentSchema } from "@/lib/validations/issue"
import type { z } from "zod"

type CommentValues = z.infer<typeof commentSchema>

export function CommentSection({
  issueId,
  currentUserId,
  comments,
  mentionNames,
}: {
  issueId: string
  currentUserId: string
  comments: { id: string; body: string; createdAt: string; authorId: string; authorName: string }[]
  mentionNames: string[]
}) {
  const [pending, startTransition] = useTransition()
  const [composerOpen, setComposerOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const form = useForm<CommentValues>({
    resolver: zodResolver(commentSchema),
    defaultValues: { body: "" },
  })

  return (
    <section className="grid min-w-0 gap-3">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-medium">Comments</h2>
        <RevealButton type="button" size="sm" variant="outline" onReveal={() => setComposerOpen(true)}>
          Add comment
        </RevealButton>
      </div>
      {comments.length === 0 ? <p className="text-sm text-muted-foreground">No comments yet.</p> : null}
      <ul className="grid gap-2">
        {comments.map((comment) => (
          <li key={comment.id} className="rounded-lg border bg-card px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                {comment.authorName} · {formatProjectDate(comment.createdAt)}
              </p>
              {comment.authorId === currentUserId ? (
                <Button type="button" size="xs" variant="ghost" disabled={pending} onClick={() => setDeleteId(comment.id)}>
                  Delete
                </Button>
              ) : null}
            </div>
            <p className="mt-1 whitespace-pre-wrap text-sm">{comment.body}</p>
          </li>
        ))}
      </ul>
      <FormDialog
        open={composerOpen}
        onOpenChange={(next) => {
          if (!next) form.reset({ body: "" })
          setComposerOpen(next)
        }}
        title="Add comment"
        description="Mention a teammate with @Name."
        dirty={form.formState.isDirty}
        pending={pending}
      >
      <Form {...form}>
        <form
          className="grid gap-3"
          onSubmit={form.handleSubmit((values) => {
            startTransition(async () => {
              const result = await addComment(issueId, values)
              if (result?.error) {
                toast.error(result.error)
                return
              }
              form.reset({ body: "" })
              setComposerOpen(false)
              toast.success(result?.success ?? "Comment added.")
            })
          })}
        >
          <FormField
            control={form.control}
            name="body"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Textarea placeholder="Add a comment. Mention a teammate with @Name." aria-label="Comment" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {mentionNames.length > 0 ? (
            <p className="text-xs text-muted-foreground">Teammates: {mentionNames.join(", ")}</p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" disabled={pending} onClick={() => setComposerOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending} size="sm">
              {pending ? "Sending…" : "Add comment"}
            </Button>
          </div>
        </form>
      </Form>
      </FormDialog>
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
          })
        }}
      />
    </section>
  )
}
