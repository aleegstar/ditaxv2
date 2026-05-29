import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Limit payload size to prevent log flooding
const MAX_BODY_BYTES = 8 * 1024; // 8 KB
const MAX_FIELD_LEN = 500;

const truncate = (v: unknown): string => {
  if (v === null || v === undefined) return '';
  const s = typeof v === 'string' ? v : String(v);
  return s.slice(0, MAX_FIELD_LEN);
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(null, { status: 405, headers: corsHeaders });
  }

  try {
    // Enforce body size
    const contentLength = Number(req.headers.get('content-length') ?? '0');
    if (contentLength > MAX_BODY_BYTES) {
      return new Response(null, { status: 413, headers: corsHeaders });
    }

    const rawText = await req.text();
    if (rawText.length > MAX_BODY_BYTES) {
      return new Response(null, { status: 413, headers: corsHeaders });
    }

    let violation: any;
    try {
      violation = JSON.parse(rawText);
    } catch {
      return new Response(null, { status: 400, headers: corsHeaders });
    }

    const cspReport = violation?.['csp-report'] || violation || {};

    // Field allowlist + truncation (no attacker-controlled blob persisted)
    const blockedUri = truncate(cspReport['blocked-uri'] ?? cspReport.blockedURI ?? 'unknown');
    const violatedDirective = truncate(cspReport['violated-directive'] ?? cspReport.violatedDirective ?? 'unknown');
    const documentUri = truncate(cspReport['document-uri'] ?? cspReport.documentURI ?? 'unknown');
    const sourceFile = cspReport['source-file'] || cspReport.sourceFile ? truncate(cspReport['source-file'] ?? cspReport.sourceFile) : null;
    const lineNumber = Number.isFinite(Number(cspReport['line-number'] ?? cspReport.lineNumber))
      ? Number(cspReport['line-number'] ?? cspReport.lineNumber)
      : null;

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Write to mutable audit log only (immutable log must not accept unauthenticated input)
    const { error: logError } = await supabase
      .from('security_audit_logs')
      .insert({
        action: 'CSP_VIOLATION',
        resource: blockedUri,
        success: false,
        error_message: `CSP Directive Violated: ${violatedDirective}`,
        user_agent: truncate(req.headers.get('user-agent') ?? ''),
        ip_address: truncate(req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? ''),
        metadata: {
          violated_directive: violatedDirective,
          blocked_uri: blockedUri,
          document_uri: documentUri,
          source_file: sourceFile,
          line_number: lineNumber,
        },
      });

    if (logError) {
      console.error('Error logging CSP violation:', logError);
    }

    return new Response(null, { status: 204, headers: corsHeaders });
  } catch (error) {
    console.error('Error processing CSP report:', error);
    return new Response(null, { status: 204, headers: corsHeaders });
  }
});
