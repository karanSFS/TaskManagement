"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import Link from "next/link"
import { useTransition } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form"
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
  const form = useForm<SubtaskValues>({
    resolver: zodResolver(subtaskSchema),
    defaultValues: { title: "" },
  })

  return (
    <section className="grid gap-2">
      <h2 className="text-sm font-medium">Subtasks</h2>
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
        <Form {...form}>
          <form
            className="flex gap-2"
            onSubmit={form.handleSubmit((values) => {
              startTransition(async () => {
                const result = await createSubtask(issueId, values)
                if (result?.error) {
                  toast.error(result.error)
                  return
                }
                form.reset({ title: "" })
              })
            })}
          >
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormControl>
                    <Input placeholder="Add a subtask" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" size="sm" variant="outline" disabled={pending}>
              Add
            </Button>
          </form>
        </Form>
      )}
    </section>
  )
}
