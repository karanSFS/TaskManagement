"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useState, useTransition } from "react"
import { useForm, type UseFormReturn } from "react-hook-form"
import { toast } from "sonner"

import { ProjectIcon } from "@/components/projects/project-icon"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { createProject, updateProject } from "@/lib/actions/projects"
import { suggestProjectKey } from "@/lib/projects/format"
import { projectIconNames } from "@/lib/projects/icons"
import {
  createProjectSchema,
  updateProjectSchema,
  type CreateProjectValues,
  type UpdateProjectValues,
} from "@/lib/validations/project"
import { cn } from "cn"

const fieldClass =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"

type MemberOption = {
  id: string
  name: string
}

type ProjectFormProps =
  | {
      mode: "create"
      defaultValues: CreateProjectValues
    }
  | {
      mode: "edit"
      projectId: string
      members: MemberOption[]
      defaultValues: UpdateProjectValues
    }

export function ProjectForm(props: ProjectFormProps) {
  if (props.mode === "create") {
    return <CreateProjectForm defaultValues={props.defaultValues} />
  }

  return <EditProjectForm projectId={props.projectId} members={props.members} defaultValues={props.defaultValues} />
}

function CreateProjectForm({ defaultValues }: { defaultValues: CreateProjectValues }) {
  const [pending, startTransition] = useTransition()
  const [keyTouched, setKeyTouched] = useState(false)
  const form = useForm<CreateProjectValues>({
    resolver: zodResolver(createProjectSchema),
    defaultValues,
  })

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((values) => {
          startTransition(async () => {
            const result = await createProject(values)
            if (result?.error) {
              toast.error(result.error)
            }
          })
        })}
        className="grid max-w-xl gap-4"
        noValidate
      >
        <SharedFields form={form} keyTouched={keyTouched} onKeyTouch={() => setKeyTouched(true)} />
        <Button type="submit" disabled={pending} className="w-fit">
          {pending ? "Saving…" : "Create project"}
        </Button>
      </form>
    </Form>
  )
}

function EditProjectForm({
  projectId,
  members,
  defaultValues,
}: {
  projectId: string
  members: MemberOption[]
  defaultValues: UpdateProjectValues
}) {
  const [pending, startTransition] = useTransition()
  const form = useForm<UpdateProjectValues>({
    resolver: zodResolver(updateProjectSchema),
    defaultValues,
  })

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((values) => {
          startTransition(async () => {
            const result = await updateProject(projectId, values)
            if (result?.error) {
              toast.error(result.error)
              return
            }
            toast.success(result?.success ?? "Project saved.")
          })
        })}
        className="grid max-w-xl gap-4"
        noValidate
      >
        <SharedFields form={form} keyTouched onKeyTouch={() => undefined} />
        <FormField
          control={form.control}
          name="leadId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Project lead</FormLabel>
              <FormControl>
                <select className={fieldClass} {...field}>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </FormControl>
              <FormDescription>The lead must already be a member.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={pending} className="w-fit">
          {pending ? "Saving…" : "Save project"}
        </Button>
      </form>
    </Form>
  )
}

function SharedFields<T extends CreateProjectValues>({
  form,
  keyTouched,
  onKeyTouch,
}: {
  form: UseFormReturn<T>
  keyTouched: boolean
  onKeyTouch: () => void
}) {
  const shared = form as UseFormReturn<CreateProjectValues>

  return (
    <>
      <FormField
        control={shared.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Name</FormLabel>
            <FormControl>
              <Input
                autoComplete="off"
                placeholder="BirthFlow"
                {...field}
                onChange={(event) => {
                  field.onChange(event)
                  if (!keyTouched) {
                    shared.setValue("key", suggestProjectKey(event.target.value), { shouldValidate: true })
                  }
                }}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={shared.control}
        name="key"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Key</FormLabel>
            <FormControl>
              <Input
                autoCapitalize="characters"
                autoComplete="off"
                className="uppercase"
                placeholder="BIRTH"
                {...field}
                onChange={(event) => {
                  onKeyTouch()
                  field.onChange(event.target.value.toUpperCase())
                }}
              />
            </FormControl>
            <FormDescription>Issues in this project are numbered from this key, like BIRTH-1.</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={shared.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Description</FormLabel>
            <FormControl>
              <Textarea placeholder="What this project is for" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={shared.control}
        name="icon"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Icon</FormLabel>
            <div className="flex flex-wrap gap-1">
              {projectIconNames.map((name) => {
                const selected = field.value === name
                return (
                  <button
                    key={name}
                    type="button"
                    aria-pressed={selected}
                    className={cn(
                      "flex size-8 items-center justify-center rounded-lg border",
                      selected ? "border-ring bg-muted" : "border-transparent hover:bg-muted",
                    )}
                    onClick={() => field.onChange(selected ? "" : name)}
                  >
                    <ProjectIcon name={name} />
                  </button>
                )
              })}
            </div>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  )
}
