/**
 * Shared Auth Middleware for Edge Functions
 *
 * Centralizes authentication, authorization, origin validation and CORS to
 * prevent security drift across functions. Use this in every function that
 * handles user data.
 *
 * Usage:
 *   import { requireAuth, requireAdmin, corsHeaders } from "../_shared/auth.ts";
 *   const auth = await requireAuth(req);
 *   if (!auth.ok) return auth.response;
 *   const { userId, supabaseAdmin } = auth;
 */

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export const corsHeaders = {
  // Kept '*' for backwards compatibility with public endpoints.
  // Sensitive endpoints MUST use `corsHeadersFor(req)` instead, which echoes
  // only allow-listed origins.
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Max-Age": "86400",
  "Vary": "Origin",
};

/** Allowed Origins for state-changing requests (Origin header validation). */
const ALLOWED_ORIGINS = new Set([
  "https://app.ditax.ch",
  "https://ditax.ch",
  "https://www.ditax.ch",
  "https://ditaxv2.lovable.app",
  "https://id-preview--f3f9ff0a-31e5-484e-b2c6-11d75f41e180.lovable.app",
  // Native Capacitor schemes
  "capacitor://localhost",
  "ionic://localhost",
  "http://localhost",
]);

/**
 * Hardened CORS headers that echo ONLY an allow-listed origin (never '*').
 * Use this in every function returning sensitive data (auth, payments,
 * decrypted documents, admin endpoints, chat).
 */
export function corsHeadersFor(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  const allowed = ALLOWED_ORIGINS.has(origin) ? origin : "null";
  return { ...corsHeaders, "Access-Control-Allow-Origin": allowed };
}

type AuthOk = {
  ok: true;
  userId: string;
  email: string | null;
  supabase: SupabaseClient;
  supabaseAdmin: SupabaseClient;
};
type AuthFail = { ok: false; response: Response };
export type AuthResult = AuthOk | AuthFail;

function deny(status: number, code: string, message?: string): AuthFail {
  return {
    ok: false,
    response: new Response(JSON.stringify({ error: code, message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }),
  };
}

/** Strict Origin check for state-changing methods (CSRF-class protection). */
export function validateOrigin(req: Request): boolean {
  const method = req.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return true;
  const origin = req.headers.get("origin");
  // Native apps may omit Origin; allow only if there's also a valid auth header.
  if (!origin) return !!req.headers.get("authorization");
  return ALLOWED_ORIGINS.has(origin);
}

/** Verify caller is an authenticated user. Returns userId + scoped clients. */
export async function requireAuth(req: Request): Promise<AuthResult> {
  if (!validateOrigin(req)) {
    return deny(403, "forbidden_origin");
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return deny(401, "missing_authorization");
  }

  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anon || !service) {
    return deny(500, "server_misconfigured");
  }

  const supabase = createClient(url, anon, {
    global: { headers: { Authorization: authHeader } },
  });

  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims) {
    return deny(401, "invalid_token");
  }

  const userId = data.claims.sub as string;
  const email = (data.claims.email as string | undefined) ?? null;
  const supabaseAdmin = createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return { ok: true, userId, email, supabase, supabaseAdmin };
}

/** Verify caller is an admin via `has_role(uid,'admin')`. */
export async function requireAdmin(req: Request): Promise<AuthResult> {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth;

  const { data, error } = await auth.supabaseAdmin.rpc("has_role", {
    _user_id: auth.userId,
    _role: "admin",
  });
  if (error || data !== true) {
    // Log unauthorized admin attempt for SIEM
    await auth.supabaseAdmin.from("security_audit_logs").insert({
      user_id: auth.userId,
      action: "UNAUTHORIZED_ADMIN_ENDPOINT",
      resource: new URL(req.url).pathname,
      success: false,
      error_message: "Non-admin attempted admin endpoint",
    });
    return deny(403, "admin_required");
  }
  return auth;
}

/** Convenience for OPTIONS preflight. */
export function preflight(req: Request): Response | null {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  return null;
}
