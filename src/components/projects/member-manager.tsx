"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { FormDialog } from "@/components/shared/form-dialog"
import { RevealButton } from "@/components/shared/pending-ui"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { addProjectMember, removeProjectMember, updateMemberRole } from "@/lib/actions/projects"
import { userInitials } from "@/lib/auth/user"
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
      <ul className="divide-y overflow-hidden rounded-xl border bg-card shadow-sm">
        {members.map((member) => (
          <MemberItem
            key={member.id}
            projectId={projectId}
            member={member}
            roles={roles}
            canManage={canManage && (actorRole === "owner" || member.role !== "owner")}
            isLastOwner={member.role === "owner" && ownerCount === 1}
            candidates={members.filter((candidate) => candidate.id !== member.id)}
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
      toast.success(result?.success ?? "Invitation sent.")
    })
  }

  return (
    <>
    <RevealButton type="button" className="w-fit" onReveal={() => setOpen(true)}>
      Invite
    </RevealButton>
    <FormDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) form.reset({ email: "", role: "member" })
        setOpen(next)
      }}
      title="Invite"
      description="They receive an email and have 7 days to accept. A new person can create a FixTask account from that link."
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
            {pending ? "Sending…" : "Send invitation"}
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
  candidates,
}: {
  projectId: string
  member: MemberRow
  roles: ProjectRole[]
  canManage: boolean
  isLastOwner: boolean
  candidates: MemberRow[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [removeError, setRemoveError] = useState("")
  const [role, setRole] = useState(member.role)
  const canRemove = !isLastOwner && (canManage || member.isYou)

  return (
    <li className="flex flex-wrap items-center gap-3 px-3 py-2.5">
      <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
        {userInitials(member.name)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {member.name}
          {member.isYou ? <span className="ml-2 text-xs font-normal text-muted-foreground">You</span> : null}
        </p>
      </div>
      <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">{roleLabel(member.role)}</span>
      {canManage ? (
        <select
          className={`${fieldClass} w-28`}
          value={role}
          disabled={pending || (isLastOwner && member.role === "owner")}
          aria-label={`Role for ${member.name}`}
          onChange={(event) => {
            const next = event.target.value as ProjectRole
            if (next === role) return
            setRole(next)
            startTransition(async () => {
              const result = await updateMemberRole(projectId, member.id, next)
              if (result?.error) {
                setRole(member.role)
                toast.error(result.error)
                return
              }
              toast.success(result?.success ?? "Role updated.")
              router.refresh()
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
        <RevealButton type="button" size="sm" variant="ghost" disabled={pending} onReveal={() => setConfirmOpen(true)}>
          {member.isYou ? "Leave" : "Remove"}
        </RevealButton>
        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={(next) => {
            if (!next) setRemoveError("")
            setConfirmOpen(next)
          }}
          title={member.isYou ? "Leave this project?" : `Remove ${member.name}?`}
          description={
            member.isYou
              ? "You will lose access to its issues. Open issues assigned to you become unassigned."
              : "They lose access to this project. Open issues assigned to them become unassigned."
          }
          confirmLabel={member.isYou ? "Leave project" : "Remove member"}
          pending={pending}
          destructive
          error={removeError}
          onConfirm={() => {
            setRemoveError("")
            startTransition(async () => {
              const result = await removeProjectMember(projectId, member.id)
              if (result?.error) {
                setRemoveError(result.error)
                return
              }
              toast.success(result?.success ?? "Member removed.")
              setConfirmOpen(false)
              if (result?.href) {
                router.push(result.href)
                return
              }
              router.refresh()
            })
          }}
        />
        </>
      ) : isLastOwner && member.isYou && candidates.length > 0 ? (
        <TransferOwnership projectId={projectId} selfId={member.id} candidates={candidates} />
      ) : isLastOwner && member.isYou ? (
        <p className="max-w-48 text-right text-xs text-muted-foreground">Add another member before you can leave.</p>
      ) : null}
    </li>
  )
}

function TransferOwnership({
  projectId,
  selfId,
  candidates,
}: {
  projectId: string
  selfId: string
  candidates: MemberRow[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [targetId, setTargetId] = useState(candidates[0]?.id ?? "")
  const target = candidates.find((candidate) => candidate.id === targetId) ?? candidates[0]

  return (
    <>
      <RevealButton type="button" size="sm" variant="outline" disabled={pending || !target} onReveal={() => setOpen(true)}>
        Transfer ownership
      </RevealButton>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Transfer ownership and leave?"
        description={
          target
            ? `${target.name} becomes an owner, then you leave the project. A project always keeps an owner.`
            : "Choose a member to become the owner."
        }
        confirmLabel="Transfer and leave"
        pending={pending}
        destructive
        onConfirm={() => {
          if (!target) return
          startTransition(async () => {
            const promoted = await updateMemberRole(projectId, target.id, "owner")
            if (promoted?.error) {
              toast.error(promoted.error)
              return
            }
            const left = await removeProjectMember(projectId, selfId)
            if (left?.error) {
              toast.error(left.error)
              router.refresh()
              return
            }
            toast.success("Ownership transferred. You left the project.")
            setOpen(false)
            router.push(left?.href ?? "/projects")
          })
        }}
      />
      {candidates.length > 1 ? (
        <select
          className={`${fieldClass} w-36`}
          value={target?.id ?? ""}
          aria-label="New owner"
          disabled={pending}
          onChange={(event) => setTargetId(event.target.value)}
        >
          {candidates.map((candidate) => (
            <option key={candidate.id} value={candidate.id}>
              {candidate.name}
            </option>
          ))}
        </select>
      ) : null}
    </>
  )
}
