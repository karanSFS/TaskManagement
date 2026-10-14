export type SprintChoice = { id: string; name: string; status: string }

export function sprintOptions(current: SprintChoice | null, open: SprintChoice[]) {
  const options = [
    { id: "", name: "Backlog", disabled: false },
    ...open.map((sprint) => ({
      id: sprint.id,
      name: sprint.status === "active" ? `${sprint.name} (active)` : sprint.name,
      disabled: false,
    })),
  ]

  if (current && current.status === "completed" && !options.some((option) => option.id === current.id)) {
    options.splice(1, 0, { id: current.id, name: `${current.name} (completed)`, disabled: true })
  }

  return options
}
