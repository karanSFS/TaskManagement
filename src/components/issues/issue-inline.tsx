"use client"

import { useRouter } from "next/navigation"
import { createContext, useContext, useState, useTransition, type KeyboardEvent, type ReactNode } from "react"
import { Check, Link as LinkIcon, Loader2, Pencil, X } from "lucide-react"
import { toast } from "sonner"

import { filterFieldClass } from "@/components/shared/field-styles"
import { PriorityMark } from "@/components/shared/priority-mark"
import { StatusChip } from "@/components/shared/visual"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { updateIssue } from "@/lib/actions/issues"
import { formatDueDate, formatProjectDate } from "@/lib/projects/format"
import { cn } from "@/lib/utils"
import type { UpdateIssueValues } from "@/lib/validations/issue"

type Option = { id: string; name: string }
type StatusOption = Option & { category?: string }
type Field = keyof UpdateIssueValues

const IssueChangedContext = createContext<() => void>(() => undefined)

export function IssueChangedProvider({ onChanged, children }: { onChanged: () => void; children: ReactNode }) {
  return <IssueChangedContext.Provider value={onChanged}>{children}</IssueChangedContext.Provider>
}

export function useIssueChanged() {
  return useContext(IssueChangedContext)
}

type ValuesContext = {
  values: UpdateIssueValues
  canEdit: boolean
  saving: Field | null
  save: (field: Field, value: string) => Promise<boolean>
}

const IssueValuesContext = createContext<ValuesContext | null>(null)

export function useIssueValues() {
  const context = useContext(IssueValuesContext)
  if (!context) throw new Error("Issue fields need an IssueValuesProvider")
  return context
}

export function IssueValuesProvider({
  issueId,
  initial,
  canEdit,
  children,
}: {
  issueId: string
  initial: UpdateIssueValues
  canEdit: boolean
  children: ReactNode
}) {
  const router = useRouter()
  const changed = useIssueChanged()
  const [, startTransition] = useTransition()
  const initialKey = JSON.stringify(initial)
  const [values, setValues] = useState(initial)
  const [syncedKey, setSyncedKey] = useState(initialKey)
  const [saving, setSaving] = useState<Field | null>(null)
  if (initialKey !== syncedKey && saving === null) {
    setSyncedKey(initialKey)
    setValues(initial)
  }

  async function save(field: Field, value: string) {
    if (values[field] === value) return true
    const previous = values
    const next = { ...values, [field]: value }
    setValues(next)
    setSaving(field)
    const result = await updateIssue(issueId, next)
    setSaving(null)
    if (result?.error) {
      setValues(previous)
      toast.error(result.error)
      return false
    }
    startTransition(() => {
      changed()
      router.refresh()
    })
    return true
  }

  return <IssueValuesContext.Provider value={{ values, canEdit, saving, save }}>{children}</IssueValuesContext.Provider>
}

export function InlineTitle({ className }: { className?: string }) {
  const { values, canEdit, saving, save } = useIssueValues()
  const [draft, setDraft] = useState<string | null>(null)
  const heading = cn("text-xl font-semibold tracking-tight [overflow-wrap:anywhere]", className)

  if (draft === null) {
    if (!canEdit) return <h1 className={heading}>{values.title}</h1>
    return (
      <h1 className={heading}>
        <button
          type="button"
          className="-mx-1.5 rounded-md px-1.5 text-left hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          title="Edit title"
          onClick={() => setDraft(values.title)}
        >
          {values.title}
        </button>
      </h1>
    )
  }

  async function commit() {
    const title = (draft ?? "").trim()
    if (!title) {
      toast.error("Enter a title")
      return
    }
    if (await save("title", title)) setDraft(null)
  }

  return (
    <form
      className="grid gap-2"
      onSubmit={(event) => {
        event.preventDefault()
        void commit()
      }}
    >
      <Input
        autoFocus
        aria-label="Title"
        value={draft}
        maxLength={200}
        className="h-10 text-lg font-semibold"
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setDraft(null)
        }}
      />
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={saving === "title"}>
          {saving === "title" ? "Saving…" : "Save"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setDraft(null)}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

export function InlineDescription() {
  const { values, canEdit, saving, save } = useIssueValues()
  const [draft, setDraft] = useState<string | null>(null)

  async function commit() {
    if (await save("description", (draft ?? "").trim())) setDraft(null)
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Escape") setDraft(null)
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) void commit()
  }

  return (
    <section className="grid min-w-0 gap-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Description</h2>
        {canEdit && draft === null && values.description ? (
          <Button type="button" size="xs" variant="ghost" onClick={() => setDraft(values.description)}>
            <Pencil />
            Edit
          </Button>
        ) : null}
      </div>
      {draft !== null ? (
        <div className="grid gap-2">
          <Textarea
            autoFocus
            aria-label="Description"
            value={draft}
            rows={8}
            maxLength={20000}
            placeholder="What needs to happen, and how will you know it's done?"
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={onKeyDown}
          />
          <div className="flex items-center gap-2">
            <Button type="button" size="sm" disabled={saving === "description"} onClick={() => void commit()}>
              {saving === "description" ? "Saving…" : "Save"}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setDraft(null)}>
              Cancel
            </Button>
            <span className="ml-auto hidden text-xs text-muted-foreground sm:inline">⌘/Ctrl + Enter to save</span>
          </div>
        </div>
      ) : values.description ? (
        <p className="text-sm whitespace-pre-wrap [overflow-wrap:anywhere]">{values.description}</p>
      ) : canEdit ? (
        <button
          type="button"
          className="rounded-lg border border-dashed px-3 py-4 text-left text-sm text-muted-foreground hover:border-primary/40 hover:text-foreground"
          onClick={() => setDraft("")}
        >
          Add a description…
        </button>
      ) : (
        <p className="text-sm text-muted-foreground">No description.</p>
      )}
    </section>
  )
}

