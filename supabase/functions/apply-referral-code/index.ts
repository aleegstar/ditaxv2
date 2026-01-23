import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const REFERRAL_COUPON_ID = "Mo7R4ArL"; // The base coupon ID in Stripe

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

    // Verify JWT and get user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { referralCode } = await req.json();
    
    if (!referralCode || typeof referralCode !== 'string') {
      return new Response(JSON.stringify({ error: "Referral code is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normalizedCode = referralCode.toUpperCase().trim();
    console.log(`[REFERRAL] Applying code: ${normalizedCode} for user: ${user.id}`);

    // Check if user has already been referred
    const { data: existingRedemption } = await supabaseClient
      .from("referral_redemptions")
      .select("id")
      .eq("referred_user_id", user.id)
      .maybeSingle();

    if (existingRedemption) {
      return new Response(JSON.stringify({ 
        error: "Du hast bereits einen Empfehlungscode verwendet" 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find the referral code
    const { data: referralCodeData, error: codeError } = await supabaseClient
      .from("referral_codes")
      .select("*")
      .eq("code", normalizedCode)
      .eq("is_active", true)
      .maybeSingle();

    if (codeError || !referralCodeData) {
      console.log(`[REFERRAL] Code not found or inactive: ${normalizedCode}`);
      return new Response(JSON.stringify({ 
        error: "Ungültiger oder inaktiver Empfehlungscode" 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if referrer is not the same as referred user
    if (referralCodeData.user_id === user.id) {
      return new Response(JSON.stringify({ 
        error: "Du kannst deinen eigenen Code nicht verwenden" 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if max referrals reached
    if (referralCodeData.successful_referrals >= referralCodeData.max_referrals) {
      return new Response(JSON.stringify({ 
        error: "Dieser Empfehlungscode wurde bereits zu oft verwendet" 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[REFERRAL] Creating Stripe promotion codes...`);

    // Create unique promotion code for the referred user (new user)
    const referredPromoCode = await stripe.promotionCodes.create({
      coupon: REFERRAL_COUPON_ID,
      max_redemptions: 1,
      metadata: {
        type: 'referral_referred',
        referred_user_id: user.id,
        referrer_user_id: referralCodeData.user_id,
        referral_code: normalizedCode
      }
    });

    // Create unique promotion code for the referrer
    const referrerPromoCode = await stripe.promotionCodes.create({
      coupon: REFERRAL_COUPON_ID,
      max_redemptions: 1,
      metadata: {
        type: 'referral_referrer',
        referred_user_id: user.id,
        referrer_user_id: referralCodeData.user_id,
        referral_code: normalizedCode
      }
    });

    console.log(`[REFERRAL] Created promo codes: referred=${referredPromoCode.code}, referrer=${referrerPromoCode.code}`);

    // Create referral redemption record
    const { error: redemptionError } = await supabaseClient
      .from("referral_redemptions")
      .insert({
        referral_code_id: referralCodeData.id,
        referrer_user_id: referralCodeData.user_id,
        referred_user_id: user.id,
        referrer_stripe_promo_id: referrerPromoCode.id,
        referred_stripe_promo_id: referredPromoCode.id,
      });

    if (redemptionError) {
      console.error("[REFERRAL] Error creating redemption:", redemptionError);
      throw redemptionError;
    }

    // Increment successful referrals count
    const { error: updateError } = await supabaseClient
      .from("referral_codes")
      .update({ 
        successful_referrals: referralCodeData.successful_referrals + 1 
      })
      .eq("id", referralCodeData.id);

    if (updateError) {
      console.error("[REFERRAL] Error updating referral count:", updateError);
    }

    console.log(`[REFERRAL] Successfully applied code for user: ${user.id}`);

    return new Response(JSON.stringify({
      success: true,
      message: "CHF 20.- Rabatt gesichert!",
      promoCode: referredPromoCode.code,
      promoCodeId: referredPromoCode.id
    }), {
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
