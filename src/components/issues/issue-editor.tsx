"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { FormSheet } from "@/components/shared/form-dialog"

import { RevealButton } from "@/components/shared/pending-ui"
import { PriorityMark } from "@/components/shared/priority-mark"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { updateIssue } from "@/lib/actions/issues"
import { updateIssueSchema, type UpdateIssueValues } from "@/lib/validations/issue"

const fieldClass =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"

type Option = { id: string; name: string }

export function EditIssueButton(props: {
  issueId: string
  types: Option[]
  statuses: Option[]
  priorities: Option[]
  members: Option[]
  defaultValues: UpdateIssueValues
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <RevealButton type="button" variant="outline" size="sm" onReveal={() => setOpen(true)}>
        Edit issue
      </RevealButton>
      <FormSheet
        open={open}
        onOpenChange={setOpen}
        title="Edit issue"
        description="Update the title, description, and workflow fields."
      >
        <IssueEditor {...props} onSaved={() => setOpen(false)} onCancel={() => setOpen(false)} />
      </FormSheet>
    </>
  )
}

export function IssueEditor({
  issueId,
  types,
  statuses,
  priorities,
  members,
  defaultValues,
  onSaved,
  onCancel,
}: {
  issueId: string
  types: Option[]
  statuses: Option[]
  priorities: Option[]
  members: Option[]
  defaultValues: UpdateIssueValues
  onSaved?: () => void
  onCancel?: () => void
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const form = useForm<UpdateIssueValues>({
    resolver: zodResolver(updateIssueSchema),
    defaultValues,
  })

  return (
    <Form {...form}>
      <form
        className="grid gap-4"
        noValidate
        onSubmit={form.handleSubmit((values) => {
          startTransition(async () => {
            const result = await updateIssue(issueId, values)
            if (result?.error) {
              toast.error(result.error)
              return
            }
            toast.success(result?.success ?? "Issue saved.")
            onSaved?.()
            router.refresh()
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
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField name="issueTypeId" label="Type" options={types} form={form} />
          <SelectField name="statusId" label="Status" options={statuses} form={form} />
          <SelectField name="priorityId" label="Priority" options={priorities} form={form} />
          <FormField
            control={form.control}
            name="assigneeId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Assignee</FormLabel>
                <FormControl>
                  <select className={fieldClass} {...field}>
                    <option value="">Unassigned</option>
                    {members.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name}
                      </option>
                    ))}
                  </select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="dueDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Due date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="flex justify-end gap-2">
          {onCancel ? (
            <Button type="button" variant="outline" disabled={pending} onClick={onCancel}>
              Cancel
            </Button>
          ) : null}
          <Button type="submit" disabled={pending}>
            {pending ? "Saving issue…" : "Save issue"}
          </Button>
        </div>
      </form>
    </Form>
  )
}

function SelectField({
  name,
  label,
  options,
  form,
}: {
  name: "issueTypeId" | "statusId" | "priorityId"
  label: string
  options: Option[]
  form: ReturnType<typeof useForm<UpdateIssueValues>>
}) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="flex items-center gap-2">
            {label}
            {name === "priorityId" ? <PriorityMark name={options.find((option) => option.id === field.value)?.name ?? ""} /> : null}
          </FormLabel>
          <FormControl>
            <select className={fieldClass} {...field}>
              {options.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
