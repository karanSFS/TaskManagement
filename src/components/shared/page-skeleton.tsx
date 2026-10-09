import { Skeleton } from "@/components/ui/skeleton"

export function DashboardSkeleton() {
  return (
    <div className="grid gap-4" role="status" aria-live="polite">
      <p className="sr-only">Loading home</p>
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-8 w-24" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <Skeleton className="h-56" />
        <Skeleton className="h-56" />
        <Skeleton className="h-56" />
        <Skeleton className="h-56" />
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
