import { revalidatePath } from "next/cache"

// Issues, sprints, and projects appear on almost every screen (home, my work,
// project tabs, inbox, sidebar), so a change refreshes the whole signed-in app.
export function refreshWorkspace() {
  revalidatePath("/", "layout")
}
