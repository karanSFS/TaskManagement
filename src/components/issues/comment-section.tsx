"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useTransition } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

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
}: {
  issueId: string
  currentUserId: string
  comments: { id: string; body: string; createdAt: string; authorId: string; authorName: string }[]
}) {
  const [pending, startTransition] = useTransition()
  const form = useForm<CommentValues>({
    resolver: zodResolver(commentSchema),
    defaultValues: { body: "" },
  })

  return (
    <section className="grid gap-3">
      <h2 className="text-sm font-medium">Comments</h2>
      {comments.length === 0 ? <p className="text-sm text-muted-foreground">No comments yet.</p> : null}
      <ul className="grid gap-2">
        {comments.map((comment) => (
          <li key={comment.id} className="rounded-lg border bg-card px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                {comment.authorName} · {formatProjectDate(comment.createdAt)}
              </p>
              {comment.authorId === currentUserId ? (
                <Button
                  type="button"
                  size="xs"
                  variant="ghost"
                  disabled={pending}
                  onClick={() => {
                    startTransition(async () => {
                      const result = await deleteComment(issueId, comment.id)
                      if (result?.error) toast.error(result.error)
                    })
                  }}
                >
                  Delete
                </Button>
              ) : null}
            </div>
            <p className="mt-1 whitespace-pre-wrap text-sm">{comment.body}</p>
          </li>
        ))}
      </ul>
      <Form {...form}>
        <form
          className="grid gap-2"
          onSubmit={form.handleSubmit((values) => {
            startTransition(async () => {
              const result = await addComment(issueId, values)
              if (result?.error) {
                toast.error(result.error)
                return
              }
              form.reset({ body: "" })
            })
          })}
        >
          <FormField
            control={form.control}
            name="body"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Textarea placeholder="Add a comment" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" disabled={pending} className="w-fit" size="sm">
            {pending ? "Sending…" : "Add comment"}
          </Button>
        </form>
      </Form>
    </section>
  )
}
