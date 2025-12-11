import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
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
    console.log('Starting repair cover letter template process');

    // Initialize Supabase client with service role key
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get authenticated user
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('Authentication failed:', authError);
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Verify user is admin
    const { data: roles, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (roleError || !roles) {
      console.error('Admin verification failed:', roleError);
      return new Response(
        JSON.stringify({ error: 'Admin privileges required' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Admin user verified, proceeding with template repair');

    // Read the default template file from the public directory
    const templateUrl = 'https://preview--appditax.lovable.app/templates/begleitschreiben-template.docx';
    console.log('Fetching template from:', templateUrl);
    
    const templateResponse = await fetch(templateUrl);
    if (!templateResponse.ok) {
      throw new Error(`Failed to fetch template: ${templateResponse.status} ${templateResponse.statusText}`);
    }

    const templateBuffer = await templateResponse.arrayBuffer();
    console.log('Template fetched successfully, size:', templateBuffer.byteLength);

    // Upload to Supabase Storage
    const filePath = 'templates/begleitschreiben-template.docx';
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('document-templates')
      .upload(filePath, templateBuffer, {
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        upsert: true, // Overwrite if exists
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw uploadError;
    }

    console.log('Template uploaded successfully:', uploadData);

    // Check if database record exists
    const { data: existing, error: existingError } = await supabase
      .from('document_templates')
      .select('*')
      .eq('template_type', 'cover_letter')
      .eq('file_path', filePath)
      .maybeSingle();

    if (existingError && existingError.code !== 'PGRST116') {
      console.error('Error checking existing template:', existingError);
      throw existingError;
    }

    let templateId: string;

    if (!existing) {
      console.log('Creating new database record for template');
      // Create new database record
      const { data: inserted, error: insertError } = await supabase
        .from('document_templates')
        .insert({
          name: 'Standard Begleitschreiben Vorlage',
          file_path: filePath,
          file_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          template_type: 'cover_letter',
          uploaded_by: user.id,
          is_active: false,
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error inserting template record:', insertError);
        throw insertError;
      }

      templateId = inserted.id;
      console.log('New template record created with ID:', templateId);
    } else {
      templateId = existing.id;
      console.log('Using existing template record with ID:', templateId);
      
      // Update metadata
      const { error: updateError } = await supabase
        .from('document_templates')
        .update({ 
          file_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          updated_at: new Date().toISOString()
        })
        .eq('id', templateId);

      if (updateError) {
        console.error('Error updating template metadata:', updateError);
        throw updateError;
      }
    }

    // Deactivate all other cover_letter templates
    const { error: deactivateError } = await supabase
      .from('document_templates')
      .update({ is_active: false })
      .eq('template_type', 'cover_letter')
      .neq('id', templateId);

    if (deactivateError) {
      console.error('Error deactivating other templates:', deactivateError);
      throw deactivateError;
    }

    // Activate this template
    const { error: activateError } = await supabase
      .from('document_templates')
      .update({ is_active: true })
      .eq('id', templateId);

    if (activateError) {
      console.error('Error activating template:', activateError);
      throw activateError;
    }

    console.log('Template repair completed successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Template successfully repaired and activated',
        templateId 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in repair-cover-letter-template:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: (error as Error).message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});