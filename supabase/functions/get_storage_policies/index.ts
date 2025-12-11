
// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header found' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create a Supabase client with the user's JWT token
    const supabaseClient = createClient(
      // Supabase API URL - env var exposed by default.
      Deno.env.get('SUPABASE_URL') ?? '',
      // Supabase API ANON KEY - env var exposed by default.
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      // Create client with Auth context of the user that called the function.
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Get request body
    const { bucket_id } = await req.json();

    if (!bucket_id) {
      return new Response(
        JSON.stringify({ error: 'bucket_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // First, check if the bucket exists
    const { data: buckets, error: bucketError } = await supabaseClient
      .storage
      .listBuckets();
      
    if (bucketError) {
      return new Response(
        JSON.stringify({ error: `Error listing buckets: ${bucketError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const bucketExists = buckets.some(bucket => bucket.id === bucket_id);
    
    if (!bucketExists) {
      // Try to create the bucket if it doesn't exist
      const { data: newBucket, error: createError } = await supabaseClient
        .storage
        .createBucket(bucket_id, {
          public: false,
          fileSizeLimit: 10485760,
          allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf']
        });
        
      if (createError) {
        return new Response(
          JSON.stringify({ 
            error: `Bucket does not exist and could not be created: ${createError.message}` 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Get the user info to test permissions
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: `Could not get user info: ${userError?.message || 'User not found'}` }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Test storage permissions by attempting to upload a tiny test file
    const testFilePath = `${user.id}/test-file.txt`;
    const testFileContent = new Blob(['test']);
    
    const { data: uploadData, error: uploadError } = await supabaseClient
      .storage
      .from(bucket_id)
      .upload(testFilePath, testFileContent, { upsert: true });
    
    let canUpload = !uploadError;
    let uploadErrorMessage = uploadError ? uploadError.message : null;
    
    // Clean up the test file if it was successfully uploaded
    if (canUpload) {
      await supabaseClient
        .storage
        .from(bucket_id)
        .remove([testFilePath]);
    }
    
    // Attempt to list files in the bucket to check read permissions
    const { data: filesList, error: listError } = await supabaseClient
      .storage
      .from(bucket_id)
      .list(user.id);
      
    let canList = !listError;
    let listErrorMessage = listError ? listError.message : null;

    // Return comprehensive bucket info and permissions
    return new Response(
      JSON.stringify({
        bucket_id,
        exists: true,
        user: {
          id: user.id,
          email: user.email
        },
        permissions: {
          canUpload,
          uploadError: uploadErrorMessage,
          canList,
          listError: listErrorMessage
        },
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
})
