import Link from "next/link"

import { Button } from "@/components/ui/button"

export default function AppNotFound() {
  return (
    <div className="rounded-lg border bg-card px-4 py-5">
      <p className="font-mono text-xs text-muted-foreground">404</p>
      <h1 className="mt-1 text-sm font-medium">That page is not in FixTask</h1>
      <p className="mt-1 text-sm text-muted-foreground">The address does not match a workspace page.</p>
      <Button asChild variant="outline" size="sm" className="mt-3">
        <Link href="/dashboard">Go home</Link>
      </Button>
    </div>
  )
}
