"use client"

import { Monitor, Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

const choices = [
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
  { id: "system", label: "System" },
] as const

export function AppearanceSettings() {
  const { theme, setTheme } = useTheme()
  const current = theme ?? "system"

  return (
    <section className="grid max-w-lg gap-3 rounded-lg border bg-card p-4">
      <div>
        <p className="text-xs font-medium text-muted-foreground">This device</p>
        <h2 className="text-sm font-medium">Appearance</h2>
        <p className="mt-1 text-sm text-muted-foreground">Saved in this browser. It is not a project setting, and it stays after you reload.</p>
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Theme">
        {choices.map((choice) => (
          <button
            key={choice.id}
            type="button"
            suppressHydrationWarning
            aria-pressed={current === choice.id}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-sm aria-pressed:border-primary aria-pressed:bg-primary/10"
            onClick={() => setTheme(choice.id)}
          >
            <ThemeIcon name={choice.id} />
            {choice.label}
          </button>
        ))}
      </div>
    </section>
  )
}

function ThemeIcon({ name }: { name: (typeof choices)[number]["id"] }) {
  const className = "size-3.5"
  switch (name) {
    case "light":
      return <Sun className={className} />
    case "dark":
      return <Moon className={className} />
    default:
      return <Monitor className={className} />
  }
}
