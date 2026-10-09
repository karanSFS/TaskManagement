import { cn } from "@/lib/utils"

type LogoProps = {
  className?: string
  wordmark?: boolean
}

export function Logo({ className, wordmark = true }: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <svg viewBox="0 0 32 32" aria-hidden="true" className="size-7 shrink-0">
        <rect width="32" height="32" rx="8" fill="#4F46E5" />
        <path
          d="M8.5 16.4 13.4 21.4 23.5 10.6"
          fill="none"
          stroke="#ffffff"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {wordmark ? (
        <span className="text-[15px] font-semibold tracking-tight text-foreground group-data-[collapsible=icon]:hidden">
          FixTask
        </span>
      ) : null}
    </span>
  )
}
