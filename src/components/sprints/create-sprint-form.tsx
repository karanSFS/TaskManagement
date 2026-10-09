"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { FormDialog } from "@/components/shared/form-dialog"
import { RevealButton } from "@/components/shared/pending-ui"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { createSprint, updateSprint } from "@/lib/actions/sprints"
import { createSprintSchema, updateSprintSchema, type CreateSprintValues, type UpdateSprintValues } from "@/lib/validations/sprint"

export function PlanSprintButton({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <RevealButton type="button" className="w-fit" onReveal={() => setOpen(true)}>
        Plan sprint
      </RevealButton>
      <CreateSprintForm projectId={projectId} open={open} onOpenChange={setOpen} />
    </>
  )
}

export function CreateSprintForm({
  projectId,
  open,
  onOpenChange,
}: {
  projectId: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const form = useForm<CreateSprintValues>({
    resolver: zodResolver(createSprintSchema),
    defaultValues: { projectId, name: "", goal: "", startDate: "", endDate: "" },
  })

  const formBody = (
    <Form {...form}>
      <form
        className="grid max-w-xl gap-3"
        noValidate
        onSubmit={form.handleSubmit((values) => {
          startTransition(async () => {
            const result = await createSprint({ ...values, projectId })
            if (result?.error) {
              toast.error(result.error)
              return
            }
            form.reset({ projectId, name: "", goal: "", startDate: "", endDate: "" })
            toast.success(result?.success ?? "Sprint planned.")
            onOpenChange?.(false)
            router.refresh()
          })
        })}
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Sprint 1" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="goal"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Goal</FormLabel>
              <FormControl>
                <Textarea placeholder="What this sprint should finish" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Start</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="endDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>End</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="flex justify-end gap-2">
          {onOpenChange ? (
            <Button type="button" variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          ) : null}
          <Button type="submit" disabled={pending}>
            {pending ? "Planning…" : "Plan sprint"}
          </Button>
        </div>
      </form>
    </Form>
  )

  if (!onOpenChange) return formBody

  return (
    <FormDialog
      open={open ?? false}
      onOpenChange={(next) => {
        if (!next) form.reset({ projectId, name: "", goal: "", startDate: "", endDate: "" })
        onOpenChange(next)
      }}
      title="Plan sprint"
      description="Name the sprint and set the dates. Only one sprint can be active."
      dirty={form.formState.isDirty}
      pending={pending}
    >
      {formBody}
    </FormDialog>
  )
}

export function EditSprintButton({
  sprintId,
  name,
  goal,
  startDate,
  endDate,
}: {
  sprintId: string
  name: string
  goal: string
  startDate: string
  endDate: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const form = useForm<UpdateSprintValues>({
    resolver: zodResolver(updateSprintSchema),
    defaultValues: { sprintId, name, goal, startDate, endDate },
  })

  return (
    <>
      <RevealButton
        type="button"
        size="sm"
        variant="outline"
        onReveal={() => {
          form.reset({ sprintId, name, goal, startDate, endDate })
          setOpen(true)
        }}
      >
        Edit
      </RevealButton>
      <FormDialog
        open={open}
        onOpenChange={(next) => {
          if (!next) form.reset({ sprintId, name, goal, startDate, endDate })
          setOpen(next)
        }}
        title="Edit sprint"
        description="Update the name, goal, or dates. The end date has to be on or after the start."
        dirty={form.formState.isDirty}
        pending={pending}
      >
        <Form {...form}>
          <form
            className="grid gap-3"
            noValidate
            onSubmit={form.handleSubmit((values) => {
              startTransition(async () => {
                const result = await updateSprint({ ...values, sprintId })
                if (result?.error) {
                  const message = result.error
                  if (message.toLowerCase().includes("date")) form.setError("endDate", { message })
                  toast.error(message)
                  return
                }
                toast.success(result?.success ?? "Sprint updated.")
                setOpen(false)
                router.refresh()
              })
            })}
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="goal"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Goal</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" disabled={pending} onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Saving…" : "Save sprint"}
              </Button>
            </div>
          </form>
        </Form>
      </FormDialog>
    </>
  )
}
