import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");

    if (!supabaseUrl || !supabaseServiceKey || !stripeSecretKey) {
      throw new Error("Missing environment variables");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    const stripe = new Stripe(stripeSecretKey, { apiVersion: "2023-10-16" });

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[REFERRAL] Fetching promo codes for user: ${user.id}`);

    // Get all redemptions where user is either referrer or referred
    const { data: redemptions, error: redemptionsError } = await supabaseClient
      .from("referral_redemptions")
      .select("*")
      .or(`referrer_user_id.eq.${user.id},referred_user_id.eq.${user.id}`);

    if (redemptionsError) {
      throw redemptionsError;
    }

    const promoCodes: Array<{
      code: string;
      promoId: string;
      type: 'earned' | 'received';
      used: boolean;
      amount: number;
      currency: string;
    }> = [];

    for (const redemption of redemptions || []) {
      try {
        // If user is the referrer, get referrer promo code
        if (redemption.referrer_user_id === user.id && !redemption.referrer_promo_used) {
          const promoCode = await stripe.promotionCodes.retrieve(redemption.referrer_stripe_promo_id);
          if (promoCode && promoCode.active) {
            const coupon = await stripe.coupons.retrieve(promoCode.coupon as string);
            promoCodes.push({
              code: promoCode.code,
              promoId: promoCode.id,
              type: 'earned',
              used: false,
              amount: coupon.amount_off || 0,
              currency: coupon.currency || 'chf'
            });
          }
        }

        // If user is the referred, get referred promo code
        if (redemption.referred_user_id === user.id && !redemption.referred_promo_used) {
          const promoCode = await stripe.promotionCodes.retrieve(redemption.referred_stripe_promo_id);
          if (promoCode && promoCode.active) {
            const coupon = await stripe.coupons.retrieve(promoCode.coupon as string);
            promoCodes.push({
              code: promoCode.code,
              promoId: promoCode.id,
              type: 'received',
              used: false,
              amount: coupon.amount_off || 0,
              currency: coupon.currency || 'chf'
            });
          }
        }
      } catch (stripeError) {
        console.error(`[REFERRAL] Error fetching promo code:`, stripeError);
      }
    }

    console.log(`[REFERRAL] Found ${promoCodes.length} active promo codes for user`);

    return new Response(JSON.stringify({ promoCodes }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[REFERRAL] Error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
