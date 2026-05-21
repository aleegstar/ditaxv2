// AI Rate Limiting für Vertex-AI-Endpunkte.
// Schützt vor Missbrauch teurer Gemini-Calls.
// Lokales OCR (Despia / Tesseract) bleibt unlimitiert (clientseitig).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

export type AiEndpoint = "prior_year" | "lohnausweis" | "ocr_extract";

export const AI_LIMITS = {
  prior_year: {
    perDay: 5,
    perFilerYearLifetime: 3,
  },
  lohnausweis: {
    perDay: 20,
  },
  ocr_extract: {
    perDay: 100,
  },
} as const;

export interface CheckResult {
  allowed: boolean;
  reason?: "daily_limit" | "lifetime_limit";
  fallback?: "local" | "none";
  limit?: number;
  used?: number;
}

function getServiceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );
}

export async function checkAndLogAiUsage(opts: {
  userId: string;
  endpoint: AiEndpoint;
  taxFilerId?: string | null;
  taxYear?: string | null;
}): Promise<CheckResult> {
  const { userId, endpoint, taxFilerId, taxYear } = opts;
  const sb = getServiceClient();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // Tageslimit prüfen
  const { count: dayCount, error: dayErr } = await sb
    .from("ai_usage_log")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("endpoint", endpoint)
    .gte("created_at", since);

  if (dayErr) {
    console.error("[ai-rate-limit] day count error", dayErr);
    // Fail-open: lieber durchlassen als Service blockieren
    return { allowed: true };
  }

  const limits = AI_LIMITS[endpoint];
  const used = dayCount ?? 0;

  if (used >= limits.perDay) {
    return {
      allowed: false,
      reason: "daily_limit",
      fallback: endpoint === "lohnausweis" ? "none" : "local",
      limit: limits.perDay,
      used,
    };
  }

  // Lifetime-Limit für Vorjahres-Scans
  if (
    endpoint === "prior_year" &&
    taxFilerId &&
    taxYear &&
    "perFilerYearLifetime" in limits
  ) {
    const { count: lifeCount } = await sb
      .from("ai_usage_log")
      .select("id", { count: "exact", head: true })
      .eq("tax_filer_id", taxFilerId)
      .eq("tax_year", String(taxYear))
      .eq("endpoint", endpoint);

    if ((lifeCount ?? 0) >= limits.perFilerYearLifetime) {
      return {
        allowed: false,
        reason: "lifetime_limit",
        fallback: "none",
        limit: limits.perFilerYearLifetime,
        used: lifeCount ?? 0,
      };
    }
  }

  // Pessimistisch loggen (verhindert Retry-Storms)
  const { error: insErr } = await sb.from("ai_usage_log").insert({
    user_id: userId,
    tax_filer_id: taxFilerId ?? null,
    tax_year: taxYear ? String(taxYear) : null,
    endpoint,
    success: true,
  });
  if (insErr) console.error("[ai-rate-limit] log insert failed", insErr);

  return { allowed: true };
}

export function rateLimitResponse(check: CheckResult, corsHeaders: Record<string, string>) {
  return new Response(
    JSON.stringify({
      error: "rate_limited",
      reason: check.reason,
      fallback: check.fallback,
      limit: check.limit,
      used: check.used,
    }),
    {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
}
