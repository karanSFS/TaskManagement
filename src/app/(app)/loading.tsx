import { Skeleton } from "@/components/ui/skeleton"

export default function AppLoading() {
  return (
    <div className="grid gap-3" role="status" aria-live="polite">
      <p className="sr-only">Loading</p>
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-4 w-72" />
      <Skeleton className="h-32 w-full" />
    </div>
  )
}
