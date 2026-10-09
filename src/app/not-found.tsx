import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main id="content" className="flex min-h-svh flex-col items-center justify-center gap-3 px-4 text-center">
      <p className="font-mono text-xs text-muted-foreground">404</p>
      <h1 className="text-lg font-semibold">That page is not in FixTask</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        The address does not match a workspace page.
      </p>
      <Button asChild variant="outline">
        <Link href="/dashboard">Go home</Link>
      </Button>
    </main>
  );
}
