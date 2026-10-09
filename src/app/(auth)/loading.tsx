import { Skeleton } from "@/components/ui/skeleton"

export default function AuthLoading() {
  return (
    <div className="grid gap-3 rounded-xl border bg-card p-4" role="status" aria-live="polite">
      <p className="sr-only">Loading</p>
      <Skeleton className="h-5 w-28" />
      <Skeleton className="h-4 w-48" />
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-full" />
    </div>
  )
}
