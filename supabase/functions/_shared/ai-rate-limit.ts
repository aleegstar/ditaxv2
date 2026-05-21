// AI Rate Limiting für Vertex-AI-Endpunkte.
// Schützt vor Missbrauch teurer Gemini-Calls.
// Lokales OCR (Despia / Tesseract) bleibt unlimitiert (clientseitig).
//
// Zweite Schutzachse: Despia Storage Vault Device-ID (Header `x-device-id`).
// Diese überlebt App-Reinstall und Account-Löschung (iCloud KVS / Google Backup),
// sodass Quotas nicht durch Account-Wechsel umgangen werden können.
// Auf dem Server wird die UUID gepfeffert + SHA-256-gehasht (kein PII).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

export type AiEndpoint = "prior_year" | "lohnausweis" | "ocr_extract";

export const AI_LIMITS = {
  prior_year: {
    perDay: 5,
    perFilerYearLifetime: 3,
    perDeviceYearLifetime: 3,
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
  reason?:
    | "daily_limit"
    | "lifetime_limit"
    | "daily_limit_device"
    | "lifetime_limit_device";
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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Read & validate the x-device-id header.
 * Returns null if missing or malformed.
 */
export function extractDeviceId(req: Request): string | null {
  const raw = req.headers.get("x-device-id");
  if (!raw) return null;
  const trimmed = raw.trim();
  if (trimmed.length === 0 || trimmed.length > 64) return null;
  if (!UUID_RE.test(trimmed)) return null;
  return trimmed.toLowerCase();
}

async function hashDeviceId(deviceId: string): Promise<string> {
  const pepper = Deno.env.get("DEVICE_ID_PEPPER") ?? "";
  const data = new TextEncoder().encode(`${deviceId}:${pepper}`);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function checkAndLogAiUsage(opts: {
  userId: string;
  endpoint: AiEndpoint;
  taxFilerId?: string | null;
  taxYear?: string | null;
  deviceId?: string | null;
}): Promise<CheckResult> {
  const { userId, endpoint, taxFilerId, taxYear, deviceId } = opts;
  const sb = getServiceClient();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const limits = AI_LIMITS[endpoint];

  const deviceHash = deviceId ? await hashDeviceId(deviceId) : null;

  // ── Tageslimit pro user_id ──────────────────────────────────────────
  const { count: dayCount, error: dayErr } = await sb
    .from("ai_usage_log")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("endpoint", endpoint)
    .gte("created_at", since);

  if (dayErr) {
    console.error("[ai-rate-limit] day count error", dayErr);
    return { allowed: true };
  }
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

  // ── Tageslimit pro Gerät (nur wenn Vault-ID vorhanden) ──────────────
  if (deviceHash) {
    const { count: dayDevCount } = await sb
      .from("ai_usage_log")
      .select("id", { count: "exact", head: true })
      .eq("device_hash", deviceHash)
      .eq("endpoint", endpoint)
      .gte("created_at", since);
    if ((dayDevCount ?? 0) >= limits.perDay) {
      return {
        allowed: false,
        reason: "daily_limit_device",
        fallback: endpoint === "lohnausweis" ? "none" : "local",
        limit: limits.perDay,
        used: dayDevCount ?? 0,
      };
    }
  }

  // ── Lifetime-Limit für Vorjahres-Scans pro (tax_filer, year) ────────
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

  // ── Lifetime-Limit für Vorjahres-Scans pro (device, year) ──────────
  if (
    endpoint === "prior_year" &&
    deviceHash &&
    taxYear &&
    "perDeviceYearLifetime" in limits
  ) {
    const { count: devLifeCount } = await sb
      .from("ai_usage_log")
      .select("id", { count: "exact", head: true })
      .eq("device_hash", deviceHash)
      .eq("tax_year", String(taxYear))
      .eq("endpoint", endpoint);

    if ((devLifeCount ?? 0) >= limits.perDeviceYearLifetime) {
      return {
        allowed: false,
        reason: "lifetime_limit_device",
        fallback: "none",
        limit: limits.perDeviceYearLifetime,
        used: devLifeCount ?? 0,
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
    device_hash: deviceHash,
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
