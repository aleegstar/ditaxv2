import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { verifyNewsletterToken } from "../_shared/newsletter-token.ts";

const SAFE_REDIRECT_FALLBACK = "https://app.ditax.ch";
const ALLOWED_ORIGINS = [
  "https://app.ditax.ch",
  "https://ditax.ch",
  "https://www.ditax.ch",
  "https://ditaxv2.lovable.app",
];

function isSafeRedirect(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;
    return ALLOWED_ORIGINS.some((allowed) => parsed.origin === new URL(allowed).origin);
  } catch {
    return false;
  }
}

serve(async (req) => {
  const url = new URL(req.url);
  const token = url.searchParams.get("t");
  const target = url.searchParams.get("u");

  // Determine a safe destination. Never redirect to an arbitrary user-supplied URL.
  const safeTarget = target && isSafeRedirect(target) ? target : SAFE_REDIRECT_FALLBACK;

  try {
    if (!token || !target) {
      return Response.redirect(safeTarget, 302);
    }

    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const payload = await verifyNewsletterToken(token, serviceRoleKey);

    if (payload && payload.k === "c") {
      const supabase = createClient(Deno.env.get("SUPABASE_URL")!, serviceRoleKey);
      await supabase.from("newsletter_clicks").insert({
        campaign_id: payload.c,
        user_id: payload.u,
        email: payload.e,
        url: safeTarget,
        ip_address: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
        user_agent: req.headers.get("user-agent") || null,
      });
    }

    return Response.redirect(safeTarget, 302);
  } catch (e) {
    console.error("track-click error", e);
    return Response.redirect(SAFE_REDIRECT_FALLBACK, 302);
  }
});