export function IssueDetailsPanel({
  types,
  statuses,
  priorities,
  members,
  currentUserId,
  reporterName,
  createdAt,
  updatedAt,
}: {
  types: Option[]
  statuses: StatusOption[]
  priorities: Option[]
  members: Option[]
  currentUserId: string
  reporterName: string
  createdAt: string
  updatedAt: string
}) {
  const { values, canEdit, saving, save } = useIssueValues()
  const status = statuses.find((item) => item.id === values.statusId)
  const priority = priorities.find((item) => item.id === values.priorityId)
  const type = types.find((item) => item.id === values.issueTypeId)
  const assignee = members.find((member) => member.id === values.assigneeId)
  const isMember = members.some((member) => member.id === currentUserId)
  const today = new Date().toISOString().slice(0, 10)
  const overdue = Boolean(values.dueDate) && values.dueDate < today && status?.category !== "done"

  return (
    <dl className="grid gap-3 text-sm">
      <Row label="Status" busy={saving === "statusId"}>
        {canEdit ? (
          <Select value={values.statusId} options={statuses} label="Status" onChange={(value) => void save("statusId", value)} />
        ) : status ? (
          <StatusChip name={status.name} category={status.category} />
        ) : null}
      </Row>
      <Row label="Assignee" busy={saving === "assigneeId"}>
        {canEdit ? (
          <div className="grid gap-1">
            <Select
              value={values.assigneeId}
              options={[{ id: "", name: "Unassigned" }, ...members]}
              label="Assignee"
              onChange={(value) => void save("assigneeId", value)}
            />
            {isMember && values.assigneeId !== currentUserId ? (
              <button type="button" className="w-fit text-xs font-medium text-primary hover:underline" onClick={() => void save("assigneeId", currentUserId)}>
                Assign to me
              </button>
            ) : null}
          </div>
        ) : (
          <span>{assignee?.name ?? "Unassigned"}</span>
        )}
      </Row>
      <Row label="Priority" busy={saving === "priorityId"}>
        {canEdit ? (
          <div className="flex items-center gap-2">
            <PriorityMark name={priority?.name ?? ""} />
            <Select value={values.priorityId} options={priorities} label="Priority" onChange={(value) => void save("priorityId", value)} />
          </div>
        ) : (
          <PriorityMark name={priority?.name ?? ""} />
        )}
      </Row>
      <Row label="Type" busy={saving === "issueTypeId"}>
        {canEdit ? (
          <Select value={values.issueTypeId} options={types} label="Type" onChange={(value) => void save("issueTypeId", value)} />
        ) : (
          <span>{type?.name}</span>
        )}
      </Row>
      <Row label="Due date" busy={saving === "dueDate"}>
        {canEdit ? (
          <div className="flex items-center gap-1">
            <input
              type="date"
              aria-label="Due date"
              value={values.dueDate}
              className={cn(filterFieldClass, "h-8", overdue && "border-destructive/60 text-destructive")}
              onChange={(event) => {
                const next = event.target.value
                if (next === "" || /^\d{4}-\d{2}-\d{2}$/.test(next)) void save("dueDate", next)
              }}
            />
            {values.dueDate ? (
              <Button type="button" size="icon-sm" variant="ghost" aria-label="Clear due date" onClick={() => void save("dueDate", "")}>
                <X />
              </Button>
            ) : null}
          </div>
        ) : (
          <span className={overdue ? "font-medium text-destructive" : undefined}>
            {values.dueDate ? `${overdue ? "Overdue · " : ""}${formatDueDate(values.dueDate)}` : "None"}
          </span>
        )}
      </Row>
      <Row label="Reporter">
        <span className="truncate">{reporterName}</span>
      </Row>
      <Row label="Created">
        <span className="text-muted-foreground">{formatProjectDate(createdAt)}</span>
      </Row>
      <Row label="Updated">
        <span className="text-muted-foreground">{formatProjectDate(updatedAt)}</span>
      </Row>
    </dl>
  )
}

export function CopyLinkButton({ path }: { path: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(`${window.location.origin}${path}`)
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
        } catch {
          toast.error("Could not copy the link.")
        }
      }}
    >
      {copied ? <Check /> : <LinkIcon />}
      {copied ? "Copied" : "Copy link"}
    </Button>
  )
}

function Row({ label, busy = false, children }: { label: string; busy?: boolean; children: ReactNode }) {
  return (
    <div className="grid min-w-0 grid-cols-[6rem_minmax(0,1fr)] items-start gap-2">
      <dt className="flex items-center gap-1 pt-1.5 text-xs text-muted-foreground">
        {label}
        {busy ? <Loader2 className="size-3 animate-spin" aria-label="Saving" /> : null}
      </dt>
      <dd className="flex min-h-8 min-w-0 items-center">{children}</dd>
    </div>
  )
}

function Select({
  value,
  options,
  label,
  onChange,
}: {
  value: string
  options: Option[]
  label: string
  onChange: (value: string) => void
}) {
  return (
    <select aria-label={label} value={value} className={cn(filterFieldClass, "h-8")} onChange={(event) => onChange(event.target.value)}>
      {options.map((option) => (
        <option key={option.id} value={option.id}>
          {option.name}
        </option>
      ))}
    </select>
  )
}
