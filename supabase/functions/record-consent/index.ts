import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type ConsentInput = {
  type: 'privacy' | 'terms' | 'marketing_emails';
  consented: boolean;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Verify JWT
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const consents: ConsentInput[] = Array.isArray(body?.consents) ? body.consents : [];
    const acceptedVia: string = typeof body?.accepted_via === 'string' ? body.accepted_via : 'onboarding_welcome';

    if (consents.length === 0) {
      return new Response(JSON.stringify({ error: 'No consents provided' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const validTypes = new Set(['privacy', 'terms', 'marketing_emails']);
    for (const c of consents) {
      if (!validTypes.has(c.type) || typeof c.consented !== 'boolean') {
        return new Response(JSON.stringify({ error: 'Invalid consent payload' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Forwarded IP (Cloudflare/Supabase edge)
    const ip =
      req.headers.get('cf-connecting-ip') ||
      req.headers.get('x-real-ip') ||
      (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() ||
      null;
    const userAgent = req.headers.get('user-agent') || null;

    const admin = createClient(supabaseUrl, serviceKey);

    // Load latest version per document type
    const { data: docs, error: docsErr } = await admin
      .from('legal_document_versions')
      .select('document_type, version, content_hash, published_url, effective_from')
      .in('document_type', ['privacy', 'terms'])
      .order('effective_from', { ascending: false });

    if (docsErr) throw docsErr;

    const latest: Record<string, any> = {};
    for (const d of docs ?? []) {
      if (!latest[d.document_type]) latest[d.document_type] = d;
    }

    const rows = consents.map((c) => {
      const doc = c.type === 'marketing_emails' ? null : latest[c.type];
      return {
        user_id: user.id,
        consent_type: c.type,
        consented: c.consented,
        consent_version: doc?.version ?? '1.0',
        document_hash: doc?.content_hash ?? null,
        document_url: doc?.published_url ?? null,
        ip_address: ip,
        user_agent: userAgent,
        accepted_via: acceptedVia,
      };
    });

    const { data: inserted, error: insertErr } = await admin
      .from('user_consents')
      .insert(rows)
      .select('id, consent_type');

    if (insertErr) throw insertErr;

    // Mirror to profiles for fast lookups
    const now = new Date().toISOString();
    const termsConsent = consents.find((c) => c.type === 'terms' && c.consented);
    const privacyConsent = consents.find((c) => c.type === 'privacy' && c.consented);
    const marketingConsent = consents.find((c) => c.type === 'marketing_emails');

    const profileUpdate: Record<string, any> = {};
    if (termsConsent || privacyConsent) {
      profileUpdate.terms_accepted_at = now;
      profileUpdate.terms_version = latest['terms']?.version ?? '1.0';
    }
    if (marketingConsent) {
      profileUpdate.marketing_consent_at = marketingConsent.consented ? now : null;
    }
    if (Object.keys(profileUpdate).length > 0) {
      await admin.from('profiles').update(profileUpdate).eq('id', user.id);
    }

    return new Response(JSON.stringify({ ok: true, recorded: inserted }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('record-consent error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
