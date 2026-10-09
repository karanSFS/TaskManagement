"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { FormDialog } from "@/components/shared/form-dialog"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { addProjectMember, removeProjectMember, updateMemberRole } from "@/lib/actions/projects"
import { roleLabel } from "@/lib/projects/format"
import { addMemberSchema, projectRoles, type AddMemberValues, type ProjectRole } from "@/lib/validations/project"

const fieldClass =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"

type MemberRow = {
  id: string
  userId: string
  name: string
  role: ProjectRole
  isYou: boolean
}

export function MemberManager({
  projectId,
  members,
  canManage,
  actorRole,
}: {
  projectId: string
  members: MemberRow[]
  canManage: boolean
  actorRole: ProjectRole
}) {
  const ownerCount = members.filter((member) => member.role === "owner").length
  const roles = projectRoles.filter((role) => actorRole === "owner" || role !== "owner")

  return (
    <div className="grid gap-4">
      {canManage ? <AddMemberForm projectId={projectId} roles={roles} /> : null}
      <ul className="divide-y rounded-lg border bg-card">
        {members.map((member) => (
          <MemberItem
            key={member.id}
            projectId={projectId}
            member={member}
            roles={roles}
            canManage={canManage && (actorRole === "owner" || member.role !== "owner")}
            isLastOwner={member.role === "owner" && ownerCount === 1}
          />
        ))}
      </ul>
    </div>
  )
}

function AddMemberForm({ projectId, roles }: { projectId: string; roles: ProjectRole[] }) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const form = useForm<AddMemberValues>({
    resolver: zodResolver(addMemberSchema),
    defaultValues: { email: "", role: "member" },
  })

  function onSubmit(values: AddMemberValues) {
    startTransition(async () => {
      const result = await addProjectMember(projectId, values)
      if (result?.error) {
        toast.error(result.error)
        return
      }
      form.reset({ email: "", role: "member" })
      setOpen(false)
      toast.success(result?.success ?? "Member added.")
    })
  }

  return (
    <>
    <Button type="button" className="w-fit" onClick={() => setOpen(true)}>
      Add member
    </Button>
    <FormDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) form.reset({ email: "", role: "member" })
        setOpen(next)
      }}
      title="Add member"
      description="They must already have a TaskForge account. Access follows this project's permissions."
      dirty={form.formState.isDirty}
      pending={pending}
    >
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-3">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" autoComplete="off" placeholder="teammate@company.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Role</FormLabel>
              <FormControl>
                <select className={fieldClass} {...field}>
                  {roles.map((role) => (
                    <option key={role} value={role}>
                      {roleLabel(role)}
                    </option>
                  ))}
                </select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" disabled={pending} onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Adding…" : "Add member"}
          </Button>
        </div>
      </form>
    </Form>
    </FormDialog>
    </>
  )
}

function MemberItem({
  projectId,
  member,
  roles,
  canManage,
  isLastOwner,
}: {
  projectId: string
  member: MemberRow
  roles: ProjectRole[]
  canManage: boolean
  isLastOwner: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const canRemove = !isLastOwner && (canManage || member.isYou)

  return (
    <li className="flex flex-wrap items-center gap-3 px-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {member.name}
          {member.isYou ? <span className="ml-2 text-xs font-normal text-muted-foreground">You</span> : null}
        </p>
      </div>
      {canManage ? (
        <select
          className={`${fieldClass} w-28`}
          value={member.role}
          disabled={pending || (isLastOwner && member.role === "owner")}
          aria-label={`Role for ${member.name}`}
          onChange={(event) => {
            const role = event.target.value as ProjectRole
            startTransition(async () => {
              const result = await updateMemberRole(projectId, member.id, role)
              if (result?.error) {
                toast.error(result.error)
              }
            })
          }}
        >
          {roles.map((role) => (
            <option key={role} value={role}>
              {roleLabel(role)}
            </option>
          ))}
          {!roles.includes(member.role) ? <option value={member.role}>{roleLabel(member.role)}</option> : null}
        </select>
      ) : (
        <p className="text-sm text-muted-foreground">{roleLabel(member.role)}</p>
      )}
      {canRemove ? (
        <>
        <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={() => setConfirmOpen(true)}>
          {member.isYou ? "Leave" : "Remove"}
        </Button>
        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title={member.isYou ? "Leave this project?" : `Remove ${member.name}?`}
          description={member.isYou ? "You will lose access to its issues." : "Their issues in this project become unassigned."}
          confirmLabel={member.isYou ? "Leave project" : "Remove member"}
          pending={pending}
          destructive
          onConfirm={() => {
            startTransition(async () => {
              const result = await removeProjectMember(projectId, member.id)
              if (result?.error) {
                toast.error(result.error)
                return
              }
              toast.success(result?.success ?? "Member removed.")
              setConfirmOpen(false)
              if (result?.href) router.push(result.href)
            })
          }}
        />
        </>
      ) : null}
    </li>
  )
}
