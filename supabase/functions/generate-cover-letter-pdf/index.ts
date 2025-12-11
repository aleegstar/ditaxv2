import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import jsPDF from 'https://esm.sh/jspdf@2.5.1'
import { PDFDocument, rgb } from 'https://esm.sh/pdf-lib@1.17.1'
import JSZip from 'https://esm.sh/jszip@3.10.1'
import { z } from 'https://deno.land/x/zod@v3.23.8/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Input validation schema
const coverLetterRequestSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  userName: z.string().max(200).optional().nullable()
})

// Function to normalize German text for PDF compatibility
function normalizeGermanText(text: string): string {
  return text
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/Ä/g, 'Ae')
    .replace(/Ö/g, 'Oe')
    .replace(/Ü/g, 'Ue')
    .replace(/ß/g, 'ss');
}

// Function to replace placeholders in template with better fallback handling
function replacePlaceholders(text: string, data: Record<string, string>): string {
  let result = text;
  Object.entries(data).forEach(([key, value]) => {
    const placeholder = `{{${key}}}`;
    // Only replace if we have a meaningful value
    if (value && value.trim() && value !== 'null' && !value.includes('nicht hinterlegt')) {
      result = result.replace(new RegExp(placeholder, 'g'), value);
    } else {
      // For empty values, remove the placeholder completely or use context-appropriate defaults
      if (key === 'firstName' || key === 'lastName') {
        result = result.replace(new RegExp(placeholder, 'g'), '');
      } else if (key === 'name') {
        result = result.replace(new RegExp(placeholder, 'g'), '[Kunde/Kundin]');
      } else if (key === 'address') {
        result = result.replace(new RegExp(placeholder, 'g'), '[Adresse]');
      } else if (key === 'email') {
        result = result.replace(new RegExp(placeholder, 'g'), '[E-Mail]');
      } else {
        result = result.replace(new RegExp(placeholder, 'g'), '');
      }
    }
  });
  return result;
}

// Function to process DOCX template with placeholders
async function processDocxTemplate(templateBuffer: ArrayBuffer, data: Record<string, string>): Promise<{ buffer: ArrayBuffer; contentType: string }> {
  try {
    console.log('Processing DOCX template...');
    const zip = new JSZip();
    const zipContent = await zip.loadAsync(templateBuffer);
    
    // Read document.xml from the DOCX file
    const documentXml = await zipContent.file('word/document.xml')?.async('text');
    if (!documentXml) {
      throw new Error('Could not find document.xml in DOCX file');
    }
    
    // Replace placeholders in the XML content using improved logic
    let processedXml = documentXml;
    Object.entries(data).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      // Only replace if we have a meaningful value
      if (value && value.trim() && value !== 'null' && !value.includes('nicht hinterlegt')) {
        processedXml = processedXml.replace(new RegExp(placeholder, 'g'), value);
      } else {
        // For empty values, use context-appropriate defaults
        if (key === 'firstName' || key === 'lastName') {
          processedXml = processedXml.replace(new RegExp(placeholder, 'g'), '');
        } else if (key === 'name') {
          processedXml = processedXml.replace(new RegExp(placeholder, 'g'), '[Kunde/Kundin]');
        } else if (key === 'address') {
          processedXml = processedXml.replace(new RegExp(placeholder, 'g'), '[Adresse]');
        } else if (key === 'email') {
          processedXml = processedXml.replace(new RegExp(placeholder, 'g'), '[E-Mail]');
        } else {
          processedXml = processedXml.replace(new RegExp(placeholder, 'g'), '');
        }
      }
    });
    
    // Update the document.xml in the zip
    zipContent.file('word/document.xml', processedXml);
    
    // Generate the new DOCX file
    const newDocxBuffer = await zipContent.generateAsync({ type: 'arraybuffer' });
    
    console.log('DOCX template processed successfully');
    return {
      buffer: newDocxBuffer,
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    };
  } catch (error) {
    console.error('Error processing DOCX template:', error);
    throw error;
  }
}

