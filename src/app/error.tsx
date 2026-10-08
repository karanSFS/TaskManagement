"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-3 px-4 text-center">
      <h1 className="text-lg font-semibold">TaskForge hit an error</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        The page could not be rendered. Retry, or return after local Supabase is running.
      </p>
      <Button variant="outline" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
