// AI Response Cache — SHA-256(file) + function_name + model
//
// Spart Vertex-AI-Kosten bei Re-Uploads identischer Dokumente.
// RLS isoliert Einträge per user_id; Service-Role-Client umgeht RLS,
// schreibt aber immer mit user_id, damit der User die Zeile lesen kann.

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function buildCacheKey(fileHash: string, functionName: string, model: string): string {
  return `${fileHash}:${functionName}:${model}`;
}

function adminClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );
}

export async function getCached(
  userId: string,
  cacheKey: string,
): Promise<unknown | null> {
  try {
    const db = adminClient();
    const { data, error } = await db
      .from("ai_extraction_cache")
      .select("id, payload")
      .eq("cache_key", cacheKey)
      .eq("user_id", userId)
      .maybeSingle();
    if (error || !data) return null;
    db.from("ai_extraction_cache")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", data.id)
      .then(() => {});
    return data.payload;
  } catch (e) {
    console.warn("[ai-cache] read failed:", (e as Error).message);
    return null;
  }
}

export async function setCached(params: {
  userId: string;
  taxFilerId?: string | null;
  cacheKey: string;
  functionName: string;
  model: string;
  fileHash: string;
  payload: unknown;
}): Promise<void> {
  try {
    const db = adminClient();
    await db.from("ai_extraction_cache").upsert(
      {
        user_id: params.userId,
        tax_filer_id: params.taxFilerId ?? null,
        cache_key: params.cacheKey,
        function_name: params.functionName,
        model: params.model,
        file_hash: params.fileHash,
        payload: params.payload as never,
        last_used_at: new Date().toISOString(),
      },
      { onConflict: "cache_key" },
    );
  } catch (e) {
    console.warn("[ai-cache] write failed:", (e as Error).message);
  }
}
