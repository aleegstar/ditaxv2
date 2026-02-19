import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user?.email) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Find Stripe customer by email
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    if (customers.data.length === 0) {
      return new Response(JSON.stringify({ invoices: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const customerId = customers.data[0].id;

    // Fetch completed checkout sessions for this customer
    const sessions = await stripe.checkout.sessions.list({
      customer: customerId,
      limit: 50,
      expand: ['data.payment_intent'],
    });

    const invoices = sessions.data
      .filter(s => s.status === 'complete' && s.payment_status === 'paid')
      .map(session => {
        const pi = session.payment_intent as Stripe.PaymentIntent | null;
        const charge = pi?.latest_charge as string | undefined;
        
        return {
          id: session.id,
          amount: session.amount_total,
          currency: session.currency,
          created: session.created,
          status: session.payment_status,
          paymentMethod: pi?.payment_method_types?.[0] || null,
          receiptUrl: null as string | null,
          invoicePdf: null as string | null,
          metadata: session.metadata,
          chargeId: charge || null,
        };
      });

    // Fetch receipt URLs for charges
    for (const inv of invoices) {
      if (inv.chargeId) {
        try {
          const charge = await stripe.charges.retrieve(inv.chargeId);
          inv.receiptUrl = charge.receipt_url || null;
        } catch {
          // ignore
        }
      }
    }

    return new Response(JSON.stringify({ invoices }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error fetching invoices:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
