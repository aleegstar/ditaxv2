import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// German language model from tessdata_fast (~2MB)
const MODEL_URL = 'https://github.com/tesseract-ocr/tessdata_fast/raw/main/deu.traineddata';

// In-memory cache for the model (persists across function invocations within same instance)
let cachedModel: ArrayBuffer | null = null;
let cacheTime: number = 0;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // SECURITY: Require an authenticated Supabase user so anonymous callers cannot
  // abuse this endpoint to pull the 2 MB language model on repeat.
  try {
    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.57.2');
    const authClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace('Bearer ', '');
    const { data: claims, error: claimsError } = await authClient.auth.getClaims(token);
    if (claimsError || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (authErr) {
    console.error('[OCR-Model] Auth check failed', authErr);
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    console.log('[OCR-Model] Request for German language model');
    
    // Check if cached model is still valid
    const now = Date.now();
    if (cachedModel && (now - cacheTime) < CACHE_DURATION) {
      console.log(`[OCR-Model] Serving from cache (${(cachedModel.byteLength / 1024 / 1024).toFixed(2)} MB)`);
      return new Response(cachedModel, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/octet-stream',
          'Content-Length': cachedModel.byteLength.toString(),
          'Cache-Control': 'public, max-age=31536000, immutable', // 1 year browser cache
          'X-Cache': 'HIT'
        }
      });
    }

    // Fetch from GitHub
    console.log('[OCR-Model] Fetching from GitHub...');
    const startTime = Date.now();
    
    const response = await fetch(MODEL_URL, {
      headers: {
        'Accept': 'application/octet-stream'
      }
    });

    if (!response.ok) {
      throw new Error(`GitHub returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.arrayBuffer();
    const duration = Date.now() - startTime;
    
    console.log(`[OCR-Model] Downloaded ${(data.byteLength / 1024 / 1024).toFixed(2)} MB in ${duration}ms`);

    // Cache for subsequent requests
    cachedModel = data;
    cacheTime = now;

    return new Response(data, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/octet-stream',
        'Content-Length': data.byteLength.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable', // 1 year browser cache
        'X-Cache': 'MISS'
      }
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch language model';
    console.error('[OCR-Model] Error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  }
});
