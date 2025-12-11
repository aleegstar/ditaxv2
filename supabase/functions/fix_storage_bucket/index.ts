
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

    // Create a Supabase client with admin permissions
    const supabaseAdmin = createClient(
      // Supabase API URL - env var exposed by default.
      Deno.env.get('SUPABASE_URL') ?? '',
      // Service role key for admin operations
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      // Create client with Auth context of the user that called the function.
      {
        global: {
          headers: { Authorization: authHeader },
        },
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
    
    // Get user information
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser();
    
    if (userError) {
      console.error("User authentication error:", userError);
      return new Response(
        JSON.stringify({ error: `User authentication error: ${userError.message}` }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!user) {
      return new Response(
        JSON.stringify({ error: "No authenticated user found" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`User authenticated: ${user.id} (${user.email})`);
    
    // Check if the bucket exists
    let { data: buckets, error: bucketError } = await supabaseAdmin.storage.listBuckets();
    
    if (bucketError) {
      console.error("Error listing buckets:", bucketError);
      return new Response(
        JSON.stringify({ error: `Error listing buckets: ${bucketError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Find the documents bucket
    const docBucket = buckets?.find(b => b.id === 'documents');
    let bucketAction = '';
    
    if (!docBucket) {
      console.log("Documents bucket does not exist. Creating it...");
      
      try {
        // Try to create the bucket
        const { data, error } = await supabaseAdmin.storage.createBucket('documents', {
          public: false,
          fileSizeLimit: 20971520, // 20MB
          allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf']
        });
        
        if (error) throw error;
        
        bucketAction = 'New bucket created';
        console.log("Bucket successfully created");
      } catch (createError) {
        console.error("Error creating bucket:", createError);
        return new Response(
          JSON.stringify({ error: `Error creating bucket: ${createError instanceof Error ? createError.message : createError}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      console.log("Documents bucket already exists. Updating settings...");
      
      try {
        // Update existing bucket with appropriate settings
        const { data, error } = await supabaseAdmin.storage.updateBucket('documents', {
          public: false,
          fileSizeLimit: 20971520, // 20MB
          allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf']
        });
        
        if (error) throw error;
        
        bucketAction = 'Existing bucket updated';
        console.log("Bucket settings successfully updated");
      } catch (updateError) {
        console.error("Error updating bucket:", updateError);
        return new Response(
          JSON.stringify({ error: `Error updating bucket: ${updateError instanceof Error ? updateError.message : updateError}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    
    // Test upload file to verify permissions
    const testFilePath = `${user.id}/test-file.txt`;
    const testFileContent = new Blob(['test']);
    
    console.log(`Attempting to upload test file: ${testFilePath}`);
    
    let uploadStatus = 'Failed';
    let uploadError = null;
    let uploadErrorDetails = null;
    
    try {
      const { data: uploadData, error: uploadErr } = await supabaseAdmin.storage
        .from('documents')
        .upload(testFilePath, testFileContent, { upsert: true });
        
      if (uploadErr) {
        uploadError = uploadErr.message;
        uploadErrorDetails = JSON.stringify(uploadErr);
        console.error("Error uploading test file:", uploadErr);
      } else {
        uploadStatus = 'Success';
        console.log("Test file successfully uploaded");
        
        // Delete test file
        const { error: deleteError } = await supabaseAdmin.storage
          .from('documents')
          .remove([testFilePath]);
          
        if (deleteError) {
          console.warn("Could not delete test file:", deleteError);
        } else {
          console.log("Test file successfully deleted");
        }
      }
    } catch (e) {
      uploadError = e instanceof Error ? e.message : "Unknown error";
      uploadErrorDetails = JSON.stringify(e);
      console.error("Exception uploading test file:", e);
    }

    // Return detailed status information
    return new Response(
      JSON.stringify({
        status: uploadStatus === 'Success' ? 'success' : 'error',
        message: `Storage bucket check complete: ${bucketAction}`,
        bucket: {
          name: 'documents',
          action: bucketAction
        },
        user: {
          id: user.id,
          email: user.email
        },
        uploadTest: {
          status: uploadStatus,
          path: testFilePath,
          error: uploadError,
          errorDetails: uploadErrorDetails
        },
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in storage repair:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : "No stack trace available",
        details: JSON.stringify(error)
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
})
