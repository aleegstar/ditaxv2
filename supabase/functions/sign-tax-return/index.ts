import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { PDFDocument, rgb, StandardFonts } from 'https://esm.sh/pdf-lib@1.17.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SignatureRequest {
  completedTaxReturnId: string;
  signatureName: string;
  authorizationText: string;
  authorizationAccepted: boolean;
}

async function createHash(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function createDocumentHash(pdfData: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', pdfData);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function formatDate(date: Date): string {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${day}.${month}.${year}, ${hours}:${minutes} Uhr`;
}

function formatDateOnly(dateStr: string | null): string {
  if (!dateStr) return 'Nicht angegeben';
  const date = new Date(dateStr);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}

function truncateHash(hash: string, length: number = 32): string {
  if (hash.length <= length) return hash;
  return hash.substring(0, length) + '...';
}

async function addSignaturePage(
  pdfBuffer: ArrayBuffer,
  signatureData: {
    signerName: string;
    signerEmail: string;
    signerDateOfBirth: string | null;
    signedAt: Date;
    taxYear: string;
    documentHash: string;
    signatureHash: string;
    ipAddress: string;
    authorizationText: string;
    userAgent?: string;
  }
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  
  // Add a new A4 page at the end
  const signaturePage = pdfDoc.addPage([595.28, 841.89]);
  
  // Embed fonts
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  const pageWidth = signaturePage.getWidth();
  const pageHeight = signaturePage.getHeight();
  const margin = 50;
  let yPosition = pageHeight - 60;
  
  // Colors
  const darkGray = rgb(0.2, 0.2, 0.2);
  const mediumGray = rgb(0.45, 0.45, 0.45);
  const lightGray = rgb(0.65, 0.65, 0.65);
  const greenColor = rgb(0.133, 0.545, 0.133);
  const blueColor = rgb(0.2, 0.4, 0.8);
  const lightBlueBg = rgb(0.93, 0.96, 1);
  const lightGreenBg = rgb(0.93, 0.98, 0.93);
  const borderColor = rgb(0.85, 0.85, 0.85);
  
  // === DITAX HEADER ===
  signaturePage.drawText('DITAX', {
    x: margin,
    y: yPosition,
    font: helveticaBold,
    size: 28,
    color: darkGray,
  });
  
  yPosition -= 30;
  
  // Subtitle
  signaturePage.drawText('Elektronische Signatur', {
    x: margin,
    y: yPosition,
    font: helvetica,
    size: 12,
    color: mediumGray,
  });
  
  yPosition -= 40;
  
  // === DOCUMENT INFO ===
  signaturePage.drawText(`Steuererklaerung ${signatureData.taxYear}`, {
    x: margin,
    y: yPosition,
    font: helveticaBold,
    size: 16,
    color: darkGray,
  });
  
  yPosition -= 35;
  
  // === VISIBLE SIGNATURE BOX ===
  const signatureBoxHeight = 120;
  const signatureBoxY = yPosition - signatureBoxHeight;
  
  // Draw signature box with light blue background
  signaturePage.drawRectangle({
    x: margin,
    y: signatureBoxY,
    width: pageWidth - (2 * margin),
    height: signatureBoxHeight,
    color: lightBlueBg,
    borderColor: blueColor,
    borderWidth: 1.5,
  });
  
  // Signature label
  signaturePage.drawText('Unterschrift', {
    x: margin + 15,
    y: yPosition - 20,
    font: helvetica,
    size: 10,
    color: mediumGray,
  });
  
  // Draw the actual signature (name in handwriting-style large font)
  signaturePage.drawText(signatureData.signerName, {
    x: margin + 20,
    y: yPosition - 55,
    font: helveticaBold,
    size: 32,
    color: blueColor,
  });
  
  // Signature underline
  signaturePage.drawLine({
    start: { x: margin + 15, y: yPosition - 70 },
    end: { x: pageWidth - margin - 15, y: yPosition - 70 },
    thickness: 1,
    color: blueColor,
  });
  
  // Signed date below signature
  signaturePage.drawText(`Signiert am ${formatDate(signatureData.signedAt)}`, {
    x: margin + 15,
    y: yPosition - 90,
    font: helvetica,
    size: 10,
    color: mediumGray,
  });
  
  // Email on right side
  const emailText = signatureData.signerEmail;
  const emailWidth = helvetica.widthOfTextAtSize(emailText, 10);
  signaturePage.drawText(emailText, {
    x: pageWidth - margin - 15 - emailWidth,
    y: yPosition - 90,
    font: helvetica,
    size: 10,
    color: mediumGray,
  });
  
  yPosition = signatureBoxY - 30;
  
  // === ACTIVITY LOG (Breezedoc-style) ===
  signaturePage.drawText('Aktivitaetsprotokoll', {
    x: margin,
    y: yPosition,
    font: helveticaBold,
    size: 14,
    color: darkGray,
  });
  
  yPosition -= 25;
  
  // Activity table header
  const col1X = margin;
  const col2X = margin + 140;
  const col3X = margin + 280;
  
  signaturePage.drawText('Datum', {
    x: col1X,
    y: yPosition,
    font: helveticaBold,
    size: 9,
    color: mediumGray,
  });
  
  signaturePage.drawText('Ereignis / Empfaenger', {
    x: col2X,
    y: yPosition,
    font: helveticaBold,
    size: 9,
    color: mediumGray,
  });
  
  signaturePage.drawText('Metadaten', {
    x: col3X,
    y: yPosition,
    font: helveticaBold,
    size: 9,
    color: mediumGray,
  });
  
  yPosition -= 8;
  
  // Header underline
  signaturePage.drawLine({
    start: { x: margin, y: yPosition },
    end: { x: pageWidth - margin, y: yPosition },
    thickness: 0.5,
    color: borderColor,
  });
  
  yPosition -= 20;
  
  // Activity row 1: Created/Sent
  signaturePage.drawText(formatDate(signatureData.signedAt), {
    x: col1X,
    y: yPosition,
    font: helvetica,
    size: 9,
    color: darkGray,
  });
  
  // Badge: Signiert (green)
  const badgeWidth = 55;
  const badgeHeight = 16;
  signaturePage.drawRectangle({
    x: col2X,
    y: yPosition - 4,
    width: badgeWidth,
    height: badgeHeight,
    color: lightGreenBg,
    borderColor: greenColor,
    borderWidth: 0.5,
  });
  
  signaturePage.drawText('Signiert', {
    x: col2X + 8,
    y: yPosition + 1,
    font: helveticaBold,
    size: 9,
    color: greenColor,
  });
  
  yPosition -= 18;
  
  signaturePage.drawText(signatureData.signerEmail, {
    x: col2X,
    y: yPosition,
    font: helvetica,
    size: 9,
    color: darkGray,
  });
  
  // Metadata column
  const ipText = signatureData.ipAddress.length > 15 
    ? signatureData.ipAddress.substring(0, 12) + '.xxx' 
    : signatureData.ipAddress;
  signaturePage.drawText(ipText, {
    x: col3X,
    y: yPosition + 18,
    font: helvetica,
    size: 8,
    color: mediumGray,
  });
  
  // User agent (truncated)
  const userAgentText = signatureData.userAgent || 'Browser';
  const truncatedUA = userAgentText.length > 45 
    ? userAgentText.substring(0, 42) + '...' 
    : userAgentText;
  signaturePage.drawText(truncatedUA, {
    x: col3X,
    y: yPosition,
    font: helvetica,
    size: 7,
    color: lightGray,
  });
  
  yPosition -= 15;
  
  // Row separator
  signaturePage.drawLine({
    start: { x: margin, y: yPosition },
    end: { x: pageWidth - margin, y: yPosition },
    thickness: 0.5,
    color: borderColor,
  });
  
  yPosition -= 30;
  
  // === SIGNER DETAILS SECTION ===
  signaturePage.drawText('Unterzeichner-Details', {
    x: margin,
    y: yPosition,
    font: helveticaBold,
    size: 12,
    color: darkGray,
  });
  
  yPosition -= 20;
  
  const labelX = margin;
  const valueX = margin + 100;
  
  const signerDetails = [
    { label: 'Name:', value: signatureData.signerName },
    { label: 'E-Mail:', value: signatureData.signerEmail },
    { label: 'Geburtsdatum:', value: formatDateOnly(signatureData.signerDateOfBirth) },
    { label: 'IP-Adresse:', value: signatureData.ipAddress },
  ];
  
  for (const detail of signerDetails) {
    signaturePage.drawText(detail.label, {
      x: labelX,
      y: yPosition,
      font: helvetica,
      size: 10,
      color: mediumGray,
    });
    signaturePage.drawText(detail.value, {
      x: valueX,
      y: yPosition,
      font: helveticaBold,
      size: 10,
      color: darkGray,
    });
    yPosition -= 16;
  }
  
  yPosition -= 20;
  
  // === VERIFICATION HASHES ===
  signaturePage.drawText('Verifizierungs-Hashes', {
    x: margin,
    y: yPosition,
    font: helveticaBold,
    size: 12,
    color: darkGray,
  });
  
  yPosition -= 18;
  
  signaturePage.drawText('Dokument-Hash (SHA-256):', {
    x: labelX,
    y: yPosition,
    font: helvetica,
    size: 9,
    color: mediumGray,
  });
  
  yPosition -= 12;
  
  signaturePage.drawText(signatureData.documentHash, {
    x: labelX,
    y: yPosition,
    font: helvetica,
    size: 7,
    color: lightGray,
  });
  
  yPosition -= 18;
  
  signaturePage.drawText('Signatur-Hash (SHA-256):', {
    x: labelX,
    y: yPosition,
    font: helvetica,
    size: 9,
    color: mediumGray,
  });
  
  yPosition -= 12;
  
  signaturePage.drawText(signatureData.signatureHash, {
    x: labelX,
    y: yPosition,
    font: helvetica,
    size: 7,
    color: lightGray,
  });
  
  yPosition -= 25;
  
  // === AUTHORIZATION TEXT ===
  signaturePage.drawText('Vollmacht & Autorisierung', {
    x: margin,
    y: yPosition,
    font: helveticaBold,
    size: 12,
    color: darkGray,
  });
  
  yPosition -= 15;
  
  // Word wrap the authorization text
  const maxLineWidth = pageWidth - (2 * margin);
  const authLines = wrapText(signatureData.authorizationText, helvetica, 9, maxLineWidth);
  
  for (const line of authLines) {
    if (yPosition < 80) break;
    signaturePage.drawText(line, {
      x: margin,
      y: yPosition,
      font: helvetica,
      size: 9,
      color: mediumGray,
    });
    yPosition -= 12;
  }
  
  // === FOOTER ===
  const footerY = 40;
  
  signaturePage.drawLine({
    start: { x: margin, y: footerY + 15 },
    end: { x: pageWidth - margin, y: footerY + 15 },
    thickness: 0.5,
    color: borderColor,
  });
  
  const disclaimer = 'Diese elektronische Signatur ist rechtlich bindend gemaess Art. 14 Abs. 2bis OR.';
  signaturePage.drawText(disclaimer, {
    x: margin,
    y: footerY,
    font: helvetica,
    size: 8,
    color: lightGray,
  });
  
  // DITAX seal on right
  const sealText = 'DITAX SIGNIERT';
  const sealWidth = helveticaBold.widthOfTextAtSize(sealText, 10);
  signaturePage.drawText(sealText, {
    x: pageWidth - margin - sealWidth,
    y: footerY,
    font: helveticaBold,
    size: 10,
    color: greenColor,
  });
  
  return await pdfDoc.save();
}

// Helper function to wrap text
function wrapText(text: string, font: any, fontSize: number, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';
  
  // Approximate character width (for Helvetica)
  const avgCharWidth = fontSize * 0.5;
  const maxCharsPerLine = Math.floor(maxWidth / avgCharWidth);
  
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    
    if (testLine.length > maxCharsPerLine) {
      if (currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        lines.push(word);
        currentLine = '';
      }
    } else {
      currentLine = testLine;
    }
  }
  
  if (currentLine) {
    lines.push(currentLine);
  }
  
  return lines;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Nicht autorisiert' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // User client for authentication
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Service client for admin operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get current user
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Benutzer nicht gefunden' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body: SignatureRequest = await req.json();
    const { completedTaxReturnId, signatureName, authorizationText, authorizationAccepted } = body;

    if (!completedTaxReturnId || !signatureName || !authorizationText || !authorizationAccepted) {
      return new Response(
        JSON.stringify({ success: false, error: 'Fehlende Pflichtfelder' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the tax return belongs to the user and is not already signed
    const { data: taxReturn, error: taxReturnError } = await supabaseUser
      .from('completed_tax_returns')
      .select('*')
      .eq('id', completedTaxReturnId)
      .eq('user_id', user.id)
      .single();

    if (taxReturnError || !taxReturn) {
      return new Response(
        JSON.stringify({ success: false, error: 'Steuererklärung nicht gefunden' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (taxReturn.signature_status === 'signed') {
      return new Response(
        JSON.stringify({ success: false, error: 'Bereits signiert' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabaseUser
      .from('profiles')
      .select('first_name, last_name, email, date_of_birth')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ success: false, error: 'Profil nicht gefunden' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Download PDF and create document hash
    const { data: pdfData, error: downloadError } = await supabaseAdmin.storage
      .from('completed-tax-returns')
      .download(taxReturn.file_path);

    if (downloadError || !pdfData) {
      console.error('PDF download error:', downloadError);
      return new Response(
        JSON.stringify({ success: false, error: 'PDF konnte nicht geladen werden' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const pdfBuffer = await pdfData.arrayBuffer();
    const documentHash = await createDocumentHash(pdfBuffer);

    // Get client info
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                     req.headers.get('cf-connecting-ip') || 
                     'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';
    const signedAt = new Date();

    // Create signature payload
    const signaturePayload = {
      documentHash,
      signerName: signatureName,
      signerEmail: profile.email,
      signedAt: signedAt.toISOString(),
      authorizationText,
      completedTaxReturnId
    };

    // Create signature hash
    const signatureHash = await createHash(JSON.stringify(signaturePayload));

    // Insert signature record
    const { data: signature, error: signatureError } = await supabaseAdmin
      .from('tax_return_signatures')
      .insert({
        completed_tax_return_id: completedTaxReturnId,
        user_id: user.id,
        tax_year: taxReturn.tax_year,
        document_hash: documentHash,
        signature_hash: signatureHash,
        signer_name: signatureName,
        signer_email: profile.email || '',
        signer_date_of_birth: profile.date_of_birth,
        ip_address: clientIp,
        user_agent: userAgent,
        authorization_text: authorizationText,
        authorization_accepted: true,
        status: 'signed'
      })
      .select()
      .single();

    if (signatureError) {
      console.error('Signature insert error:', signatureError);
      return new Response(
        JSON.stringify({ success: false, error: 'Signatur konnte nicht gespeichert werden' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // === ADD SIGNATURE PAGE TO PDF ===
    let signedPdfPath = taxReturn.file_path;
    try {
      console.log('Adding signature page to PDF...');
      
      const signedPdfBytes = await addSignaturePage(pdfBuffer, {
        signerName: signatureName,
        signerEmail: profile.email || '',
        signerDateOfBirth: profile.date_of_birth,
        signedAt,
        taxYear: taxReturn.tax_year,
        documentHash,
        signatureHash,
        ipAddress: clientIp,
        authorizationText,
        userAgent
      });
      
      // Create signed PDF path (add _signed suffix before extension)
      const pathParts = taxReturn.file_path.split('.');
      const extension = pathParts.pop();
      signedPdfPath = `${pathParts.join('.')}_signed.${extension}`;
      
      // Upload signed PDF
      const { error: uploadError } = await supabaseAdmin.storage
        .from('completed-tax-returns')
        .upload(signedPdfPath, signedPdfBytes, {
          contentType: 'application/pdf',
          upsert: true
        });
      
      if (uploadError) {
        console.error('Signed PDF upload error:', uploadError);
        // Continue without failing - the signature is already saved
      } else {
        console.log('Signed PDF uploaded successfully:', signedPdfPath);
      }
    } catch (pdfError) {
      console.error('Error adding signature page to PDF:', pdfError);
      // Continue without failing - the signature is already saved
    }

    // Update completed_tax_returns status
    const { error: updateError } = await supabaseAdmin
      .from('completed_tax_returns')
      .update({
        signature_status: 'signed',
        signed_at: signedAt.toISOString(),
        signed_pdf_path: signedPdfPath !== taxReturn.file_path ? signedPdfPath : null
      })
      .eq('id', completedTaxReturnId);

    if (updateError) {
      console.error('Tax return update error:', updateError);
      // Don't fail the request, signature was already saved
    }

    // Log security event
    await supabaseAdmin
      .from('security_audit_logs_immutable')
      .insert({
        user_id: user.id,
        action: 'tax_return_signed',
        resource: `completed_tax_return:${completedTaxReturnId}`,
        success: true,
        ip_address: clientIp,
        user_agent: userAgent,
        metadata: {
          tax_year: taxReturn.tax_year,
          document_hash: documentHash,
          signature_id: signature.id,
          signed_pdf_path: signedPdfPath
        }
      });

    console.log('Signature created successfully:', {
      signatureId: signature.id,
      userId: user.id,
      taxYear: taxReturn.tax_year,
      signedPdfPath
    });

    return new Response(
      JSON.stringify({
        success: true,
        signatureId: signature.id,
        signedAt: signature.signed_at,
        signedPdfPath: signedPdfPath !== taxReturn.file_path ? signedPdfPath : null
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Signature error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Interner Serverfehler' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
