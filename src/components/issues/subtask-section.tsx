"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import Link from "next/link"
import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { FormDialog } from "@/components/shared/form-dialog"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { createSubtask } from "@/lib/actions/issues"
import { issueKey } from "@/lib/projects/format"
import { subtaskSchema } from "@/lib/validations/issue"
import type { z } from "zod"

type SubtaskValues = z.infer<typeof subtaskSchema>

export function SubtaskSection({
  issueId,
  projectKey,
  parent,
  subtasks,
  archived,
}: {
  issueId: string
  projectKey: string
  parent: { id: string; number: number; title: string } | null
  subtasks: { id: string; number: number; title: string; status: string }[]
  archived: boolean
}) {
  const [pending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const form = useForm<SubtaskValues>({
    resolver: zodResolver(subtaskSchema),
    defaultValues: { title: "" },
  })

  return (
    <section className="grid gap-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium">Subtasks</h2>
        {archived ? null : (
          <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
            Add subtask
          </Button>
        )}
      </div>
      {parent ? (
        <p className="text-xs text-muted-foreground">
          Subtask of{" "}
          <Link href={`/issues/${parent.id}`} className="text-foreground hover:underline">
            {issueKey(projectKey, parent.number)} {parent.title}
          </Link>
        </p>
      ) : null}
      {subtasks.length === 0 ? <p className="text-sm text-muted-foreground">No subtasks.</p> : null}
      {subtasks.length > 0 ? (
        <ul className="divide-y rounded-lg border">
          {subtasks.map((subtask) => (
            <li key={subtask.id}>
              <Link href={`/issues/${subtask.id}`} className="flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-muted/50">
                <span className="text-muted-foreground">{issueKey(projectKey, subtask.number)}</span>
                <span className="min-w-0 flex-1 truncate">{subtask.title}</span>
                <span className="text-xs text-muted-foreground">{subtask.status}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
      {archived ? null : (
        <FormDialog
          open={open}
          onOpenChange={(next) => {
            if (!next) form.reset({ title: "" })
            setOpen(next)
          }}
          title="Add subtask"
          description="The subtask is filed in this project and linked to the current issue."
          dirty={form.formState.isDirty}
          pending={pending}
        >
          <Form {...form}>
            <form
              className="grid gap-3"
              onSubmit={form.handleSubmit((values) => {
                startTransition(async () => {
                  const result = await createSubtask(issueId, values)
                  if (result?.error) {
                    toast.error(result.error)
                    return
                  }
                  form.reset({ title: "" })
                  setOpen(false)
                  toast.success(result?.success ?? "Subtask added.")
                })
              })}
            >
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="What this subtask covers" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" disabled={pending} onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={pending}>
                  {pending ? "Adding…" : "Add subtask"}
                </Button>
              </div>
            </form>
          </Form>
        </FormDialog>
      )}
    </section>
  )
}
