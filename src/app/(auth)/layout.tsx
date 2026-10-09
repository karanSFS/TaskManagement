import type { ReactNode } from "react"

import { Logo } from "@/components/brand/logo"

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-background px-4 py-10">
      <div className="mb-6 flex flex-col items-center gap-2 text-center">
        <Logo />
        <p className="max-w-xs text-sm text-muted-foreground">Plan together. Solve faster. Ship better.</p>
      </div>
      <main id="content" tabIndex={-1} className="w-full max-w-sm outline-none">
        {children}
      </main>
    </div>
  )
}
