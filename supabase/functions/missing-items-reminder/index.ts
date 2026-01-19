import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MissingItemRequest {
  id: string;
  user_id: string;
  title: string;
  request_type: string;
  created_at: string;
  reminder_count: number;
  last_reminder_at: string | null;
}

interface UserProfile {
  id: string;
  email: string;
  first_name: string | null;
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting missing items reminder check...");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get all pending requests that haven't had a reminder in the last 24 hours
    // and are older than 3 days
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const { data: pendingRequests, error: requestsError } = await supabase
      .from("missing_item_requests")
      .select("id, user_id, title, request_type, created_at, reminder_count, last_reminder_at")
      .eq("status", "pending")
      .lt("created_at", threeDaysAgo.toISOString())
      .lt("reminder_count", 3) // Max 3 reminders
      .or(`last_reminder_at.is.null,last_reminder_at.lt.${oneDayAgo.toISOString()}`);

    if (requestsError) {
      console.error("Error fetching pending requests:", requestsError);
      throw requestsError;
    }

    console.log(`Found ${pendingRequests?.length || 0} requests needing reminders`);

    if (!pendingRequests || pendingRequests.length === 0) {
      return new Response(
        JSON.stringify({ message: "No reminders needed", count: 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Group requests by user
    const requestsByUser = pendingRequests.reduce((acc, req) => {
      if (!acc[req.user_id]) {
        acc[req.user_id] = [];
      }
      acc[req.user_id].push(req);
      return acc;
    }, {} as Record<string, MissingItemRequest[]>);

    const userIds = Object.keys(requestsByUser);

    // Fetch user profiles
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, email, first_name")
      .in("id", userIds);

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      throw profilesError;
    }

    let remindersSent = 0;
    let emailsSent = 0;

    for (const userId of userIds) {
      const userRequests = requestsByUser[userId];
      const profile = profiles?.find((p: UserProfile) => p.id === userId);

      if (!profile || !profile.email) {
        console.log(`Skipping user ${userId}: No email found`);
        continue;
      }

      // Determine reminder level based on max reminder_count
      const maxReminderCount = Math.max(...userRequests.map(r => r.reminder_count));
      const reminderLevel = maxReminderCount + 1;

      // Create in-app notification
      const titles = userRequests.map(r => r.title);
      const notificationMessage = reminderLevel === 1
        ? `Erinnerung: ${titles.length} fehlende Unterlagen/Angaben warten auf Ihre Antwort.`
        : reminderLevel === 2
          ? `Zweite Erinnerung: Bitte reichen Sie die fehlenden ${titles.length} Unterlagen/Angaben ein.`
          : `Letzte Erinnerung: ${titles.length} Unterlagen/Angaben müssen dringend eingereicht werden.`;

      await supabase.from("user_notifications").insert({
        user_id: userId,
        type: "missing_items_reminder",
        title: reminderLevel === 3 ? "Dringende Erinnerung" : "Erinnerung",
        message: notificationMessage,
        metadata: {
          reminder_level: reminderLevel,
          request_count: userRequests.length,
          request_ids: userRequests.map(r => r.id),
        },
      });

      // Send email if Resend API key is configured
      if (RESEND_API_KEY) {
        try {
          // Dynamic import for Resend
          const { Resend } = await import("https://esm.sh/resend@2.0.0");
          const resend = new Resend(RESEND_API_KEY);
          
          const itemsList = userRequests
            .map(r => `• ${r.title} (${r.request_type === 'document' ? 'Unterlage' : 'Angabe'})`)
            .join("\n");

          const urgencyText = reminderLevel === 1
            ? "Wir möchten Sie freundlich daran erinnern"
            : reminderLevel === 2
              ? "Dies ist eine zweite Erinnerung"
              : "Dies ist eine dringende letzte Erinnerung";

          await resend.emails.send({
            from: "Ditax <noreply@ditax.ch>",
            to: [profile.email],
            subject: reminderLevel === 3
              ? "🔔 Dringende Erinnerung: Fehlende Unterlagen für Ihre Steuererklärung"
              : "Erinnerung: Fehlende Unterlagen für Ihre Steuererklärung",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #1D64FF;">Guten Tag${profile.first_name ? ` ${profile.first_name}` : ''}</h2>
                
                <p>${urgencyText}, dass wir für Ihre Steuererklärung noch folgende Unterlagen/Angaben benötigen:</p>
                
                <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
                  <pre style="margin: 0; font-family: Arial, sans-serif;">${itemsList}</pre>
                </div>
                
                <p>Bitte melden Sie sich in Ihrem Ditax-Konto an und reichen Sie die fehlenden Informationen im Chat ein.</p>
                
                <a href="https://ditaxv2.lovable.app/chat" style="display: inline-block; background-color: #1D64FF; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 20px 0;">
                  Jetzt einreichen
                </a>
                
                <p style="color: #666; font-size: 14px;">
                  Bei Fragen stehen wir Ihnen gerne zur Verfügung.
                </p>
                
                <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
                
                <p style="color: #999; font-size: 12px;">
                  Mit freundlichen Grüssen<br/>
                  Ihr Ditax Team
                </p>
              </div>
            `,
          });

          emailsSent++;
          console.log(`Email sent to ${profile.email}`);

          // Log email notification
          await supabase.from("email_notifications").insert({
            user_id: userId,
            notification_type: "missing_items_reminder",
          });
        } catch (emailError) {
          console.error(`Failed to send email to ${profile.email}:`, emailError);
        }
      }

      // Update reminder count and last_reminder_at for all requests
      const requestIds = userRequests.map(r => r.id);
      await supabase
        .from("missing_item_requests")
        .update({
          reminder_count: reminderLevel,
          last_reminder_at: new Date().toISOString(),
        })
        .in("id", requestIds);

      remindersSent += userRequests.length;
    }

    console.log(`Reminder job completed: ${remindersSent} reminders, ${emailsSent} emails sent`);

    return new Response(
      JSON.stringify({
        message: "Reminders processed successfully",
        reminders_sent: remindersSent,
        emails_sent: emailsSent,
        users_notified: userIds.length,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in missing-items-reminder function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
