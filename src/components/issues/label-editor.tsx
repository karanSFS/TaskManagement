"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { FormDialog } from "@/components/shared/form-dialog"
import { RevealButton } from "@/components/shared/pending-ui"
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
  const [open, setOpen] = useState(false)
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
    <section className="grid min-w-0 gap-2">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-medium">Labels</h2>
        <RevealButton type="button" size="sm" variant="outline" onReveal={() => setOpen(true)}>
          New label
        </RevealButton>
      </div>
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
      <FormDialog
        open={open}
        onOpenChange={(next) => {
          if (!next) form.reset({ name: "" })
          setOpen(next)
        }}
        title="New label"
        description="Labels are shared across issues in this project."
        dirty={form.formState.isDirty}
        pending={pending}
      >
      <Form {...form}>
        <form
          className="grid gap-3"
          onSubmit={form.handleSubmit((values) => {
            startTransition(async () => {
              const result = await addLabel(issueId, values)
              if (result?.error) {
                toast.error(result.error)
                return
              }
              form.reset({ name: "" })
              setOpen(false)
              toast.success(result?.success ?? "Label added.")
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
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" disabled={pending} onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Adding…" : "Add label"}
            </Button>
          </div>
        </form>
      </Form>
      </FormDialog>
    </section>
  )
}
