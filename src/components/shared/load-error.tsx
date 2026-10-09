"use client"

import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"

export function LoadError({ message }: { message: string }) {
  const router = useRouter()

  return (
    <div className="rounded-lg border border-destructive/30 bg-card px-4 py-4" role="alert">
      <p className="text-sm font-medium">Could not load this</p>
      <p className="mt-1 text-sm text-muted-foreground">{message}</p>
      <Button className="mt-3" size="sm" variant="outline" onClick={() => router.refresh()}>
        Try again
      </Button>
    </div>
  )
}
