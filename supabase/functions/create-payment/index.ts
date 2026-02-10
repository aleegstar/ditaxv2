
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from 'https://deno.land/x/zod@v3.23.8/mod.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-requested-with, cache-control, pragma, expires",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS, PUT, DELETE",
};

// Input validation schema
const paymentRequestSchema = z.object({
  taxYear: z.string().regex(/^20[2-3][4-9]$/, 'Invalid tax year'),
  amount: z.number().int().min(1).max(10000000),
  items: z.array(z.object({
    label: z.string().max(200),
    amount: z.number().int().min(1)
  })).optional().default([]),
  expressService: z.boolean().optional().default(false),
  taxReturnId: z.string().uuid().optional().nullable(),
  origin: z.string().url().optional().nullable(),
  paymentMethod: z.enum(['default', 'twint', 'card_only']).optional().default('default'),
  promoCodeId: z.string().optional().nullable() // Stripe promotion code ID for referral discounts
})

const logStep = (step: string, details?: any) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [CREATE-PAYMENT-V4] ${step}`, details ? JSON.stringify(details, null, 2) : '');
};

serve(async (req) => {
  const requestId = crypto.randomUUID().substring(0, 8);
  const url = new URL(req.url);
  
  logStep("=== PAYMENT FUNCTION START ===", { 
    method: req.method,
    url: url.pathname,
    headers: Object.fromEntries(req.headers.entries()),
    requestId,
    timestamp: new Date().toISOString()
  });

  try {
    // Handle CORS preflight requests
    if (req.method === "OPTIONS") {
      logStep("CORS preflight handled", { requestId });
      return new Response(null, { 
        headers: corsHeaders,
        status: 200 
      });
    }

    // Health check - NO AUTH REQUIRED (minimal info for security)
    if (req.method === "GET") {
      // Log detailed info server-side only for debugging
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");

      const allConfigured = !!(supabaseUrl && supabaseAnonKey && supabaseServiceKey && stripeSecretKey);

      // Log detailed diagnostics server-side only (not exposed to client)
      console.log(`[${new Date().toISOString()}] [HEALTH-CHECK] Request ${requestId}`, {
        allConfigured,
        supabaseUrl: !!supabaseUrl,
        supabaseAnonKey: !!supabaseAnonKey,
        supabaseServiceKey: !!supabaseServiceKey,
        stripeSecretKey: !!stripeSecretKey
      });

      // Return minimal health response - no sensitive info exposed
      const healthResponse = { 
        healthy: allConfigured,
        timestamp: new Date().toISOString()
      };
      
      return new Response(JSON.stringify(healthResponse), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: allConfigured ? 200 : 503
      });
    }

    // Payment processing - AUTH REQUIRED
    if (req.method === "POST") {
      logStep("POST request received", { 
        contentType: req.headers.get("content-type"),
        authorization: req.headers.get("authorization")?.substring(0, 20) + "...",
        origin: req.headers.get("origin"),
        requestId 
      });

      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");

      logStep("Environment check", {
        supabaseUrl: !!supabaseUrl,
        supabaseAnonKey: !!supabaseAnonKey,
        supabaseServiceKey: !!supabaseServiceKey,
        stripeSecretKey: !!stripeSecretKey,
        requestId
      });

      if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey || !stripeSecretKey) {
        const missing = [];
        if (!supabaseUrl) missing.push("SUPABASE_URL");
        if (!supabaseAnonKey) missing.push("SUPABASE_ANON_KEY");
        if (!supabaseServiceKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");
        if (!stripeSecretKey) missing.push("STRIPE_SECRET_KEY");
        
        logStep("Missing environment variables", { missing, requestId });
        return new Response(JSON.stringify({ 
          error: `Missing environment variables: ${missing.join(', ')}`,
          requestId 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        });
      }

      const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
      const supabaseService = createClient(supabaseUrl, supabaseServiceKey, { 
        auth: { persistSession: false } 
      });

      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        logStep("No authorization header", { requestId });
        return new Response(JSON.stringify({ 
          error: "No authorization header - please log in first",
          requestId 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        });
      }

      const token = authHeader.replace("Bearer ", "");
      const { data, error: authError } = await supabaseClient.auth.getUser(token);
      
      if (authError || !data?.user) {
        logStep("Authentication failed", { authError: authError?.message, requestId });
        return new Response(JSON.stringify({ 
          error: `Authentication failed: ${authError?.message || 'No user found'}`,
          requestId 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        });
      }

      const user = data.user;
      logStep("User authenticated", { userId: user.id, email: user.email?.substring(0, 3) + "***", requestId });

      let requestBody;
      try {
        const body = await req.text();
        logStep("Raw body received", { bodyLength: body.length, bodyPreview: body.substring(0, 200), requestId });
        
        if (!body || body.length === 0) {
          logStep("Empty body detected", { requestId });
          return new Response(JSON.stringify({ 
            error: "Empty request body",
            requestId 
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          });
        }
        
        requestBody = JSON.parse(body);
        logStep("Body parsed successfully", { 
          keys: Object.keys(requestBody), 
          taxYear: requestBody.taxYear,
          amount: requestBody.amount,
          requestId 
        });
        
      } catch (parseError) {
        logStep("Body parse failed", { error: parseError instanceof Error ? parseError.message : 'Unknown error', requestId });
        return new Response(JSON.stringify({ 
          error: `Invalid JSON: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`,
          requestId 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }

      // Validate request body with Zod
      let validatedRequest
      try {
        validatedRequest = paymentRequestSchema.parse(requestBody)
      } catch (validationError) {
        if (validationError instanceof z.ZodError) {
          logStep("Validation failed", { errors: validationError.errors, requestId })
          return new Response(JSON.stringify({ 
            error: "Invalid request data",
            details: validationError.errors,
            requestId 
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          })
        }
        throw validationError
      }

      const { 
        taxYear, 
        amount, 
        items, 
        expressService, 
        taxReturnId, 
        origin: bodyOrigin, 
        paymentMethod,
        promoCodeId
      } = validatedRequest;
      
      // Check minimum amount for TWINT (CHF 5.00 = 500 cents)
      const TWINT_MIN_AMOUNT = 500;
      const isBelowTwintMin = amount < TWINT_MIN_AMOUNT;
      const recommendCard = isBelowTwintMin && paymentMethod !== 'card_only';
      
      if (isBelowTwintMin) {
        logStep("Amount below TWINT minimum", { 
          amount, 
          minimum: TWINT_MIN_AMOUNT, 
          recommendCard,
          requestId 
        });
      }
      
      // Origin whitelist for security
      const ALLOWED_ORIGINS = [
        'https://app.ditax.ch',
        'https://ditax.ch',
        'https://316cea7b-cd59-4e51-945e-829a5b4f8fa0.lovableproject.com'
      ];
      
      // Sanitize origin to ensure valid redirect URLs
      const sanitizeOrigin = (origin: string | null | undefined): string => {
        const fallbackUrl = 'https://app.ditax.ch';
        
        if (!origin) {
          logStep('No origin provided, using fallback', { fallbackUrl, requestId });
          return fallbackUrl;
        }
        
        // Check against whitelist
        const isAllowed = ALLOWED_ORIGINS.some(allowed => origin.startsWith(allowed));
        
        if (!isAllowed) {
          logStep('Origin not in whitelist, using fallback', { origin, fallbackUrl, requestId });
          return fallbackUrl;
        }
        
        return origin;
      };
      
      if (!taxYear) {
        return new Response(JSON.stringify({ 
          error: "Tax year is required",
          requestId 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }

      if (typeof amount !== 'number' || amount <= 0) {
        return new Response(JSON.stringify({ 
          error: "Invalid amount",
          requestId 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }

      // Load customer data from database for pre-filling
      logStep("Loading customer data from database", { userId: user.id, requestId });
      
      let customerData = null;
      try {
        // First try to get data from profiles table
        const { data: profileData, error: profileError } = await supabaseService
          .from('profiles')
          .select('first_name, last_name, address, phone')
          .eq('id', user.id)
          .single();

        if (profileError) {
          logStep("Profile data not found, trying form_data", { error: profileError.message, requestId });
        } else {
          customerData = profileData;
          logStep("Profile data loaded", { hasData: !!customerData, requestId });
        }

        // If no profile data or incomplete, try form_data
        if (!customerData || !customerData.first_name || !customerData.address) {
          const { data: formData, error: formError } = await supabaseService
            .from('form_data')
            .select('data')
            .eq('user_id', user.id)
            .eq('tax_year', taxYear)
            .eq('form_type', 'contactInfo')
            .single();

          if (!formError && formData?.data) {
            const contactInfo = formData.data as any;
            customerData = {
              first_name: customerData?.first_name || contactInfo.firstName,
              last_name: customerData?.last_name || contactInfo.lastName,
              address: customerData?.address || contactInfo.address,
              phone: customerData?.phone || contactInfo.phone || ''
            };
            logStep("Form data loaded and merged", { hasData: !!customerData, requestId });
          }
        }
      } catch (dataError) {
        logStep("Error loading customer data", { error: dataError instanceof Error ? dataError.message : 'Unknown error', requestId });
        // Continue without customer data
      }

      let stripe;
      try {
        stripe = new Stripe(stripeSecretKey, {
          apiVersion: "2023-10-16",
        });
        logStep("Stripe initialized", { 
          testMode: stripeSecretKey.startsWith('sk_test_'),
          requestId 
        });
      } catch (stripeInitError) {
        logStep("Stripe initialization failed", { error: stripeInitError instanceof Error ? stripeInitError.message : 'Unknown error', requestId });
        return new Response(JSON.stringify({ 
          error: `Stripe initialization failed: ${stripeInitError instanceof Error ? stripeInitError.message : 'Unknown error'}`,
          requestId 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        });
      }

      let customerId;
      try {
        const customers = await stripe.customers.list({ 
          email: user.email!, 
          limit: 1 
        });
        
        if (customers.data.length > 0) {
          customerId = customers.data[0].id;
          logStep("Existing customer found", { customerId, requestId });
          
          // Update existing customer with current data
          if (customerData) {
            const updateData: any = {};
            if (customerData.first_name || customerData.last_name) {
              updateData.name = `${customerData.first_name || ''} ${customerData.last_name || ''}`.trim();
            }
            if (customerData.phone) {
              updateData.phone = customerData.phone;
            }
            if (customerData.address) {
              updateData.address = {
                line1: customerData.address,
                country: 'CH'
              };
            }
            
            if (Object.keys(updateData).length > 0) {
              await stripe.customers.update(customerId, updateData);
              logStep("Customer updated with current data", { updateData, requestId });
            }
          }
        } else {
          const newCustomerData: any = {
            email: user.email!,
            metadata: { 
              userId: user.id, 
              taxYear,
              source: 'ditax-app'
            }
          };
          
          // Add customer data if available
          if (customerData) {
            if (customerData.first_name || customerData.last_name) {
              newCustomerData.name = `${customerData.first_name || ''} ${customerData.last_name || ''}`.trim();
            }
            if (customerData.phone) {
              newCustomerData.phone = customerData.phone;
            }
            if (customerData.address) {
              newCustomerData.address = {
                line1: customerData.address,
                country: 'CH'
              };
            }
          }
          
          const newCustomer = await stripe.customers.create(newCustomerData);
          customerId = newCustomer.id;
          logStep("New customer created with data", { customerId, hasCustomerData: !!customerData, requestId });
        }
      } catch (customerError) {
        logStep("Customer operation failed", { error: customerError instanceof Error ? customerError.message : 'Unknown error', requestId });
        return new Response(JSON.stringify({ 
          error: `Customer operation failed: ${customerError instanceof Error ? customerError.message : 'Unknown error'}`,
          requestId 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        });
      }

      const line_items = items.length > 0 ? items.map((item: any) => ({
        price_data: {
          currency: "chf",
          product_data: { name: item.label || 'Service' },
          unit_amount: item.amount || amount,
        },
        quantity: 1,
      })) : [{
        price_data: {
          currency: "chf",
          product_data: { 
            name: `Steuererklärung ${taxYear}`,
            description: "Erstellung und Einreichung Ihrer Steuererklärung"
          },
          unit_amount: amount,
        },
        quantity: 1,
      }];

      // Create checkout session with pre-filled customer data
      try {
        const headerOrigin = req.headers.get("origin");
        const appOrigin = sanitizeOrigin(bodyOrigin || headerOrigin);
        
        logStep("Creating checkout session with pre-filled data", { 
          origin: appOrigin,
          wasBodyOrigin: !!bodyOrigin,
          wasHeaderOrigin: !!headerOrigin,
          usedFallback: appOrigin === (Deno.env.get('APP_PUBLIC_URL') || 'https://app.ditax.ch'),
          customerId, 
          lineItems: line_items.length,
          taxYear,
          hasCustomerData: !!customerData,
          requestId 
        });
        
        // Always load all payment methods - let Stripe handle the selection UI
        const paymentMethodTypes = ["card", "twint"];
        
        logStep("Payment methods configured - all methods enabled", { 
          paymentMethodTypes,
          requestId 
        });
        
        const sessionData: any = {
          customer: customerId,
          payment_method_types: paymentMethodTypes,
          line_items,
          mode: "payment",
          success_url: `${appOrigin}/payment-success?session_id={CHECKOUT_SESSION_ID}&tax_year=${taxYear}${taxReturnId ? `&tax_return_id=${taxReturnId}` : ''}`,
          cancel_url: `${appOrigin}/form?year=${taxYear}`,
          locale: "de",
          client_reference_id: taxReturnId || `${user.id}-${taxYear}`,
          payment_intent_data: {
            metadata: {
              userId: user.id,
              taxYear,
              taxReturnId: taxReturnId || '',
              requestId,
              expressService: expressService.toString()
            }
          },
          metadata: {
            userId: user.id,
            taxYear,
            expressService: expressService.toString(),
            taxReturnId: taxReturnId || '',
            requestId
          },
          customer_update: {
            name: 'auto',
            address: 'auto',
            shipping: 'never'
          },
          allow_promotion_codes: !promoCodeId, // Disable manual entry if we have a promo code
          phone_number_collection: {
            enabled: true,
          },
          ...(promoCodeId && { discounts: [{ promotion_code: promoCodeId }] }), // Auto-apply promo code
        };

        // Configure billing address collection based on available data
        if (customerData?.address) {
          // If we have address data, make it auto-filled but allow updates
          sessionData.billing_address_collection = 'auto';
          logStep("Billing address collection set to 'auto' - address will be pre-filled", { requestId });
        } else {
          // If no address data, require it
          sessionData.billing_address_collection = 'required';
          logStep("Billing address collection set to 'required' - no existing address", { requestId });
        }

        const session = await stripe.checkout.sessions.create(sessionData);

        logStep("Checkout session created with pre-filled customer data", { 
          sessionId: session.id, 
          sessionUrl: !!session.url,
          successUrl: session.success_url,
          paymentMethods: sessionData.payment_method_types,
          locale: "de",
          customerPrefilled: !!customerData,
          paymentMethod: paymentMethod || 'default',
          requestId 
        });

        // Update tax return record with session ID using direct UPDATE
        try {
          if (taxReturnId) {
            const { error: updateError } = await supabaseService
              .from('tax_returns')
              .update({
                payment_status: 'pending',
                express_service: expressService,
                checkout_session_id: session.id,
                updated_at: new Date().toISOString()
              })
              .eq('id', taxReturnId);
            
            if (updateError) {
              logStep("Tax return update by ID failed", { error: updateError.message, taxReturnId, requestId });
            } else {
              logStep("Tax return record updated with session ID", { sessionId: session.id, taxReturnId, requestId });
            }
          } else {
            logStep("No taxReturnId provided, skipping DB update", { requestId });
          }
        } catch (dbError) {
          logStep("Database update failed", { error: dbError instanceof Error ? dbError.message : 'Unknown error', requestId });
          // Continue anyway
        }

        const response = { 
          url: session.url,
          sessionId: session.id,
          testMode: stripeSecretKey.startsWith('sk_test_'),
          paymentMethods: sessionData.payment_method_types,
          customerPrefilled: !!customerData,
          paymentMethod: paymentMethod || 'default',
          requestId,
          success: true
        };
        
        logStep("=== PAYMENT SUCCESS WITH CUSTOMER PREFILL ===", { 
          requestId, 
          sessionUrl: !!session.url, 
          sessionId: session.id,
          customerPrefilled: !!customerData,
          chosenPaymentMethod: paymentMethod || 'default',
          finalPaymentMethodTypes: paymentMethodTypes,
          recommendCard
        });
        
        return new Response(JSON.stringify({ 
          url: session.url,
          sessionId: session.id,
          requestId,
          recommendCard,
          paymentMethodTypes
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });

      } catch (sessionError) {
        logStep("Session creation failed", { 
          error: sessionError instanceof Error ? sessionError.message : 'Unknown error',
          stack: sessionError instanceof Error ? sessionError.stack : 'No stack trace',
          requestId 
        });
        return new Response(JSON.stringify({ 
          error: `Session creation failed: ${sessionError instanceof Error ? sessionError.message : 'Unknown error'}`,
          requestId 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        });
      }
    }

    // Method not allowed
    logStep("Method not allowed", { method: req.method, requestId });
    return new Response(JSON.stringify({ 
      error: "Method not allowed",
      allowed_methods: ["GET", "POST", "OPTIONS"],
      requestId 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 405,
    });

  } catch (error) {
    logStep("Unhandled error", { 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      requestId 
    });
    return new Response(JSON.stringify({ 
      error: `Unhandled error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      requestId,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