// Function to process PDF template with placeholders
async function processPdfTemplate(templateBuffer: ArrayBuffer, data: Record<string, string>): Promise<{ buffer: ArrayBuffer; contentType: string }> {
  try {
    console.log('Processing PDF template...');
    const pdfDoc = await PDFDocument.load(templateBuffer);
    
    // Get form if it exists (for fillable PDFs)
    const form = pdfDoc.getForm();
    const fields = form.getFields();
    
    // Try to fill form fields first
    let fieldsFound = false;
    fields.forEach((field) => {
      const fieldName = field.getName();
      if (data[fieldName]) {
        try {
          if (field.constructor.name === 'PDFTextField') {
            (field as any).setText(data[fieldName]);
            fieldsFound = true;
          }
        } catch (error) {
          console.warn(`Could not fill field ${fieldName}:`, error);
        }
      }
    });
    
    // If no form fields were found, overlay text on the first page
    if (!fieldsFound) {
      console.log('No form fields found, overlaying text...');
      const pages = pdfDoc.getPages();
      const firstPage = pages[0];
      
      if (firstPage) {
        const { width, height } = firstPage.getSize();
        
        // Add text overlays at typical letter positions
        firstPage.drawText(data.date || '', {
          x: width - 150,
          y: height - 50,
          size: 10,
          color: rgb(0, 0, 0),
        });
        
        firstPage.drawText(data.name || '', {
          x: 50,
          y: height - 150,
          size: 12,
          color: rgb(0, 0, 0),
        });
        
        if (data.address) {
          firstPage.drawText(data.address, {
            x: 50,
            y: height - 170,
            size: 10,
            color: rgb(0, 0, 0),
          });
        }
        
        firstPage.drawText(data.salutation || '', {
          x: 50,
          y: height - 220,
          size: 11,
          color: rgb(0, 0, 0),
        });
      }
    }
    
    console.log('PDF template processed successfully');
    const pdfBytes = await pdfDoc.save();
    return {
      buffer: pdfBytes.slice().buffer,
      contentType: 'application/pdf'
    };
  } catch (error) {
    console.error('Error processing PDF template:', error);
    throw error;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    // Parse and validate request body
    const text = await req.text();
    
    if (!text || text.trim() === '') {
      console.error('Empty request body received');
      return new Response(
        JSON.stringify({ error: 'Request body is empty' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    let requestBody;
    try {
      requestBody = JSON.parse(text);
    } catch (parseError) {
      console.error('JSON parsing error:', parseError);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate with Zod schema
    let validatedData
    try {
      validatedData = coverLetterRequestSchema.parse(requestBody)
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        console.error('Validation error:', validationError.errors)
        return new Response(
          JSON.stringify({ 
            error: 'Invalid input', 
            details: validationError.errors 
          }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
      throw validationError
    }

    const { userId, userName } = validatedData;
    console.log('Validated request data:', { userId, userName });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Try to get active template first
    let templateBuffer: ArrayBuffer | null = null;
    let activeTemplate: any = null;
    
    try {
      const { data: template, error: templateError } = await supabase
        .from('document_templates')
        .select('*')
        .eq('template_type', 'cover_letter')
        .eq('is_active', true)
        .single();

      if (template && !templateError) {
        console.log('Found active template:', template.name, 'Type:', template.file_type, 'Path:', template.file_path);
        activeTemplate = template;
        
        const { data: templateData, error: downloadError } = await supabase.storage
          .from('document-templates')
          .download(template.file_path);

        if (templateData && !downloadError) {
          templateBuffer = await templateData.arrayBuffer();
          console.log('Template loaded successfully, size:', templateBuffer.byteLength);
        } else {
          console.warn('Could not download template from storage:', {
            error: downloadError,
            templatePath: template.file_path,
            templateId: template.id,
            templateName: template.name
          });
          console.warn('This indicates the template file is missing from storage bucket despite having a database record');
          
          // Fallback: Try to fetch template from public URLs
          console.log('Attempting fallback: fetching template from public URLs...');
          
          const fallbackUrls = [
            'https://preview--appditax.lovable.app/templates/begleitschreiben-template.docx',
            'https://preview--appditax.lovable.app/templates/default-cover-letter-template.docx'
          ];

          for (const url of fallbackUrls) {
            try {
              console.log(`Trying fallback URL: ${url}`);
              const response = await fetch(url);
              
              if (response.ok) {
                console.log(`Successfully fetched template from fallback URL: ${url}`);
                templateBuffer = await response.arrayBuffer();
                console.log('Fallback template loaded successfully, size:', templateBuffer.byteLength);
                break;
              } else {
                console.log(`Fallback URL failed with status ${response.status}: ${url}`);
              }
            } catch (fallbackError) {
              console.log(`Fallback URL error for ${url}:`, fallbackError);
            }
          }

          if (!templateBuffer) {
            console.log('All fallback attempts failed, will proceed with default PDF generation');
          }
        }
      } else {
        console.log('No active template found, using fallback');
      }
    } catch (error) {
      console.warn('Error loading template:', error);
    }

    // Fetch user profile data
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('first_name, last_name, address, email')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch user profile' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (!profile) {
      console.error('User profile not found for userId:', userId);
      return new Response(
        JSON.stringify({ error: 'User profile not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Retrieved profile data:', {
      first_name: profile.first_name,
      last_name: profile.last_name,
      email: profile.email,
      address: profile.address ? 'present' : 'null'
    });

    // Improved fallback values for missing profile data
    const hasValidName = (profile.first_name && profile.first_name.trim()) || (profile.last_name && profile.last_name.trim());
    const displayName = hasValidName ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : null;
    
    // Prepare template data - only use values if they are meaningful
    const currentDate = new Date().toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'long', 
      day: 'numeric'
    });

    const templateData: Record<string, string> = {
      name: displayName || '',
      firstName: profile.first_name?.trim() || '',
      lastName: profile.last_name?.trim() || '',
      address: profile.address?.trim() || '',
      email: profile.email?.trim() || '',
      date: normalizeGermanText(currentDate),
      taxYear: '2024',
      salutation: displayName ? `Sehr geehrte/r ${displayName}` : 'Sehr geehrte Damen und Herren'
    };

    console.log('Template data prepared:', {
      name: templateData.name ? 'present' : 'null',
      firstName: templateData.firstName ? 'present' : 'null',
      lastName: templateData.lastName ? 'present' : 'null',
      address: templateData.address ? 'present' : 'null',
      email: templateData.email ? 'present' : 'null',
      date: 'present'
    });

    let documentBuffer: ArrayBuffer | null = null;
    let contentType: string = 'application/pdf';
    let fileExtension: string = '.pdf';

    // If we have a template, process it
    if (templateBuffer && activeTemplate) {
      console.log('Processing custom template, type:', activeTemplate.file_type);
      
      try {
        // Check if it's a DOCX file
        if (activeTemplate.file_type.includes('wordprocessingml') || 
            activeTemplate.file_type.includes('word') || 
            activeTemplate.file_path.endsWith('.docx')) {
          console.log('Processing as DOCX template');
          const result = await processDocxTemplate(templateBuffer, templateData);
          documentBuffer = result.buffer;
          contentType = result.contentType;
          fileExtension = '.docx';
        } else {
          console.log('Processing as PDF template');
          const result = await processPdfTemplate(templateBuffer, templateData);
          documentBuffer = result.buffer;
          contentType = result.contentType;
          fileExtension = '.pdf';
        }
        console.log('Custom template processed successfully');
      } catch (error) {
        console.error('Error processing custom template, falling back to default:', error);
        // Fall back to default generation
        templateBuffer = null;
      }
    }

    // If no template or template processing failed, use default generation
    if (!templateBuffer || !documentBuffer) {
      console.log('Using default PDF generation');
      contentType = 'application/pdf';
      fileExtension = '.pdf';
      const doc = new jsPDF();
    
    // Helper function to safely add text to PDF
    function addTextToPdf(text: string, x: number, y: number, options: any = {}) {
      try {
        doc.text(text, x, y, options);
      } catch (error) {
        // Fallback to normalized text if UTF-8 encoding fails
        const normalizedText = normalizeGermanText(text);
        doc.text(normalizedText, x, y, options);
      }
    }

    // Set font
    doc.setFont('helvetica');

    // Header - Company Info
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    addTextToPdf('DITAX Steuerberatung', 20, 20);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    addTextToPdf('Steuerberatungsgesellschaft mbH', 20, 28);
    addTextToPdf('Musterstrasse 123', 20, 36);
    addTextToPdf('12345 Musterstadt', 20, 44);
    addTextToPdf('Tel: +49 (0) 123 456789', 20, 52);
    addTextToPdf('E-Mail: info@ditax.de', 20, 60);

    // Current date (top right)
    const currentDate = new Date().toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'long', 
      day: 'numeric'
    });
    
    doc.setFontSize(10);
    addTextToPdf(normalizeGermanText(currentDate), 150, 20);

    // Recipient address
    let yPos = 90;
    
    // Use templateData.name for consistency with template processing
    if (templateData.name) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      addTextToPdf(templateData.name, 20, yPos);
      yPos += 8;
    }

    // Show address if available
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    
    if (templateData.address) {
      // Split address into lines if it contains line breaks or is very long
      const addressLines = templateData.address.split('\n');
      for (const line of addressLines) {
        if (line.trim()) {
          addTextToPdf(line.trim(), 20, yPos);
          yPos += 6;
        }
      }
    } else {
      // Skip address if not available
      // addTextToPdf('[Adresse]', 20, yPos);
      // yPos += 6;
    }

    // Subject line
    yPos += 15;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    addTextToPdf('Betreff: Steuererklarung 2024', 20, yPos);

    // Salutation
    yPos += 20;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    
    // Use the prepared salutation from templateData
    addTextToPdf(normalizeGermanText(templateData.salutation), 20, yPos);

    // Main content
    yPos += 15;
    const content = [
      'anbei uebersenden wir Ihnen Ihre Steuererklarung fuer das Jahr 2024.',
      '',
      'Die Unterlagen wurden sorgfaeltig geprueft und entsprechend den',
      'aktuellen steuerrechtlichen Bestimmungen erstellt.',
      '',
      'Sollten Sie Fragen haben, stehen wir Ihnen gerne zur Verfuegung.',
      '',
      'Mit freundlichen Gruessen',
      '',
      '',
      'DITAX Steuerberatung',
      'Ihr Beratungsteam'
    ];

    content.forEach((line) => {
      if (line === '') {
        yPos += 6;
      } else {
        addTextToPdf(line, 20, yPos);
        yPos += 6;
      }
    });

      // Convert PDF to array buffer
      documentBuffer = doc.output('arraybuffer');
    }

    // Generate filename with better fallback handling
    const timestamp = new Date().toISOString().slice(0, 10);
    const sanitizedUserName = (userName || displayName || 'Benutzer')
      .replace(/[^a-zA-Z0-9äöüÄÖÜß]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
    const filename = `Begleitschreiben_${sanitizedUserName}_${timestamp}${fileExtension}`;
    
    console.log('Generated filename:', filename, 'Content-Type:', contentType);

    return new Response(documentBuffer!, {
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });

  } catch (error) {
    console.error('Error generating cover letter PDF:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});