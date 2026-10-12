"use client"

import { useSyncExternalStore, type ReactNode } from "react"
import { Monitor, Moon, Rows3, Rows4, Sun } from "lucide-react"
import { useTheme } from "next-themes"

const themes = [
  { id: "light", label: "Light", icon: <Sun /> },
  { id: "dark", label: "Dark", icon: <Moon /> },
  { id: "system", label: "System", icon: <Monitor /> },
] as const

const densities = [
  { id: "comfortable", label: "Comfortable", icon: <Rows3 /> },
  { id: "compact", label: "Compact", icon: <Rows4 /> },
] as const

type Density = (typeof densities)[number]["id"]

const densityKey = "fixtask-density"
const listeners = new Set<() => void>()

function readDensity(): Density {
  return document.documentElement.dataset.density === "compact" ? "compact" : "comfortable"
}

function writeDensity(next: Density) {
  if (next === "compact") document.documentElement.dataset.density = "compact"
  else delete document.documentElement.dataset.density
  try {
    localStorage.setItem(densityKey, next)
  } catch {}
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function AppearanceSettings() {
  const { theme, setTheme } = useTheme()
  const density = useSyncExternalStore(subscribe, readDensity, () => "comfortable" as Density)

  return (
    <section className="grid gap-5 rounded-xl border bg-card p-5">
      <div>
        <h2 className="text-base font-semibold">Appearance</h2>
        <p className="mt-1 text-sm text-muted-foreground">Saved on this device.</p>
      </div>
      <Choice label="Theme">
        {themes.map((choice) => (
          <Option key={choice.id} pressed={(theme ?? "system") === choice.id} onClick={() => setTheme(choice.id)} icon={choice.icon}>
            {choice.label}
          </Option>
        ))}
      </Choice>
      <Choice label="Density" hint="Compact fits more rows on the screen.">
        {densities.map((choice) => (
          <Option key={choice.id} pressed={density === choice.id} onClick={() => writeDensity(choice.id)} icon={choice.icon}>
            {choice.label}
          </Option>
        ))}
      </Choice>
    </section>
  )
}

function Choice({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="grid gap-2">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
        {children}
      </div>
    </div>
  )
}

function Option({ pressed, onClick, icon, children }: { pressed: boolean; onClick: () => void; icon: ReactNode; children: ReactNode }) {
  return (
    <button
      type="button"
      suppressHydrationWarning
      aria-pressed={pressed}
      className="inline-flex h-9 items-center gap-2 rounded-lg border bg-background px-3 text-sm transition-colors hover:bg-muted aria-pressed:border-primary aria-pressed:bg-accent aria-pressed:text-accent-foreground [&_svg]:size-4"
      onClick={onClick}
    >
      {icon}
      {children}
    </button>
  )
}
