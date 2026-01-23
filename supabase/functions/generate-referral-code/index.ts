import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const generateCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluding confusing characters
  let code = 'DITAX-';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing environment variables");
    }

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    
    // Verify JWT and get user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[REFERRAL] Generating code for user: ${user.id}`);

    // Check if user already has a referral code
    const { data: existingCode, error: fetchError } = await supabaseClient
      .from("referral_codes")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (fetchError) {
      console.error("[REFERRAL] Error fetching existing code:", fetchError);
      throw fetchError;
    }

    if (existingCode) {
      console.log(`[REFERRAL] User already has code: ${existingCode.code}`);
      return new Response(JSON.stringify({ 
        code: existingCode.code,
        successful_referrals: existingCode.successful_referrals,
        max_referrals: existingCode.max_referrals,
        is_active: existingCode.is_active
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate unique code with retry logic
    let code: string;
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      code = generateCode();
      
      // Check if code already exists
      const { data: codeExists } = await supabaseClient
        .from("referral_codes")
        .select("id")
        .eq("code", code)
        .maybeSingle();

      if (!codeExists) {
        break;
      }
      attempts++;
    }

    if (attempts >= maxAttempts) {
      throw new Error("Could not generate unique code");
    }

    // Insert new referral code
    const { data: newCode, error: insertError } = await supabaseClient
      .from("referral_codes")
      .insert({
        user_id: user.id,
        code: code!,
      })
      .select()
      .single();

    if (insertError) {
      console.error("[REFERRAL] Error inserting code:", insertError);
      throw insertError;
    }

    console.log(`[REFERRAL] Created new code: ${newCode.code}`);

    return new Response(JSON.stringify({
      code: newCode.code,
      successful_referrals: newCode.successful_referrals,
      max_referrals: newCode.max_referrals,
      is_active: newCode.is_active
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
