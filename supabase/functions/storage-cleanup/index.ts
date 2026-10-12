import { createClient } from "jsr:@supabase/supabase-js@2"

const batchSize = 100

Deno.serve(async (request) => {
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  const url = Deno.env.get("SUPABASE_URL")
  if (!serviceKey || !url || request.headers.get("Authorization") !== `Bearer ${serviceKey}`) {
    return new Response("Unauthorized", { status: 401 })
  }

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } })
  const queued = await supabase
    .from("storage_cleanup")
    .select("id, bucket_id, object_path")
    .order("created_at", { ascending: true })
    .limit(batchSize)

  if (queued.error) {
    return Response.json({ error: "Could not read the cleanup queue." }, { status: 500 })
  }

  const rows = queued.data ?? []
  if (rows.length === 0) return Response.json({ removed: 0 })

  const byBucket = new Map<string, { id: string; path: string }[]>()
  for (const row of rows) {
    const bucket = byBucket.get(row.bucket_id) ?? []
    bucket.push({ id: row.id, path: row.object_path })
    byBucket.set(row.bucket_id, bucket)
  }

  const removedIds: string[] = []
  for (const [bucket, files] of byBucket) {
    const result = await supabase.storage.from(bucket).remove(files.map((file) => file.path))
    if (!result.error) removedIds.push(...files.map((file) => file.id))
  }

  if (removedIds.length > 0) {
    const cleared = await supabase.from("storage_cleanup").delete().in("id", removedIds)
    if (cleared.error) {
      return Response.json({ error: "Files were removed, but the queue could not be cleared." }, { status: 500 })
    }
  }

  return Response.json({ removed: removedIds.length, remaining: rows.length - removedIds.length })
})
