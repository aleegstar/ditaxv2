import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse CSP violation report
    const violation = await req.json();

    console.log('CSP Violation Report:', violation);

    // Extract relevant information from the violation
    const cspReport = violation['csp-report'] || violation;
    
    const blockedUri = cspReport['blocked-uri'] || cspReport.blockedURI || 'unknown';
    const violatedDirective = cspReport['violated-directive'] || cspReport.violatedDirective || 'unknown';
    const documentUri = cspReport['document-uri'] || cspReport.documentURI || 'unknown';
    const sourceFile = cspReport['source-file'] || cspReport.sourceFile || null;
    const lineNumber = cspReport['line-number'] || cspReport.lineNumber || null;

    // Log the CSP violation to security_audit_logs
    const { error: logError } = await supabase
      .from('security_audit_logs')
      .insert({
        action: 'CSP_VIOLATION',
        resource: blockedUri,
        success: false,
        error_message: `CSP Directive Violated: ${violatedDirective}`,
        user_agent: req.headers.get('user-agent'),
        ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
      });

    if (logError) {
      console.error('Error logging CSP violation:', logError);
    }

    // Also log to security_audit_logs_immutable for permanent record
    const { error: immutableLogError } = await supabase
      .from('security_audit_logs_immutable')
      .insert({
        action: 'CSP_VIOLATION',
        resource: blockedUri,
        success: false,
        error_message: `CSP Directive Violated: ${violatedDirective}`,
        user_agent: req.headers.get('user-agent'),
        ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
        metadata: {
          violated_directive: violatedDirective,
          blocked_uri: blockedUri,
          document_uri: documentUri,
          source_file: sourceFile,
          line_number: lineNumber,
          full_report: cspReport,
        },
      });

    if (immutableLogError) {
      console.error('Error logging CSP violation to immutable log:', immutableLogError);
    }

    // Return 204 No Content (standard for CSP reports)
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  } catch (error) {
    console.error('Error processing CSP report:', error);
    
    return new Response(
      JSON.stringify({ error: 'Failed to process CSP report' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
