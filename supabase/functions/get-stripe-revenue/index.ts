import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check - admin only
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Not authenticated");

    // Check admin role
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: roleData } = await supabaseService
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) throw new Error("Unauthorized: admin role required");

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Calculate date ranges
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    // Fetch balance transactions for this month
    const thisMonthCharges = await fetchSuccessfulCharges(stripe, startOfMonth, now);
    const lastMonthCharges = await fetchSuccessfulCharges(stripe, startOfLastMonth, endOfLastMonth);

    // Calculate totals (amounts are in smallest currency unit, e.g. Rappen)
    const revenueThisMonth = thisMonthCharges.reduce((sum, c) => sum + (c.amount - (c.amount_refunded || 0)), 0);
    const revenueLastMonth = lastMonthCharges.reduce((sum, c) => sum + (c.amount - (c.amount_refunded || 0)), 0);

    // Convert from Rappen to CHF (divide by 100)
    const result = {
      revenueThisMonth: Math.round(revenueThisMonth / 100),
      revenueLastMonth: Math.round(revenueLastMonth / 100),
      chargesThisMonth: thisMonthCharges.length,
      chargesLastMonth: lastMonthCharges.length,
    };

    console.log("[get-stripe-revenue] Result:", JSON.stringify(result));

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("[get-stripe-revenue] Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

async function fetchSuccessfulCharges(stripe: Stripe, from: Date, to: Date) {
  const charges: any[] = [];
  let hasMore = true;
  let startingAfter: string | undefined;

  while (hasMore) {
    const params: any = {
      limit: 100,
      created: {
        gte: Math.floor(from.getTime() / 1000),
        lte: Math.floor(to.getTime() / 1000),
      },
    };
    if (startingAfter) params.starting_after = startingAfter;

    const result = await stripe.charges.list(params);
    
    for (const charge of result.data) {
      if (charge.status === "succeeded" && charge.paid) {
        charges.push({
          amount: charge.amount,
          amount_refunded: charge.amount_refunded,
          currency: charge.currency,
          created: charge.created,
        });
      }
    }

    hasMore = result.has_more;
    if (result.data.length > 0) {
      startingAfter = result.data[result.data.length - 1].id;
    }
  }

  return charges;
}
