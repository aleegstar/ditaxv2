import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const logStep = (step: string, details?: any) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [STRIPE-WEBHOOK] ${step}`, details ? JSON.stringify(details, null, 2) : '');
};

serve(async (req) => {
  const requestId = crypto.randomUUID().substring(0, 8);
  
  logStep("=== WEBHOOK RECEIVED ===", { 
    method: req.method,
    requestId,
    timestamp: new Date().toISOString()
  });

  try {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // Only accept POST requests
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get environment variables
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    const stripeWebhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!stripeSecretKey || !stripeWebhookSecret || !supabaseUrl || !supabaseServiceKey) {
      logStep("Missing environment variables", { requestId });
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Initialize Stripe
    const stripe = new Stripe(stripeSecretKey, { apiVersion: "2023-10-16" });

    // Get the signature from headers
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      logStep("No Stripe signature found", { requestId });
      return new Response(JSON.stringify({ error: "No signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get the raw body
    const body = await req.text();
    
    // Verify the webhook signature
    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, stripeWebhookSecret);
      logStep("Webhook signature verified", { eventId: event.id, eventType: event.type, requestId });
    } catch (err) {
      logStep("Webhook signature verification failed", { error: err instanceof Error ? err.message : 'Unknown error', requestId });
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Extract common data
    const eventData = event.data.object as any;
    const sessionId = eventData.id || null;
    const paymentIntentId = eventData.payment_intent || null;
    const customerId = eventData.customer || null;
    const metadata = eventData.metadata || {};
    
    logStep("Processing event", { 
      eventType: event.type, 
      sessionId, 
      paymentIntentId,
      metadata,
      requestId 
    });

    // Validate user_id against tax_return ownership for security
    let validatedUserId: string | null = null;
    let validatedTaxReturnId: string | null = metadata.taxReturnId || null;
    
    if (validatedTaxReturnId && metadata.userId) {
      // Verify that the claimed user_id actually owns the tax_return
      const { data: taxReturn, error: taxReturnError } = await supabase
        .from('tax_returns')
        .select('user_id')
        .eq('id', validatedTaxReturnId)
        .maybeSingle();
      
      if (taxReturnError) {
        logStep("Error validating tax_return ownership", { error: taxReturnError, requestId });
      } else if (taxReturn && taxReturn.user_id === metadata.userId) {
        // User ID matches tax_return owner - safe to use
        validatedUserId = metadata.userId;
        logStep("User ID validated against tax_return ownership", { 
          userId: validatedUserId, 
          taxReturnId: validatedTaxReturnId,
          requestId 
        });
      } else if (taxReturn) {
        // Mismatch detected - use tax_return's actual owner for security
        logStep("WARNING: Metadata userId mismatch with tax_return owner", { 
          claimedUserId: metadata.userId,
          actualOwnerId: taxReturn.user_id,
          taxReturnId: validatedTaxReturnId,
          requestId 
        });
        validatedUserId = taxReturn.user_id;
      }
    } else if (metadata.userId && !validatedTaxReturnId) {
      // No tax_return to validate against - only set user_id if we can verify it exists
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', metadata.userId)
        .maybeSingle();
      
      if (profile) {
        validatedUserId = metadata.userId;
        logStep("User ID validated via profile lookup", { userId: validatedUserId, requestId });
      } else {
        logStep("WARNING: Could not validate userId - profile not found", { 
          claimedUserId: metadata.userId, 
          requestId 
        });
      }
    }

    // Prepare payment event record with validated user_id
    const paymentEvent: any = {
      event_id: event.id,
      event_type: event.type,
      session_id: sessionId,
      payment_intent_id: paymentIntentId,
      customer_id: customerId,
      user_id: validatedUserId,
      tax_return_id: validatedTaxReturnId,
      raw_event: event,
      processed: false,
    };

    // Handle different event types
    switch (event.type) {
      case "checkout.session.completed": {
        const session = eventData as Stripe.Checkout.Session;
        paymentEvent.status = session.payment_status;
        paymentEvent.amount = session.amount_total;
        paymentEvent.currency = session.currency;
        paymentEvent.payment_method = session.payment_method_types?.[0];

        logStep("Checkout session completed", { 
          sessionId: session.id, 
          paymentStatus: session.payment_status,
          paymentIntentId: session.payment_intent,
          requestId 
        });

        // Update tax_returns if we have the ID
        if (metadata.taxReturnId) {
          const { error: updateError } = await supabase
            .from('tax_returns')
            .update({
              payment_status: session.payment_status === 'paid' ? 'paid' : 'pending',
              checkout_session_id: session.id,
              payment_intent_id: session.payment_intent as string,
              last_payment_event_at: new Date().toISOString(),
            })
            .eq('id', metadata.taxReturnId);

          if (updateError) {
            logStep("Error updating tax_returns", { error: updateError, requestId });
          } else {
            logStep("Tax return updated", { taxReturnId: metadata.taxReturnId, requestId });
          }
        }
        break;
      }

      case "checkout.session.expired": {
        const session = eventData as Stripe.Checkout.Session;
        paymentEvent.status = 'expired';
        paymentEvent.amount = session.amount_total;
        paymentEvent.currency = session.currency;

        logStep("Checkout session expired", { sessionId: session.id, requestId });

        // Update tax_returns
        if (metadata.taxReturnId) {
          await supabase
            .from('tax_returns')
            .update({
              payment_status: 'expired',
              last_payment_event_at: new Date().toISOString(),
            })
            .eq('id', metadata.taxReturnId);
        }
        break;
      }

      case "payment_intent.succeeded": {
        const paymentIntent = eventData as Stripe.PaymentIntent;
        paymentEvent.status = 'succeeded';
        paymentEvent.amount = paymentIntent.amount;
        paymentEvent.currency = paymentIntent.currency;
        paymentEvent.payment_method_type = paymentIntent.payment_method_types?.[0];

        logStep("Payment intent succeeded", { 
          paymentIntentId: paymentIntent.id,
          amount: paymentIntent.amount,
          requestId 
        });

        // Find and update tax_return by payment_intent_id
        const { data: taxReturns } = await supabase
          .from('tax_returns')
          .select('id')
          .eq('payment_intent_id', paymentIntent.id)
          .limit(1);

        if (taxReturns && taxReturns.length > 0) {
          await supabase
            .from('tax_returns')
            .update({
              payment_status: 'paid',
              last_payment_event_at: new Date().toISOString(),
            })
            .eq('id', taxReturns[0].id);

          logStep("Tax return marked as paid", { taxReturnId: taxReturns[0].id, requestId });
        }
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = eventData as Stripe.PaymentIntent;
        const lastError = paymentIntent.last_payment_error;
        
        paymentEvent.status = 'failed';
        paymentEvent.failure_code = lastError?.code || null;
        paymentEvent.failure_message = lastError?.message || 'Payment failed';
        paymentEvent.amount = paymentIntent.amount;
        paymentEvent.currency = paymentIntent.currency;
        paymentEvent.payment_method_type = paymentIntent.payment_method_types?.[0];

        logStep("Payment intent failed", { 
          paymentIntentId: paymentIntent.id,
          failureCode: lastError?.code,
          failureMessage: lastError?.message,
          requestId 
        });

        // Find and update tax_return
        const { data: taxReturns } = await supabase
          .from('tax_returns')
          .select('id')
          .eq('payment_intent_id', paymentIntent.id)
          .limit(1);

        if (taxReturns && taxReturns.length > 0) {
          await supabase
            .from('tax_returns')
            .update({
              payment_status: 'failed',
              payment_failure_code: lastError?.code || null,
              payment_failure_message: lastError?.message || 'Payment failed',
              last_payment_event_at: new Date().toISOString(),
            })
            .eq('id', taxReturns[0].id);

          logStep("Tax return marked as failed", { 
            taxReturnId: taxReturns[0].id,
            failureCode: lastError?.code,
            requestId 
          });
        }
        break;
      }

      default:
        logStep("Unhandled event type", { eventType: event.type, requestId });
    }

    // Store the event in payment_events table
    const { error: insertError } = await supabase
      .from('payment_events')
      .insert(paymentEvent);

    if (insertError) {
      logStep("Error storing payment event", { error: insertError, requestId });
    } else {
      logStep("Payment event stored", { eventId: event.id, requestId });
    }

    // Mark event as processed
    await supabase
      .from('payment_events')
      .update({ processed: true })
      .eq('event_id', event.id);

    return new Response(JSON.stringify({ received: true, eventId: event.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    logStep("Webhook processing error", { 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      requestId 
    });
    
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      requestId 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
