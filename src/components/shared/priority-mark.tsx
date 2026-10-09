export function PriorityMark({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`size-1.5 shrink-0 rounded-full ${priorityDot(name)}`} aria-hidden />
      {name}
    </span>
  )
}

export function priorityDot(name: string) {
  switch (name) {
    case "Highest":
      return "bg-destructive"
    case "High":
      return "bg-warning"
    case "Medium":
      return "bg-info"
    case "Low":
      return "bg-success"
    default:
      return "bg-muted-foreground/50"
  }
}

export function projectAccent(key: string) {
  const index = key.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0) % 3
  if (index === 1) return { bar: "bg-info", wash: "bg-info/10", text: "text-info" }
  if (index === 2) return { bar: "bg-chart-2", wash: "bg-chart-2/15", text: "text-chart-2" }
  return { bar: "bg-primary", wash: "bg-primary/10", text: "text-primary" }
}
