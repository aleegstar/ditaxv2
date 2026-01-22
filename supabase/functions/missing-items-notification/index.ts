import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MissingItemNotificationRequest {
  userId: string;
  items: {
    title: string;
    description?: string;
    request_type: 'document' | 'information';
  }[];
  taxYear?: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, items, taxYear }: MissingItemNotificationRequest = await req.json();

    if (!userId || !items || items.length === 0) {
      return new Response(
        JSON.stringify({ error: "userId and items are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Sending missing items notification to user ${userId} for ${items.length} items`);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch user profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, email, first_name")
      .eq("id", userId)
      .single();

    if (profileError || !profile?.email) {
      console.error("Error fetching profile:", profileError);
      return new Response(
        JSON.stringify({ error: "User profile not found or no email" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create in-app notification
    const documentCount = items.filter(i => i.request_type === 'document').length;
    const informationCount = items.filter(i => i.request_type === 'information').length;
    
    let notificationParts: string[] = [];
    if (documentCount > 0) {
      notificationParts.push(`${documentCount} ${documentCount === 1 ? 'Unterlage' : 'Unterlagen'}`);
    }
    if (informationCount > 0) {
      notificationParts.push(`${informationCount} ${informationCount === 1 ? 'Angabe' : 'Angaben'}`);
    }
    
    const notificationMessage = `Für deine Steuererklärung${taxYear ? ` ${taxYear}` : ''} werden noch ${notificationParts.join(' und ')} benötigt.`;

    await supabase.from("user_notifications").insert({
      user_id: userId,
      type: "missing_items_request",
      title: "Fehlende Unterlagen/Angaben",
      message: notificationMessage,
      metadata: {
        item_count: items.length,
        document_count: documentCount,
        information_count: informationCount,
        tax_year: taxYear,
      },
    });

    // Send email if Resend API key is configured
    if (!RESEND_API_KEY) {
      console.log("RESEND_API_KEY not configured, skipping email");
      return new Response(
        JSON.stringify({ success: true, notification_sent: true, email_sent: false }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const resend = new Resend(RESEND_API_KEY);

    // Build items list for email
    const documentItems = items.filter(i => i.request_type === 'document');
    const informationItems = items.filter(i => i.request_type === 'information');

    let itemsHtml = '';
    
    if (documentItems.length > 0) {
      itemsHtml += `
        <p style="margin: 16px 0 8px 0; font-weight: 600; color: #27272a;">Fehlende Unterlagen:</p>
        <ul style="margin: 0; padding-left: 20px; color: #3f3f46;">
          ${documentItems.map(item => `
            <li style="margin-bottom: 8px;">
              <strong>${item.title}</strong>
              ${item.description ? `<br/><span style="color: #71717a; font-size: 14px;">${item.description}</span>` : ''}
            </li>
          `).join('')}
        </ul>
      `;
    }

    if (informationItems.length > 0) {
      itemsHtml += `
        <p style="margin: 16px 0 8px 0; font-weight: 600; color: #27272a;">Fehlende Angaben:</p>
        <ul style="margin: 0; padding-left: 20px; color: #3f3f46;">
          ${informationItems.map(item => `
            <li style="margin-bottom: 8px;">
              <strong>${item.title}</strong>
              ${item.description ? `<br/><span style="color: #71717a; font-size: 14px;">${item.description}</span>` : ''}
            </li>
          `).join('')}
        </ul>
      `;
    }

    const emailResponse = await resend.emails.send({
      from: "Ditax <noreply@ditax.ch>",
      to: [profile.email],
      subject: `Fehlende Unterlagen für deine Steuererklärung${taxYear ? ` ${taxYear}` : ''}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="min-width: 100%; background-color: #f4f4f5;">
            <tr>
              <td align="center" style="padding: 40px 20px;">
                <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
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
                        Hallo${profile.first_name ? ` ${profile.first_name}` : ''}
                      </h2>
                      
                      <p style="margin: 0 0 24px 0; color: #3f3f46; font-size: 16px; line-height: 1.6;">
                        Für die Bearbeitung deiner Steuererklärung${taxYear ? ` ${taxYear}` : ''} benötigen wir noch einige Informationen von dir.
                      </p>
                      
                      <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
                        ${itemsHtml}
                      </div>
                      
                      <p style="margin: 0 0 24px 0; color: #3f3f46; font-size: 16px; line-height: 1.6;">
                        Bitte melde dich in deinem Ditax-Konto an und reiche die fehlenden Informationen ein.
                      </p>
                      
                      <!-- CTA Button -->
                      <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                        <tr>
                          <td style="border-radius: 12px; background-color: #1D64FF;">
                            <a href="https://ditaxv2.lovable.app/missing-items" 
                               style="display: inline-block; padding: 14px 32px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600;">
                              Jetzt einreichen
                            </a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="padding: 24px 40px; background-color: #fafafa; border-top: 1px solid #e4e4e7;">
                      <p style="margin: 0 0 8px 0; color: #a1a1aa; font-size: 12px; text-align: center;">
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

    // Log email notification
    await supabase.from("email_notifications").insert({
      user_id: userId,
      notification_type: "missing_items_request",
    });

    return new Response(
      JSON.stringify({ success: true, notification_sent: true, email_sent: true }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in missing-items-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
