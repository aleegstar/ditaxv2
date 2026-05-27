// Edge Function: create-payment-intent
// Erzeugt einen Stripe PaymentIntent + Ephemeral Key für das native
// Despia Stripe Payment Sheet (stripe://payment).
// Web-Flow nutzt weiterhin create-payment (Checkout Sessions).

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const bodySchema = z.object({
  taxYear: z.string().regex(/^20[2-3]\d$/),
  amount: z.number().int().min(1).max(10_000_000),
  expressService: z.boolean().optional().default(false),
  taxReturnId: z.string().uuid().optional().nullable(),
  taxFilerId: z.string().uuid().optional().nullable(),
  promoCodeId: z.string().optional().nullable(),
});

const log = (step: string, details?: unknown) =>
  console.log(`[create-payment-intent] ${step}`, details ?? "");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const requestId = crypto.randomUUID().substring(0, 8);

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get(
      "SUPABASE_SERVICE_ROLE_KEY",
    )!;
    const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;
    const STRIPE_PUBLISHABLE_KEY = Deno.env.get("STRIPE_PUBLISHABLE_KEY")!;

    if (!STRIPE_PUBLISHABLE_KEY || !STRIPE_SECRET_KEY) {
      return new Response(
        JSON.stringify({ error: "Stripe not configured", requestId }),
        {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Mode-Konsistenz prüfen (test↔test, live↔live)
    const secretIsTest = STRIPE_SECRET_KEY.startsWith("sk_test_");
    const pkIsTest = STRIPE_PUBLISHABLE_KEY.startsWith("pk_test_");
    if (secretIsTest !== pkIsTest) {
      log("Key mode mismatch", { secretIsTest, pkIsTest, requestId });
      return new Response(
        JSON.stringify({
          error: "Stripe key mode mismatch (test/live)",
          requestId,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabaseAuth.auth.getUser(
      token,
    );
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const user = userData.user;

    // Body
    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({
          error: "Invalid request",
          details: parsed.error.flatten(),
          requestId,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
    const {
      taxYear,
      expressService,
      taxReturnId,
      taxFilerId,
      promoCodeId,
    } = parsed.data;
    let amount = parsed.data.amount;

    // Aktionswoche 11.05.–17.05.2026 (Europe/Zurich) — serverseitig erzwingen
    const PROMO_START_UTC = Date.UTC(2026, 4, 10, 22, 0, 0);
    const PROMO_END_UTC = Date.UTC(2026, 4, 17, 21, 59, 59);
    const now = Date.now();
    if (now >= PROMO_START_UTC && now <= PROMO_END_UTC) {
      const PROMO_BASE = 9900;
      const PROMO_EXPRESS = 2900;
      amount = PROMO_BASE + (expressService ? PROMO_EXPRESS : 0);
      log("Promo week enforced", { amount, expressService, requestId });
    } else {
      // SECURITY: Server-side Mindestpreis-Floor ausserhalb der Aktionswoche.
      // Echter Grundpreis 15000 (CHF 150) bzw. 25000 (inkl. Express).
      const MIN_BASE = 15000;
      const MIN_WITH_EXPRESS = MIN_BASE + 10000;
      const floor = expressService ? MIN_WITH_EXPRESS : MIN_BASE;
      if (amount < floor) {
        log("Price floor violated – rejecting", { sent: amount, floor, expressService, requestId });
        return new Response(
          JSON.stringify({ error: "Amount below allowed minimum", requestId }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    const supabaseService = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false } },
    );

    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: "2023-10-16",
    });

    // Promo-Code-Rabatt serverseitig auflösen (PaymentIntent kennt keine discounts)
    if (promoCodeId) {
      try {
        const promo = await stripe.promotionCodes.retrieve(promoCodeId);
        const coupon = promo?.coupon;
        if (coupon?.valid) {
          if (coupon.percent_off) {
            const discount = Math.round((amount * coupon.percent_off) / 100);
            amount = Math.max(50, amount - discount);
          } else if (coupon.amount_off) {
            amount = Math.max(50, amount - coupon.amount_off);
          }
          log("Promo applied", {
            promoCodeId,
            newAmount: amount,
            requestId,
          });
        }
      } catch (e) {
        log("Promo lookup failed (ignored)", {
          error: e instanceof Error ? e.message : String(e),
          requestId,
        });
      }
    }

    // Customer-Daten aus profiles + form_data laden (vereinfachte Variante von create-payment)
    let customerData: {
      first_name?: string | null;
      last_name?: string | null;
      address?: string | null;
      postal_code?: string | null;
      city?: string | null;
      phone?: string | null;
    } | null = null;

    try {
      const { data: profile } = await supabaseService
        .from("profiles")
        .select("first_name, last_name, address, phone")
        .eq("id", user.id)
        .maybeSingle();
      if (profile) customerData = profile as typeof customerData;

      if (!customerData?.address) {
        let q = supabaseService
          .from("form_data")
          .select("data, tax_filer_id")
          .eq("user_id", user.id)
          .eq("tax_year", taxYear)
          .eq("form_type", "contactInfo");
        if (taxFilerId) q = q.eq("tax_filer_id", taxFilerId);
        const { data: contacts } = await q;
        const contact = (contacts ?? []).find(
          (r: any) =>
            r?.data?.address && r?.data?.postalCode && r?.data?.city,
        )?.data ?? (contacts ?? [])[0]?.data;
        if (contact) {
          customerData = {
            first_name: customerData?.first_name ?? contact.firstName,
            last_name: customerData?.last_name ?? contact.lastName,
            address: customerData?.address ?? contact.address,
            postal_code: contact.postalCode,
            city: contact.city,
            phone: customerData?.phone ?? contact.phone ?? null,
          };
        }
      }
    } catch (e) {
      log("Customer data load failed (ignored)", {
        error: e instanceof Error ? e.message : String(e),
        requestId,
      });
    }

    // Stripe-Customer holen oder erstellen
    let customerId: string;
    const existing = await stripe.customers.list({
      email: user.email!,
      limit: 1,
    });
    if (existing.data.length > 0) {
      customerId = existing.data[0].id;
      if (customerData) {
        const upd: Stripe.CustomerUpdateParams = {};
        const name = `${customerData.first_name ?? ""} ${
          customerData.last_name ?? ""
        }`.trim();
        if (name) upd.name = name;
        if (customerData.phone) upd.phone = customerData.phone;
        if (customerData.address) {
          upd.address = {
            line1: customerData.address,
            postal_code: customerData.postal_code ?? undefined,
            city: customerData.city ?? undefined,
            country: "CH",
          };
        }
        if (Object.keys(upd).length > 0) {
          await stripe.customers.update(customerId, upd);
        }
      }
    } else {
      const create: Stripe.CustomerCreateParams = {
        email: user.email!,
        metadata: { userId: user.id, taxYear, source: "ditax-app-native" },
      };
      if (customerData) {
        const name = `${customerData.first_name ?? ""} ${
          customerData.last_name ?? ""
        }`.trim();
        if (name) create.name = name;
        if (customerData.phone) create.phone = customerData.phone;
        if (customerData.address) {
          create.address = {
            line1: customerData.address,
            postal_code: customerData.postal_code ?? undefined,
            city: customerData.city ?? undefined,
            country: "CH",
          };
        }
      }
      const created = await stripe.customers.create(create);
      customerId = created.id;
    }

    // Ephemeral Key für native SDK
    const ephemeralKey = await stripe.ephemeralKeys.create(
      { customer: customerId },
      { apiVersion: "2024-06-20" },
    );

    // PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "chf",
      customer: customerId,
      automatic_payment_methods: { enabled: true },
      metadata: {
        userId: user.id,
        taxYear,
        taxReturnId: taxReturnId ?? "",
        taxFilerId: taxFilerId ?? "",
        expressService: String(expressService),
        requestId,
        source: "despia-native",
      },
      description: `Steuererklärung ${taxYear}${
        expressService ? " (Express)" : ""
      }`,
    });

    // tax_returns updaten
    if (taxReturnId) {
      const { error: updErr } = await supabaseService
        .from("tax_returns")
        .update({
          payment_status: "pending",
          express_service: expressService,
          payment_intent_id: paymentIntent.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", taxReturnId);
      if (updErr) log("tax_returns update failed", { error: updErr.message });
    }

    return new Response(
      JSON.stringify({
        client_secret: paymentIntent.client_secret,
        publishable_key: STRIPE_PUBLISHABLE_KEY,
        customer_id: customerId,
        ephemeral_key_secret: ephemeralKey.secret,
        payment_intent_id: paymentIntent.id,
        amount,
        requestId,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("[create-payment-intent] Unhandled", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
        requestId,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
