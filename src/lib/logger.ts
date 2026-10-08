type LogLevel = "debug" | "info" | "warn" | "error"

type LogEntry = {
  level: LogLevel
  operation: string
  code: string
  userId?: string
  resourceId?: string
}

export function logServerEvent(entry: LogEntry) {
  if (entry.level === "debug" && process.env.NODE_ENV === "production") {
    return
  }

  const line = JSON.stringify({
    timestamp: new Date().toISOString(),
    ...entry,
  })

  if (entry.level === "error") {
    console.error(line)
    return
  }

  if (entry.level === "warn") {
    console.warn(line)
    return
  }

  console.info(line)
}
