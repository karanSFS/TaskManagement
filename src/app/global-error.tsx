"use client"

import { useEffect } from "react"

import "./globals.css"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <html lang="en">
      <body className="flex min-h-svh flex-col items-center justify-center gap-3 bg-background px-4 text-center text-foreground">
        <main id="content">
          <h1 className="text-lg font-semibold">FixTask hit an error</h1>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">The page could not be rendered. Try again.</p>
          <button
            type="button"
            className="mt-3 rounded-lg border px-3 py-1.5 text-sm"
            onClick={reset}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  )
}
