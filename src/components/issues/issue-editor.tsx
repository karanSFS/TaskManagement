"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useTransition } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { updateIssue } from "@/lib/actions/issues"
import { updateIssueSchema, type UpdateIssueValues } from "@/lib/validations/issue"

const fieldClass =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"

type Option = { id: string; name: string }

export function IssueEditor({
  issueId,
  types,
  statuses,
  priorities,
  members,
  defaultValues,
}: {
  issueId: string
  types: Option[]
  statuses: Option[]
  priorities: Option[]
  members: Option[]
  defaultValues: UpdateIssueValues
}) {
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
        </div>
        <Button type="submit" disabled={pending} className="w-fit">
          {pending ? "Saving issue…" : "Save issue"}
        </Button>
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
          <FormLabel>{label}</FormLabel>
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
