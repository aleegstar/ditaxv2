import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SignatureRequest {
  completedTaxReturnId: string;
  signatureName: string;
  authorizationText: string;
  authorizationAccepted: boolean;
}

async function createHash(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function createDocumentHash(pdfData: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', pdfData);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Nicht autorisiert' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // User client for authentication
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Service client for admin operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get current user
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Benutzer nicht gefunden' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body: SignatureRequest = await req.json();
    const { completedTaxReturnId, signatureName, authorizationText, authorizationAccepted } = body;

    if (!completedTaxReturnId || !signatureName || !authorizationText || !authorizationAccepted) {
      return new Response(
        JSON.stringify({ success: false, error: 'Fehlende Pflichtfelder' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the tax return belongs to the user and is not already signed
    const { data: taxReturn, error: taxReturnError } = await supabaseUser
      .from('completed_tax_returns')
      .select('*')
      .eq('id', completedTaxReturnId)
      .eq('user_id', user.id)
      .single();

    if (taxReturnError || !taxReturn) {
      return new Response(
        JSON.stringify({ success: false, error: 'Steuererklärung nicht gefunden' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (taxReturn.signature_status === 'signed') {
      return new Response(
        JSON.stringify({ success: false, error: 'Bereits signiert' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabaseUser
      .from('profiles')
      .select('first_name, last_name, email, date_of_birth')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ success: false, error: 'Profil nicht gefunden' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Download PDF and create document hash
    const { data: pdfData, error: downloadError } = await supabaseAdmin.storage
      .from('completed-tax-returns')
      .download(taxReturn.file_path);

    if (downloadError || !pdfData) {
      console.error('PDF download error:', downloadError);
      return new Response(
        JSON.stringify({ success: false, error: 'PDF konnte nicht geladen werden' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const pdfBuffer = await pdfData.arrayBuffer();
    const documentHash = await createDocumentHash(pdfBuffer);

    // Get client info
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                     req.headers.get('cf-connecting-ip') || 
                     'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    // Create signature payload
    const signaturePayload = {
      documentHash,
      signerName: signatureName,
      signerEmail: profile.email,
      signedAt: new Date().toISOString(),
      authorizationText,
      completedTaxReturnId
    };

    // Create signature hash
    const signatureHash = await createHash(JSON.stringify(signaturePayload));

    // Insert signature record
    const { data: signature, error: signatureError } = await supabaseAdmin
      .from('tax_return_signatures')
      .insert({
        completed_tax_return_id: completedTaxReturnId,
        user_id: user.id,
        tax_year: taxReturn.tax_year,
        document_hash: documentHash,
        signature_hash: signatureHash,
        signer_name: signatureName,
        signer_email: profile.email || '',
        signer_date_of_birth: profile.date_of_birth,
        ip_address: clientIp,
        user_agent: userAgent,
        authorization_text: authorizationText,
        authorization_accepted: true,
        status: 'signed'
      })
      .select()
      .single();

    if (signatureError) {
      console.error('Signature insert error:', signatureError);
      return new Response(
        JSON.stringify({ success: false, error: 'Signatur konnte nicht gespeichert werden' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update completed_tax_returns status
    const { error: updateError } = await supabaseAdmin
      .from('completed_tax_returns')
      .update({
        signature_status: 'signed',
        signed_at: new Date().toISOString()
      })
      .eq('id', completedTaxReturnId);

    if (updateError) {
      console.error('Tax return update error:', updateError);
      // Don't fail the request, signature was already saved
    }

    // Log security event
    await supabaseAdmin
      .from('security_audit_logs_immutable')
      .insert({
        user_id: user.id,
        action: 'tax_return_signed',
        resource: `completed_tax_return:${completedTaxReturnId}`,
        success: true,
        ip_address: clientIp,
        user_agent: userAgent,
        metadata: {
          tax_year: taxReturn.tax_year,
          document_hash: documentHash,
          signature_id: signature.id
        }
      });

    console.log('Signature created successfully:', {
      signatureId: signature.id,
      userId: user.id,
      taxYear: taxReturn.tax_year
    });

    return new Response(
      JSON.stringify({
        success: true,
        signatureId: signature.id,
        signedAt: signature.signed_at
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Signature error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Interner Serverfehler' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
