import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Read the template file from public directory
    const templatePath = '/opt/render/project/src/public/templates/begleitschreiben-template.docx'
    
    let templateFile: Uint8Array
    try {
      templateFile = await Deno.readFile('./public/templates/begleitschreiben-template.docx')
    } catch (e) {
      console.error('Could not read template file:', e)
      return new Response(
        JSON.stringify({ error: 'Template file not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Upload to storage
    const fileName = `cover_letter_template_${Date.now()}_begleitschreiben.docx`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('document-templates')
      .upload(fileName, templateFile, {
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return new Response(
        JSON.stringify({ error: 'Failed to upload template' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get current user (admin) 
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Deactivate existing templates
    await supabase
      .from('document_templates')
      .update({ is_active: false })
      .eq('template_type', 'cover_letter')

    // Insert template record
    const { data: templateData, error: templateError } = await supabase
      .from('document_templates')
      .insert({
        name: 'Begleitschreiben Steuererklärung Template',
        file_path: uploadData.path,
        file_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        template_type: 'cover_letter',
        uploaded_by: user.id,
        is_active: true
      })
      .select()
      .single()

    if (templateError) {
      console.error('Template insert error:', templateError)
      return new Response(
        JSON.stringify({ error: 'Failed to save template record' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Template uploaded and activated successfully',
        template: templateData 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})