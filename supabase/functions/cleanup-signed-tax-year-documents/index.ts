import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Löscht 30 Tage nach elektronischer Unterschrift alle hochgeladenen Belege
// (uploaded_documents + Storage-Dateien im Bucket `documents`) eines
// abgeschlossenen Steuerjahres. Die signierte Steuererklärung als PDF bleibt
// erhalten.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Cron-Secret Schutz (Function ist verify_jwt=false)
  const cronSecret = Deno.env.get('CRON_SECRET');
  const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // Eligible: signed >= 30 Tage her, noch nicht gelöscht
  const { data: returns, error: retErr } = await supabase
    .from('completed_tax_returns')
    .select('id, user_id, tax_filer_id, tax_year, signed_at')
    .lt('signed_at', cutoff)
    .is('documents_deleted_at', null)
    .not('signed_at', 'is', null);

  if (retErr) {
    console.error('Failed to fetch eligible returns', retErr);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let totalReturns = 0;
  let totalDocs = 0;
  let totalStorage = 0;
  const errors: Array<{ id: string; error: string }> = [];

  for (const r of returns ?? []) {
    try {
      // Alle Belege für (tax_filer_id, tax_year). Falls tax_filer_id null,
      // fallback auf (user_id, tax_year).
      let docsQuery = supabase
        .from('uploaded_documents')
        .select('id, file_path')
        .eq('tax_year', r.tax_year);
      if (r.tax_filer_id) {
        docsQuery = docsQuery.eq('tax_filer_id', r.tax_filer_id);
      } else {
        docsQuery = docsQuery.eq('user_id', r.user_id);
      }

      const { data: docs, error: docsErr } = await docsQuery;
      if (docsErr) throw docsErr;

      const paths = (docs ?? []).map((d) => d.file_path).filter(Boolean);
      const ids = (docs ?? []).map((d) => d.id);

      if (paths.length > 0) {
        // Batch-Delete im Storage (500er Chunks)
        for (let i = 0; i < paths.length; i += 500) {
          const chunk = paths.slice(i, i + 500);
          const { error: stErr } = await supabase.storage.from('documents').remove(chunk);
          if (stErr) {
            console.warn('Storage remove warning', r.id, stErr.message);
          } else {
            totalStorage += chunk.length;
          }
        }
      }

      if (ids.length > 0) {
        const { error: delErr } = await supabase
          .from('uploaded_documents')
          .delete()
          .in('id', ids);
        if (delErr) throw delErr;
        totalDocs += ids.length;
      }

      const { error: markErr } = await supabase
        .from('completed_tax_returns')
        .update({ documents_deleted_at: new Date().toISOString() })
        .eq('id', r.id);
      if (markErr) throw markErr;

      totalReturns += 1;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('Cleanup failed for return', r.id, msg);
      errors.push({ id: r.id, error: msg });
    }
  }

  const summary = {
    processed_returns: totalReturns,
    deleted_documents: totalDocs,
    deleted_storage_files: totalStorage,
    errors,
    executed_at: new Date().toISOString(),
  };
  console.log('cleanup-signed-tax-year-documents summary', summary);

  return new Response(JSON.stringify(summary), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
