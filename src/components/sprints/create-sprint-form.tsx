"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useTransition } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { createSprint } from "@/lib/actions/sprints"
import { createSprintSchema, type CreateSprintValues } from "@/lib/validations/sprint"

export function CreateSprintForm({ projectId }: { projectId: string }) {
  const [pending, startTransition] = useTransition()
  const form = useForm<CreateSprintValues>({
    resolver: zodResolver(createSprintSchema),
    defaultValues: { projectId, name: "", goal: "", startDate: "", endDate: "" },
  })

  return (
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
        <Button type="submit" disabled={pending} className="w-fit">
          {pending ? "Planning…" : "Plan sprint"}
        </Button>
      </form>
    </Form>
  )
}
