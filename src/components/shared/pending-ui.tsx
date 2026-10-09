"use client"

import { useState, type ComponentProps, type ReactNode } from "react"
import { Loader2 } from "lucide-react"
import { useLinkStatus } from "next/link"

import { Button } from "@/components/ui/button"

export function LinkPending({ className = "size-3.5" }: { className?: string }) {
  const { pending } = useLinkStatus()
  if (!pending) return null
  return <Loader2 className={`${className} animate-spin`} aria-hidden />
}

export function usePromisePending<T>(promise: Promise<T> | null) {
  const [watch, setWatch] = useState<{ promise: Promise<T> | null; settled: boolean }>({
    promise: null,
    settled: true,
  })
  if (promise !== watch.promise) {
    setWatch({ promise, settled: promise === null })
    if (promise) {
      const current = promise
      current.finally(() => {
        setWatch((existing) => (existing.promise === current ? { promise: current, settled: true } : existing))
      })
    }
  }
  return promise !== null && !watch.settled
}

export function RevealButton({
  onReveal,
  children,
  disabled,
  ...props
}: Omit<ComponentProps<typeof Button>, "onClick"> & { onReveal: () => void }) {
  const [busy, setBusy] = useState(false)
  return (
    <Button
      {...props}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      onClick={() => {
        setBusy(true)
        requestAnimationFrame(() => {
          onReveal()
          setBusy(false)
        })
      }}
    >
      {busy ? <Loader2 className="animate-spin" /> : null}
      {children}
    </Button>
  )
}

export function BusyLabel({ busy, children }: { busy: boolean; children: ReactNode }) {
  return (
    <>
      {busy ? <Loader2 className="animate-spin" aria-hidden /> : null}
      {children}
    </>
  )
}
