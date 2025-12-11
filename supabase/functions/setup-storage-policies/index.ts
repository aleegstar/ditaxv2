
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Setting up storage policies for documents bucket...');

    // Create storage policies using the storage API
    const policies = [
      {
        name: 'Users can view their own files',
        definition: 'auth.uid()::text = (storage.foldername(name))[1]',
        operation: 'SELECT'
      },
      {
        name: 'Users can upload to their own folder', 
        definition: 'auth.uid()::text = (storage.foldername(name))[1]',
        operation: 'INSERT'
      },
      {
        name: 'Users can update their own files',
        definition: 'auth.uid()::text = (storage.foldername(name))[1]',
        operation: 'UPDATE'
      },
      {
        name: 'Users can delete their own files',
        definition: 'auth.uid()::text = (storage.foldername(name))[1]',
        operation: 'DELETE'
      }
    ];

    const results = [];
    for (const policy of policies) {
      try {
        // Use the REST API to create storage policies
        const response = await fetch(`${supabaseUrl}/rest/v1/storage/policies`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json',
            'apikey': supabaseServiceKey
          },
          body: JSON.stringify({
            bucket_id: 'documents',
            name: policy.name,
            definition: policy.definition,
            operation: policy.operation
          })
        });

        if (response.ok) {
          console.log(`✅ Created policy: ${policy.name}`);
          results.push({ policy: policy.name, status: 'success' });
        } else {
          const error = await response.text();
          console.error(`❌ Failed to create policy ${policy.name}:`, error);
          results.push({ policy: policy.name, status: 'error', error });
        }
      } catch (error) {
        console.error(`❌ Exception creating policy ${policy.name}:`, error);
        results.push({ policy: policy.name, status: 'error', error: (error as Error).message });
      }
    }

    return new Response(JSON.stringify({ 
      message: 'Storage policies setup completed',
      results 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error setting up storage policies:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to setup storage policies',
      details: (error as Error).message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
