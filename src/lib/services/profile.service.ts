import { DatabaseError } from "@/lib/errors/database-error"
import { createClient } from "@/lib/supabase/server"

export async function getProfileName(userId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase.from("profiles").select("display_name").eq("id", userId).maybeSingle()

  if (error) {
    throw new DatabaseError("Could not load your profile.")
  }

  return data?.display_name ?? ""
}

export async function updateProfileName(userId: string, displayName: string) {
  const supabase = await createClient()
  const { error } = await supabase.from("profiles").update({ display_name: displayName }).eq("id", userId)

  if (error) {
    throw new DatabaseError("Could not save your profile.")
  }
}
