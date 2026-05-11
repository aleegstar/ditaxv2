import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { verifyNewsletterToken } from "../_shared/newsletter-token.ts";

const HTML_HEADERS = { "Content-Type": "text/html; charset=utf-8" };

function page(title: string, body: string): string {
  return `<!DOCTYPE html><html lang="de"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /><title>${title}</title>
<style>
  body{margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f4f4f5;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;color:#18181b;}
  .card{max-width:480px;width:100%;background:#fff;border-radius:16px;padding:32px;box-shadow:0 10px 25px rgba(0,0,0,0.08);text-align:center;}
  h1{font-size:22px;margin:0 0 12px;}
  p{margin:0 0 8px;color:#52525b;line-height:1.5;}
  a{color:#1D64FF;}
</style></head><body><div class="card">${body}</div></body></html>`;
}

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("t");
    if (!token) {
      return new Response(page("Ungültiger Link", "<h1>Ungültiger Link</h1><p>Bitte verwende den Link aus der E-Mail.</p>"), {
        status: 400, headers: HTML_HEADERS,
      });
    }

    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const payload = await verifyNewsletterToken(token, serviceRoleKey);
    if (!payload || payload.k !== "u") {
      return new Response(page("Ungültiger Link", "<h1>Ungültiger Link</h1><p>Dieser Abmelde-Link ist nicht gültig.</p>"), {
        status: 400, headers: HTML_HEADERS,
      });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, serviceRoleKey);

    // Marketing-Consent entfernen
    await supabase
      .from("profiles")
      .update({ marketing_consent_at: null })
      .eq("id", payload.u);

    // Reason aus optionalem POST-Body (z.B. One-Click)
    let reason: string | null = null;
    if (req.method === "POST") {
      try {
        const txt = await req.text();
        if (txt && txt.includes("List-Unsubscribe=One-Click")) reason = "one-click";
      } catch { /* ignore */ }
    }

    // Eintrag protokollieren (idempotent: einfach Insert, mehrere Klicks = mehrere Zeilen OK)
    await supabase.from("newsletter_unsubscribes").insert({
      campaign_id: payload.c,
      user_id: payload.u,
      email: payload.e,
      reason,
      ip_address: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
      user_agent: req.headers.get("user-agent") || null,
    });

    // One-Click (POST) erwartet 200 ohne UI
    if (req.method === "POST") {
      return new Response("ok", { status: 200 });
    }

    return new Response(
      page("Abgemeldet", `
        <h1>Du bist abgemeldet</h1>
        <p>Wir senden dir keine Newsletter mehr an <strong>${payload.e.replace(/</g,"&lt;")}</strong>.</p>
        <p style="margin-top:16px;font-size:13px;">Versehentlich abgemeldet? <a href="https://app.ditax.ch/privacy-settings">In den Einstellungen wieder anmelden</a>.</p>
      `),
      { status: 200, headers: HTML_HEADERS },
    );
  } catch (e) {
    console.error("unsubscribe error", e);
    return new Response(page("Fehler", "<h1>Fehler</h1><p>Bitte später erneut versuchen.</p>"), {
      status: 500, headers: HTML_HEADERS,
    });
  }
});
