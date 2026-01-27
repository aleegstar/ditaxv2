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

    const { email } = await req.json();

    if (!email || typeof email !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: 'Email is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`Checking unverified account for email: ${email}`);

    // Find user by email using admin API
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
      console.error('Error fetching users:', authError);
      throw authError;
    }

    // Find the user with this email
    const user = authUsers.users.find(u => u.email?.toLowerCase() === email.toLowerCase());

    if (!user) {
      console.log(`No user found with email: ${email}`);
      return new Response(
        JSON.stringify({ success: true, message: 'No account found', deleted: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log(`Found user ${user.id}, checking if eligible for cleanup...`);

    // Check if user has ever successfully signed in
    // If last_sign_in_at exists and is different from created_at, user has logged in
    const hasSignedIn = user.last_sign_in_at !== null;

    if (hasSignedIn) {
      console.log(`User ${user.email} has signed in before, skipping cleanup`);
      return new Response(
        JSON.stringify({ success: true, message: 'User has logged in before', deleted: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Check profile for terms acceptance
    const { data: profile } = await supabase
      .from('profiles')
      .select('terms_accepted_at, first_name, last_name, phone, address, admin_notes')
      .eq('id', user.id)
      .single();

    // If user has accepted terms, don't delete
    if (profile?.terms_accepted_at) {
      console.log(`User ${user.email} has accepted terms, skipping cleanup`);
      return new Response(
        JSON.stringify({ success: true, message: 'User has accepted terms', deleted: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Check if user has any meaningful profile data
    const hasProfileData = profile && (
      (profile.first_name && profile.first_name.length > 0) ||
      (profile.last_name && profile.last_name.length > 0) ||
      (profile.phone && profile.phone.length > 0) ||
      (profile.address && profile.address.length > 0) ||
      (profile.admin_notes && profile.admin_notes.length > 0)
    );

    if (hasProfileData) {
      console.log(`User ${user.email} has profile data, skipping cleanup`);
      return new Response(
        JSON.stringify({ success: true, message: 'User has profile data', deleted: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Check for any other user data
    const { data: documents } = await supabase
      .from('uploaded_documents')
      .select('id')
      .eq('user_id', user.id)
      .limit(1);

    if (documents && documents.length > 0) {
      console.log(`User ${user.email} has documents, skipping cleanup`);
      return new Response(
        JSON.stringify({ success: true, message: 'User has documents', deleted: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const { data: taxReturns } = await supabase
      .from('tax_returns')
      .select('id')
      .eq('user_id', user.id)
      .limit(1);

    if (taxReturns && taxReturns.length > 0) {
      console.log(`User ${user.email} has tax returns, skipping cleanup`);
      return new Response(
        JSON.stringify({ success: true, message: 'User has tax returns', deleted: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const { data: formData } = await supabase
      .from('form_data')
      .select('id')
      .eq('user_id', user.id)
      .limit(1);

    if (formData && formData.length > 0) {
      console.log(`User ${user.email} has form data, skipping cleanup`);
      return new Response(
        JSON.stringify({ success: true, message: 'User has form data', deleted: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // User is safe to delete - no data and never logged in
    console.log(`Deleting unverified account: ${user.email} (${user.id})`);

    // Log the deletion
    await supabase.from('security_audit_logs').insert({
      action: 'unverified_account_cleanup',
      user_id: user.id,
      resource: 'auth.users',
      success: true,
      metadata: {
        email: user.email,
        created_at: user.created_at,
        reason: 'email_change_cleanup',
        trigger: 'user_initiated'
      }
    });

    // Delete profile first
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', user.id);

    if (profileError) {
      console.error(`Error deleting profile for ${user.email}:`, profileError);
    }

    // Delete from auth
    const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);

    if (deleteError) {
      console.error(`Error deleting user ${user.email}:`, deleteError);
      throw deleteError;
    }

    console.log(`Successfully deleted unverified account: ${user.email}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Unverified account deleted',
        deleted: true,
        user_id: user.id 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Error in cleanup function:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
