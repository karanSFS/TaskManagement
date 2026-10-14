import { Skeleton } from "@/components/ui/skeleton"

export function DashboardSkeleton() {
  return (
    <div className="grid gap-4" role="status" aria-live="polite">
      <p className="sr-only">Loading home</p>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid gap-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-8 w-28" />
      </div>
      <Skeleton className="h-16 rounded-xl" />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(16rem,20rem)]">
        <div className="grid gap-4">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
        <div className="grid gap-4">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
      </div>
    </div>
  )
}

export function ListSkeleton() {
  return (
    <div className="grid gap-2" role="status" aria-live="polite">
      <p className="sr-only">Loading</p>
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-36 w-full" />
    </div>
  )
}

export function MyWorkSkeleton() {
  return (
    <div className="grid gap-3" role="status" aria-live="polite">
      <p className="sr-only">Loading your work</p>
      <Skeleton className="h-8 w-full max-w-xl" />
      <Skeleton className="h-8 w-full max-w-md" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  )
}

export function ProjectsSkeleton() {
  return (
    <div className="grid gap-5" role="status" aria-live="polite">
      <p className="sr-only">Loading projects</p>
      <div className="flex items-start justify-between gap-3">
        <div className="grid gap-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-8 w-28" />
      </div>
      <div className="flex flex-wrap justify-between gap-3">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-8 w-80" />
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  )
}

export function BoardSkeleton() {
  return (
    <div className="grid gap-3" role="status" aria-live="polite">
      <p className="sr-only">Loading board</p>
      <Skeleton className="h-8 w-48" />
      <div className="flex gap-3 overflow-hidden">
        <Skeleton className="h-72 w-72 shrink-0 rounded-xl" />
        <Skeleton className="h-72 w-72 shrink-0 rounded-xl" />
        <Skeleton className="h-72 w-72 shrink-0 rounded-xl" />
      </div>
    </div>
  )
}

export function DetailSkeleton() {
  return (
    <div className="grid gap-4" role="status" aria-live="polite">
      <p className="sr-only">Loading</p>
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-10 w-2/3" />
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_17rem]">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  )
}

export function FormSkeleton() {
  return (
    <div className="grid max-w-md gap-3" role="status" aria-live="polite">
      <p className="sr-only">Loading</p>
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-28" />
    </div>
  )
}
