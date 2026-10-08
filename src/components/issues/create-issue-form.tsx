"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useTransition } from "react"
import { useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { createIssue } from "@/lib/actions/issues"
import { createIssueSchema, type CreateIssueValues } from "@/lib/validations/issue"

const fieldClass =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"

type Option = { id: string; name: string }
type ProjectOption = Option & { members: Option[] }

export function CreateIssueForm({
  projects,
  types,
  statuses,
  priorities,
  defaultProjectId,
}: {
  projects: ProjectOption[]
  types: Option[]
  statuses: Option[]
  priorities: Option[]
  defaultProjectId: string
}) {
  const [pending, startTransition] = useTransition()
  const form = useForm<CreateIssueValues>({
    resolver: zodResolver(createIssueSchema),
    defaultValues: {
      projectId: defaultProjectId,
      title: "",
      description: "",
      issueTypeId: types[0]?.id ?? "",
      statusId: statuses.find((status) => status.name === "To Do")?.id ?? statuses[0]?.id ?? "",
      priorityId: priorities.find((priority) => priority.name === "Medium")?.id ?? priorities[0]?.id ?? "",
      assigneeId: "",
      dueDate: "",
    },
  })
  const projectId = useWatch({ control: form.control, name: "projectId" })
  const members = projects.find((project) => project.id === projectId)?.members ?? []

  return (
    <Form {...form}>
      <form
        className="grid max-w-xl gap-4"
        noValidate
        onSubmit={form.handleSubmit((values) => {
          startTransition(async () => {
            const result = await createIssue(values)
            if (result?.error) toast.error(result.error)
          })
        })}
      >
        <FormField
          control={form.control}
          name="projectId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Project</FormLabel>
              <FormControl>
                <select
                  className={fieldClass}
                  {...field}
                  onChange={(event) => {
                    field.onChange(event)
                    form.setValue("assigneeId", "")
                  }}
                >
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
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
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="Fix client notification" autoFocus {...field} />
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
                <Textarea placeholder="What needs to happen" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid gap-3 sm:grid-cols-3">
          <Choice name="issueTypeId" label="Type" options={types} form={form} />
          <Choice name="statusId" label="Status" options={statuses} form={form} />
          <Choice name="priorityId" label="Priority" options={priorities} form={form} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
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
        <Button type="submit" disabled={pending} className="w-fit">
          {pending ? "Creating issue…" : "Create issue"}
        </Button>
      </form>
    </Form>
  )
}

function Choice({
  name,
  label,
  options,
  form,
}: {
  name: "issueTypeId" | "statusId" | "priorityId"
  label: string
  options: Option[]
  form: ReturnType<typeof useForm<CreateIssueValues>>
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
