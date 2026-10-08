import type { ReactNode } from "react"

import { Logo } from "@/components/brand/logo"

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-background px-4 py-10">
      <div className="mb-6 flex flex-col items-center gap-2 text-center">
        <Logo />
        <p className="text-sm text-muted-foreground">Ship work, not tickets.</p>
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  )
}
