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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");

    if (!stripeKey) {
      return new Response(JSON.stringify({ error: "STRIPE_SECRET_KEY missing" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    if (req.method === "GET") {
      const promos = await stripe.promotionCodes.list({ active: true, limit: 100 });
      const result = promos.data.map((p) => ({
        id: p.id,
        code: p.code,
        active: p.active,
        created: p.created,
        expires_at: p.expires_at,
        max_redemptions: p.max_redemptions,
        times_redeemed: p.times_redeemed,
        coupon: {
          id: p.coupon.id,
          name: p.coupon.name,
          percent_off: p.coupon.percent_off,
          amount_off: p.coupon.amount_off,
          currency: p.coupon.currency,
          duration: p.coupon.duration,
        },
      }));
      return new Response(JSON.stringify({ promoCodes: result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "POST") {
      const body = await req.json();
      const action = body.action || "create";

      if (action === "deactivate") {
        const updated = await stripe.promotionCodes.update(body.promoCodeId, { active: false });
        return new Response(JSON.stringify({ success: true, promoCode: updated }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const {
        code,
        discountType, // 'percent' | 'amount'
        percentOff,
        amountOff, // in CHF
        currency = "chf",
        name,
        maxRedemptions,
        expiresAt, // unix seconds
      } = body;

      if (!code || !discountType) {
        return new Response(JSON.stringify({ error: "code and discountType required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const couponParams: Stripe.CouponCreateParams = {
        duration: "once",
        name: name || code,
      };
      if (discountType === "percent") {
        if (!percentOff || percentOff <= 0 || percentOff > 100) {
          return new Response(JSON.stringify({ error: "Invalid percentOff" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        couponParams.percent_off = percentOff;
      } else {
        if (!amountOff || amountOff <= 0) {
          return new Response(JSON.stringify({ error: "Invalid amountOff" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        couponParams.amount_off = Math.round(amountOff * 100); // CHF -> Rappen
        couponParams.currency = currency;
      }

      const coupon = await stripe.coupons.create(couponParams);

      const promoParams: Stripe.PromotionCodeCreateParams = {
        coupon: coupon.id,
        code: code.trim().toUpperCase(),
      };
      if (maxRedemptions && maxRedemptions > 0) promoParams.max_redemptions = maxRedemptions;
      if (expiresAt && expiresAt > 0) promoParams.expires_at = expiresAt;

      const promo = await stripe.promotionCodes.create(promoParams);

      return new Response(JSON.stringify({ success: true, promoCode: promo }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[ADMIN-PROMO] Error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
