import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

const RESEND_API_URL = "https://api.resend.com/emails";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role
    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { campaign_id } = await req.json();
    if (!campaign_id) {
      return new Response(JSON.stringify({ error: "campaign_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get campaign
    const { data: campaign, error: campError } = await supabaseAdmin
      .from("newsletter_campaigns")
      .select("*")
      .eq("id", campaign_id)
      .single();

    if (campError || !campaign) {
      return new Response(JSON.stringify({ error: "Campaign not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (campaign.status !== "draft") {
      return new Response(JSON.stringify({ error: "Campaign already sent or sending" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update status to sending
    await supabaseAdmin
      .from("newsletter_campaigns")
      .update({ status: "sending", sent_at: new Date().toISOString() })
      .eq("id", campaign_id);

    // Get all subscribed users
    const { data: subscribers } = await supabaseAdmin
      .from("profiles")
      .select("id, email, first_name")
      .not("marketing_consent_at", "is", null)
      .not("email", "is", null);

    if (!subscribers || subscribers.length === 0) {
      await supabaseAdmin
        .from("newsletter_campaigns")
        .update({ status: "sent", recipient_count: 0 })
        .eq("id", campaign_id);

      return new Response(JSON.stringify({ success: true, sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const appUrl = Deno.env.get("APP_URL") || "https://ditaxv2.lovable.app";
    let sentCount = 0;
    let failedCount = 0;

    for (const subscriber of subscribers) {
      if (!subscriber.email) continue;

      const personalizedHtml = `
        ${campaign.html_content}
        <hr style="margin-top: 32px; border: none; border-top: 1px solid #e5e7eb;" />
        <p style="font-size: 12px; color: #9ca3af; text-align: center; margin-top: 16px;">
          Du erhältst diese E-Mail, weil du dich für Marketing-E-Mails angemeldet hast.<br />
          <a href="${appUrl}/privacy-settings" style="color: #6b7280;">Newsletter abbestellen</a>
        </p>
      `;

      try {
        const res = await fetch(RESEND_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: "Ditax <noreply@ditax.ch>",
            to: [subscriber.email],
            subject: campaign.subject,
            html: personalizedHtml,
          }),
        });

        const resBody = await res.json();
        const status = res.ok ? "sent" : "failed";
        const errorMsg = res.ok ? null : JSON.stringify(resBody);

        await supabaseAdmin.from("newsletter_send_log").insert({
          campaign_id,
          user_id: subscriber.id,
          email: subscriber.email,
          status,
          error_message: errorMsg,
        });

        if (res.ok) sentCount++;
        else failedCount++;
      } catch (err) {
        await supabaseAdmin.from("newsletter_send_log").insert({
          campaign_id,
          user_id: subscriber.id,
          email: subscriber.email,
          status: "failed",
          error_message: err.message,
        });
        failedCount++;
      }

      // Small delay to avoid rate limiting
      await new Promise((r) => setTimeout(r, 100));
    }

    // Update campaign status
    await supabaseAdmin
      .from("newsletter_campaigns")
      .update({
        status: failedCount === subscribers.length ? "failed" : "sent",
        recipient_count: sentCount,
      })
      .eq("id", campaign_id);

    return new Response(
      JSON.stringify({ success: true, sent: sentCount, failed: failedCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Newsletter error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
