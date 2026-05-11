import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { verifyNewsletterToken } from "../_shared/newsletter-token.ts";

serve(async (req) => {
  const url = new URL(req.url);
  const token = url.searchParams.get("t");
  const target = url.searchParams.get("u");

  // Fallback Ziel falls Token ungültig: nichts wird geloggt, einfach weiterleiten.
  const fallback = target && /^https?:\/\//i.test(target) ? target : "https://app.ditax.ch";

  try {
    if (!token || !target) {
      return Response.redirect(fallback, 302);
    }

    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const payload = await verifyNewsletterToken(token, serviceRoleKey);

    if (payload && payload.k === "c") {
      const supabase = createClient(Deno.env.get("SUPABASE_URL")!, serviceRoleKey);
      await supabase.from("newsletter_clicks").insert({
        campaign_id: payload.c,
        user_id: payload.u,
        email: payload.e,
        url: target,
        ip_address: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
        user_agent: req.headers.get("user-agent") || null,
      });
    }

    return Response.redirect(target, 302);
  } catch (e) {
    console.error("track-click error", e);
    return Response.redirect(fallback, 302);
  }
});
