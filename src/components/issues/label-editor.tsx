"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useTransition } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { addLabel, removeLabel } from "@/lib/actions/issues"
import { labelNameSchema } from "@/lib/validations/issue"
import type { z } from "zod"

type LabelValues = z.infer<typeof labelNameSchema>

export function LabelEditor({
  issueId,
  labels,
  projectLabels,
}: {
  issueId: string
  labels: { id: string; name: string; color: string }[]
  projectLabels: { id: string; name: string; color: string }[]
}) {
  const [pending, startTransition] = useTransition()
  const attached = new Set(labels.map((label) => label.id))
  const form = useForm<LabelValues>({
    resolver: zodResolver(labelNameSchema),
    defaultValues: { name: "" },
  })

  function toggle(labelId: string, on: boolean) {
    startTransition(async () => {
      const result = on ? await removeLabel(issueId, labelId) : await addLabel(issueId, { name: projectLabels.find((label) => label.id === labelId)?.name ?? "" })
      if (result?.error) toast.error(result.error)
    })
  }

  return (
    <section className="grid gap-2">
      <h2 className="text-sm font-medium">Labels</h2>
      <div className="flex flex-wrap gap-1">
        {projectLabels.length === 0 ? <p className="text-sm text-muted-foreground">No labels yet.</p> : null}
        {projectLabels.map((label) => {
          const on = attached.has(label.id)
          return (
            <button
              key={label.id}
              type="button"
              disabled={pending}
              aria-pressed={on}
              className="rounded-md border px-2 py-1 text-xs"
              style={{ borderColor: label.color, background: on ? label.color : "transparent", color: on ? "white" : "inherit" }}
              onClick={() => toggle(label.id, on)}
            >
              {label.name}
            </button>
          )
        })}
      </div>
      <Form {...form}>
        <form
          className="flex gap-2"
          onSubmit={form.handleSubmit((values) => {
            startTransition(async () => {
              const result = await addLabel(issueId, values)
              if (result?.error) {
                toast.error(result.error)
                return
              }
              form.reset({ name: "" })
            })
          })}
        >
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormControl>
                  <Input placeholder="New label" {...field} />
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
    </section>
  )
}
