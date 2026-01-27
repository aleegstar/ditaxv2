import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InactiveUser {
  id: string;
  email: string;
  created_at: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting inactive user cleanup...');

    // Calculate the threshold dates
    // 7 days for normal inactive accounts
    const normalThresholdDate = new Date();
    normalThresholdDate.setDate(normalThresholdDate.getDate() - 7);
    
    // 24 hours for accounts without terms acceptance (likely wrong email entries)
    const fastThresholdDate = new Date();
    fastThresholdDate.setHours(fastThresholdDate.getHours() - 24);
    
    const normalThresholdISO = normalThresholdDate.toISOString();
    const fastThresholdISO = fastThresholdDate.toISOString();

    console.log(`Normal threshold (7 days): ${normalThresholdISO}`);
    console.log(`Fast threshold (24 hours): ${fastThresholdISO}`);

    // Query auth.users for inactive accounts
    // Note: We need to use the admin API to access auth.users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
      console.error('Error fetching users:', authError);
      throw authError;
    }

    console.log(`Total users in database: ${authUsers.users.length}`);

    // Filter users that meet our criteria
    const inactiveUsers: typeof authUsers.users = [];
    
    for (const user of authUsers.users) {
      const createdAt = new Date(user.created_at);
      const lastSignIn = user.last_sign_in_at ? new Date(user.last_sign_in_at) : null;
      
      // Skip if user has ever signed in
      if (lastSignIn !== null) continue;
      
      // Check profile for terms acceptance
      const { data: profile } = await supabase
        .from('profiles')
        .select('terms_accepted_at')
        .eq('id', user.id)
        .single();
      
      // Fast cleanup: 24 hours for accounts without terms acceptance
      if (!profile?.terms_accepted_at && createdAt < fastThresholdDate) {
        console.log(`Fast cleanup candidate: ${user.email} (no terms, >24h old)`);
        inactiveUsers.push(user);
        continue;
      }
      
      // Normal cleanup: 7 days for accounts that never signed in
      if (createdAt < normalThresholdDate) {
        console.log(`Normal cleanup candidate: ${user.email} (>7 days old, never signed in)`);
        inactiveUsers.push(user);
      }
    }

    console.log(`Found ${inactiveUsers.length} potentially inactive users`);

    const deletedUsers: string[] = [];
    const skippedUsers: string[] = [];

    // Check each user for data before deletion
    for (const user of inactiveUsers) {
      console.log(`Checking user ${user.email} (${user.id})`);

      // Check if user has any profile data (other than the basic profile)
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name, phone, address, admin_notes')
        .eq('id', user.id)
        .single();

      // Check if user has any meaningful data
      const hasData = profile && (
        (profile.first_name && profile.first_name.length > 0) ||
        (profile.last_name && profile.last_name.length > 0) ||
        (profile.phone && profile.phone.length > 0) ||
        (profile.address && profile.address.length > 0) ||
        (profile.admin_notes && profile.admin_notes.length > 0)
      );

      if (hasData) {
        console.log(`Skipping user ${user.email} - has profile data`);
        skippedUsers.push(user.id);
        continue;
      }

      // Check for uploaded documents
      const { data: documents } = await supabase
        .from('uploaded_documents')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      if (documents && documents.length > 0) {
        console.log(`Skipping user ${user.email} - has uploaded documents`);
        skippedUsers.push(user.id);
        continue;
      }

      // Check for tax returns
      const { data: taxReturns } = await supabase
        .from('tax_returns')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      if (taxReturns && taxReturns.length > 0) {
        console.log(`Skipping user ${user.email} - has tax returns`);
        skippedUsers.push(user.id);
        continue;
      }

      // Check for form data
      const { data: formData } = await supabase
        .from('form_data')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      if (formData && formData.length > 0) {
        console.log(`Skipping user ${user.email} - has form data`);
        skippedUsers.push(user.id);
        continue;
      }

      // User is safe to delete - has no data and never logged in
      console.log(`Deleting user ${user.email} (${user.id})`);

      // Log the deletion attempt
      await supabase.from('security_audit_logs').insert({
        action: 'user_cleanup_attempted',
        user_id: user.id,
        resource: 'auth.users',
        success: false, // Will update to true if successful
        metadata: {
          email: user.email,
          created_at: user.created_at,
          reason: 'inactive_account_cleanup',
          days_inactive: Math.floor((Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24))
        }
      });

      // Delete the user's profile first
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', user.id);

      if (profileError) {
        console.error(`Error deleting profile for ${user.email}:`, profileError);
        continue;
      }

      // Delete the user from auth
      const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);

      if (deleteError) {
        console.error(`Error deleting user ${user.email}:`, deleteError);
        
        // Log the failure
        await supabase.from('security_audit_logs').insert({
          action: 'user_cleanup_failed',
          user_id: user.id,
          resource: 'auth.users',
          success: false,
          error_message: deleteError.message,
          metadata: {
            email: user.email,
            reason: 'deletion_failed'
          }
        });
        continue;
      }

      // Log successful deletion
      await supabase.from('security_audit_logs').insert({
        action: 'user_cleanup_completed',
        user_id: user.id,
        resource: 'auth.users',
        success: true,
        metadata: {
          email: user.email,
          created_at: user.created_at,
          deleted_at: new Date().toISOString(),
          reason: 'inactive_account_cleanup'
        }
      });

      deletedUsers.push(user.id);
      console.log(`Successfully deleted user ${user.email}`);
    }

    const result = {
      success: true,
      summary: {
        total_users_checked: authUsers.users.length,
        inactive_users_found: inactiveUsers.length,
        users_deleted: deletedUsers.length,
        users_skipped: skippedUsers.length,
        normal_threshold_date: normalThresholdISO,
        fast_threshold_date: fastThresholdISO
      },
      deleted_user_ids: deletedUsers,
      skipped_user_ids: skippedUsers
    };

    console.log('Cleanup completed:', result.summary);

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in cleanup function:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
