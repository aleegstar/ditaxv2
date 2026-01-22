import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface NotificationPayload {
  recipient_id: string;
  sender_id: string;
  message_preview?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resend = new Resend(resendApiKey);
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: NotificationPayload = await req.json();
    const { recipient_id, sender_id, message_preview } = payload;

    console.log("Processing notification for recipient:", recipient_id);

    // Check if sender has admin role (handles users with multiple roles)
    const { data: senderRoles, error: senderRoleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", sender_id)
      .eq("role", "admin");

    if (senderRoleError) {
      console.error("Error checking sender role:", senderRoleError);
    }

    const isAdmin = senderRoles && senderRoles.length > 0;

    if (!isAdmin) {
      console.log("Sender is not an admin, skipping notification");
      return new Response(JSON.stringify({ skipped: true, reason: "sender_not_admin" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if recipient is NOT an admin (only notify regular users)
    const { data: recipientRoles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", recipient_id)
      .eq("role", "admin");

    const recipientIsAdmin = recipientRoles && recipientRoles.length > 0;

    if (recipientIsAdmin) {
      console.log("Recipient is an admin, skipping notification");
      return new Response(JSON.stringify({ skipped: true, reason: "recipient_is_admin" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limiting: Check if we sent an email in the last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: recentNotification } = await supabase
      .from("email_notifications")
      .select("id")
      .eq("user_id", recipient_id)
      .eq("notification_type", "new_message_instant")
      .gte("sent_at", fiveMinutesAgo)
      .limit(1);

    if (recentNotification && recentNotification.length > 0) {
      console.log("Rate limited: Recent notification sent within 5 minutes");
      return new Response(JSON.stringify({ skipped: true, reason: "rate_limited" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get recipient profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("email, first_name")
      .eq("id", recipient_id)
      .single();

    if (profileError || !profile?.email) {
      console.error("Could not find recipient profile:", profileError);
      return new Response(JSON.stringify({ error: "Recipient not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userName = profile.first_name || "Kunde";
    const appUrl = "https://ditaxv2.lovable.app";

    // Send email
    const emailResponse = await resend.emails.send({
      from: "Ditax <noreply@ditax.ch>",
      to: [profile.email],
      subject: "Neue Nachricht von Ditax Support",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f5;">
            <tr>
              <td align="center" style="padding: 40px 20px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                  
                  <!-- Header -->
                  <tr>
                    <td style="background-color: #1D64FF; padding: 32px 40px; border-radius: 12px 12px 0 0;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                        Ditax
                      </h1>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px;">
                      <h2 style="margin: 0 0 16px 0; color: #18181b; font-size: 20px; font-weight: 600;">
                        Hallo ${userName}!
                      </h2>
                      
                      <p style="margin: 0 0 24px 0; color: #52525b; font-size: 16px; line-height: 1.6;">
                        Du hast eine neue Nachricht von unserem Support-Team erhalten.
                      </p>
                      
                      ${message_preview ? `
                      <div style="background-color: #f4f4f5; border-left: 4px solid #1D64FF; padding: 16px 20px; margin: 0 0 24px 0; border-radius: 0 8px 8px 0;">
                        <p style="margin: 0; color: #3f3f46; font-size: 14px; font-style: italic;">
                          "${message_preview}${message_preview.length >= 100 ? '...' : ''}"
                        </p>
                      </div>
                      ` : ''}
                      
                      <p style="margin: 0 0 32px 0; color: #52525b; font-size: 16px; line-height: 1.6;">
                        Melde dich an, um die vollständige Nachricht zu lesen und zu antworten.
                      </p>
                      
                      <!-- CTA Button -->
                      <table role="presentation" cellspacing="0" cellpadding="0">
                        <tr>
                          <td style="border-radius: 12px; background-color: #1D64FF;">
                            <a href="${appUrl}/chat" target="_blank" style="display: inline-block; padding: 14px 32px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600;">
                              Chat öffnen →
                            </a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="padding: 24px 40px; background-color: #fafafa; border-radius: 0 0 12px 12px; border-top: 1px solid #e4e4e7;">
                      <p style="margin: 0; color: #a1a1aa; font-size: 12px; text-align: center;">
                        Diese E-Mail wurde automatisch gesendet. Bitte antworte nicht direkt auf diese E-Mail.
                      </p>
                      <p style="margin: 8px 0 0 0; color: #a1a1aa; font-size: 12px; text-align: center;">
                        © ${new Date().getFullYear()} Ditax. Alle Rechte vorbehalten.
                      </p>
                    </td>
                  </tr>
                  
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    // Log the notification
    await supabase.from("email_notifications").insert({
      user_id: recipient_id,
      notification_type: "new_message_instant",
      sent_at: new Date().toISOString(),
    });

    return new Response(JSON.stringify({ success: true, emailId: emailResponse.data?.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Error in new-message-notification:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
