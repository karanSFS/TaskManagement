import { cn } from "@/lib/utils"

type LogoProps = {
  className?: string
  wordmark?: boolean
}

export function Logo({ className, wordmark = true }: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <svg
        viewBox="0 0 32 32"
        aria-hidden="true"
        className="size-7 shrink-0"
      >
        <rect width="32" height="32" rx="7" className="fill-primary" />
        <path
          d="M7 20.5h18l-1.4 3.2a1.5 1.5 0 0 1-1.4.9H9.8a1.5 1.5 0 0 1-1.4-.9L7 20.5Z"
          className="fill-primary-foreground"
        />
        <path
          d="M9.2 20.2h13.6l-1.2-4.2H10.4l-1.2 4.2Z"
          className="fill-primary-foreground/80"
        />
        <path
          d="M15.1 6.2 16.6 10l1.2-2.1 2.4 1.1-2.2 3.2h-3.1L15.1 6.2Z"
          className="fill-primary-foreground"
        />
      </svg>
      {wordmark ? (
        <span className="text-[15px] font-semibold tracking-tight text-foreground group-data-[collapsible=icon]:hidden">
          TaskForge
        </span>
      ) : null}
    </span>
  )
}
