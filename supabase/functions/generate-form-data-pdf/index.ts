
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { jsPDF } from "https://esm.sh/jspdf@2.5.1"
import { z } from 'https://deno.land/x/zod@v3.23.8/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Input validation schema
const formDataRequestSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  taxYear: z.string().regex(/^20\d{2}$/, 'Invalid tax year format'),
  userName: z.string().max(200).optional().nullable()
})

// Function to normalize German text by replacing umlauts
const normalizeGermanText = (text: string): string => {
  if (!text || typeof text !== 'string') return text;
  
  return text
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/Ä/g, 'Ae')
    .replace(/Ö/g, 'Oe')
    .replace(/Ü/g, 'Ue')
    .replace(/ß/g, 'ss');
}

serve(async (req) => {
  console.log('🚀 generate-form-data-pdf function called, method:', req.method);
  console.log('🌐 Request URL:', req.url);
  console.log('📋 Request headers:', Object.fromEntries(req.headers.entries()));
  
  if (req.method === 'OPTIONS') {
    console.log('✅ Handling CORS preflight request');
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    console.log('❌ Invalid method:', req.method);
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  try {
    console.log('📝 Reading request body...');
    const contentType = req.headers.get('content-type');
    console.log('📄 Content-Type:', contentType);
    
    if (!contentType || !contentType.includes('application/json')) {
      console.error('❌ Invalid content type:', contentType);
      return new Response(
        JSON.stringify({ error: 'Content-Type must be application/json' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    let body;
    try {
      body = await req.json();
      console.log('📋 Request body received:', body);
    } catch (parseError) {
      console.error('❌ Failed to parse JSON body:', parseError);
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
      validatedData = formDataRequestSchema.parse(body)
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        console.error('❌ Validation error:', validationError.errors)
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
    
    const { userId, taxYear, userName } = validatedData;
    
    // Provide fallback for empty userName
    const effectiveUserName = userName && userName.trim() 
      ? userName.trim()
      : 'Unbekannter Benutzer';
    
    console.log(`🎯 Generating form data PDF for user ${userId}, year ${taxYear}`)
    console.log(`📝 Original userName: "${userName}", effective userName: "${effectiveUserName}"`)

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Fetch form data for the specified user and tax year
    const { data: formDataRecords, error: formError } = await supabaseClient
      .from('form_data')
      .select('*')
      .eq('user_id', userId)
      .eq('tax_year', taxYear)

    if (formError) {
      console.error('Error fetching form data:', formError)
      throw formError
    }

    console.log(`📋 Found ${formDataRecords?.length || 0} form data records`)

    // Create form data structure
    const formData = {
      contactInfo: formDataRecords?.find(fd => fd.form_type === 'contactInfo')?.data || {},
      income: formDataRecords?.find(fd => fd.form_type === 'income')?.data || {},
      assets: formDataRecords?.find(fd => fd.form_type === 'assets')?.data || {},
      deductions: formDataRecords?.find(fd => fd.form_type === 'deductions')?.data || {}
    }

    // German field mappings
    const getFieldLabel = (key: string): string => {
      const labelMap: Record<string, string> = {
        // Contact Info
        firstName: 'Vorname',
        lastName: 'Nachname',
        email: 'E-Mail',
        phone: 'Telefon',
        address: 'Adresse',
        postalCode: 'PLZ',
        city: 'Ort',
        birthDate: 'Geburtsdatum',
        maritalStatus: 'Zivilstand',
        hasChildren: 'Kinder',
        religion: 'Konfession',
        kanton: 'Kanton',
        firefighterService: 'Feuerwehrdienst',
        spouseFirstName: 'Ehepartner Vorname',
        spouseLastName: 'Ehepartner Nachname',
        spouseReligion: 'Ehepartner Konfession',
        adressnummer: 'Adressnummer',
        
        // Income
        hasSalary: 'Lohneinkommen',
        hasRental: 'Mieteinnahmen',
        hasDividends: 'Dividenden',
        hasFreelance: 'Selbständigerwerbseinkommen',
        hasPension: 'Renten/Pensionen',
        hasGiftInheritance: 'Schenkungen/Erbschaften',
        hasPensionPayout: 'Pensionskassenauszahlung',
        hasOtherIncome: 'Andere Einkünfte',
        
        // Employer fields
        workLocation: 'Arbeitsort',
        workload: 'Pensum',
        workDays: 'Arbeitstage',
        commute: 'Arbeitsweg',
        carReason: 'Grund für Autonutzung',
        
        // Assets
        hasVehicle: 'Fahrzeuge',
        hasProperty: 'Liegenschaften',
        hasMortgage: 'Hypotheken',
        hasDebt: 'Schulden',
        hasDepositAccount: 'Bankkonten',
        hasCrypto: 'Kryptowährungen',
        hasOtherAssets: 'Andere Vermögenswerte',
        
        // Vehicle fields
        name: 'Bezeichnung',
        purchasePrice: 'Kaufpreis',
        purchaseYear: 'Kaufjahr',
        
        // Deductions
        hasPillar3a: 'Säule 3a',
        hasBVGPurchase: 'BVG-Einkauf',
        hasEducationExpenses: 'Ausbildungskosten',
        hasDonations: 'Spenden',
        hasPropertyMaintenance: 'Liegenschaftsunterhalt',
        hasOtherDeductions: 'Andere Abzüge',
        hasSupportedPersons: 'Unterstützte Personen',
        hasMaintenancePayments: 'Unterhaltszahlungen',
        hasWorkRelatedExpenses: 'Berufskosten',
        hasChildcare: 'Kinderbetreuung'
      }
      
      return normalizeGermanText(labelMap[key] || key)
    }

    const getValueLabel = (key: string, value: any): string => {
      if (typeof value === 'boolean') {
        return value ? 'Ja' : 'Nein'
      }
      
      if (key === 'maritalStatus') {
        const statusMap: Record<string, string> = {
          'ledig': 'Ledig',
          'verheiratet': 'Verheiratet',
          'verwitwet': 'Verwitwet'
        }
        return normalizeGermanText(statusMap[value] || value)
      }
      
      if (key === 'religion' || key === 'spouseReligion') {
        const religionMap: Record<string, string> = {
          'römisch-katholisch': 'Römisch-katholisch',
          'reformiert': 'Reformiert',
          'christkatolisch': 'Christkatholisch',
          'andere/keine': 'Andere/Keine'
        }
        return normalizeGermanText(religionMap[value] || value)
      }
      
      if (key === 'kanton') {
        const kantonMap: Record<string, string> = {
          'ZH': 'Zürich',
          'AG': 'Aargau',
          'ZG': 'Zug',
          'SZ': 'Schwyz'
        }
        return normalizeGermanText(kantonMap[value] || value)
      }
      
      if (key === 'birthDate' && value) {
        return new Date(value).toLocaleDateString('de-DE')
      }
      
      if (Array.isArray(value)) {
        return value.length > 0 ? `${value.length} Einträge` : 'Keine Einträge'
      }
      
      return normalizeGermanText(String(value))
    }

    // Create PDF
    const pdf = new jsPDF()
    let yPosition = 20

    // Helper function to safely add text to PDF
    const addTextToPdf = (text: string, x: number, y: number, options?: any) => {
      try {
        // First try with original text (in case UTF-8 works)
        pdf.text(text, x, y, options)
      } catch (error) {
        console.log('⚠️ UTF-8 text failed, using normalized text:', error instanceof Error ? error.message : 'Unknown error')
        // Fallback to normalized text
        pdf.text(normalizeGermanText(text), x, y, options)
      }
    }

    // Title page
    pdf.setFontSize(20)
    addTextToPdf('Formularangaben', 20, yPosition)
    yPosition += 10

    pdf.setFontSize(14)
    addTextToPdf(`Benutzer: ${normalizeGermanText(effectiveUserName)}`, 20, yPosition)
    yPosition += 8
    addTextToPdf(`Steuerjahr: ${taxYear}`, 20, yPosition)
    yPosition += 8
    addTextToPdf(`Erstellt am: ${new Date().toLocaleDateString('de-DE')}`, 20, yPosition)
    yPosition += 20

    const addSection = (title: string, data: any, excludeFields: string[] = []) => {
      if (!data || Object.keys(data).length === 0) return

      const relevantFields = Object.entries(data)
        .filter(([key, value]) => {
          if (excludeFields.includes(key)) return false
          if (typeof value === 'boolean') return value === true
          if (Array.isArray(value)) return false // Handle separately
          if (typeof value === 'string') return value.trim() !== ''
          if (typeof value === 'number') return value !== 0
          return value !== null && value !== undefined
        })

      if (relevantFields.length === 0) return

      // Check if we need a new page
      if (yPosition > 250) {
        pdf.addPage()
        yPosition = 20
      }

      pdf.setFontSize(16)
      addTextToPdf(title, 20, yPosition)
      yPosition += 10

      pdf.setFontSize(10)
      relevantFields.forEach(([key, value]) => {
        if (yPosition > 280) {
          pdf.addPage()
          yPosition = 20
        }

        const label = getFieldLabel(key)
        const valueText = getValueLabel(key, value)
        
        addTextToPdf(`${label}: ${valueText}`, 20, yPosition)
        yPosition += 6
      })

      // Handle array fields (repeaters)
      const arrayFields = Object.entries(data)
        .filter(([key, value]) => excludeFields.includes(key) && Array.isArray(value) && value.length > 0)

      arrayFields.forEach(([key, value]) => {
        if (yPosition > 270) {
          pdf.addPage()
          yPosition = 20
        }

        const items = value as any[]
        pdf.setFontSize(12)
        addTextToPdf(`${getFieldLabel(key)}:`, 20, yPosition)
        yPosition += 8

        pdf.setFontSize(10)
        items.forEach((item, index) => {
          if (yPosition > 275) {
            pdf.addPage()
            yPosition = 20
          }

          addTextToPdf(`${index + 1}.`, 25, yPosition)
          yPosition += 5

          Object.entries(item).forEach(([itemKey, itemValue]) => {
            if (itemKey === 'id' || !itemValue) return
            if (yPosition > 280) {
              pdf.addPage()
              yPosition = 20
            }

            const itemLabel = getFieldLabel(itemKey)
            const itemValueText = normalizeGermanText(String(itemValue))
            addTextToPdf(`   ${itemLabel}: ${itemValueText}`, 30, yPosition)
            yPosition += 5
          })
          yPosition += 3
        })
      })

      yPosition += 10
    }

    // Add sections
    addSection('Kontaktinformationen', formData.contactInfo, ['children'])
    addSection('Einkommen', formData.income, ['employers'])
    addSection('Abzüge', formData.deductions, ['supportedPersons', 'maintenancePayments'])
    addSection('Vermögen', formData.assets, ['vehicles', 'properties', 'debts'])

    // Generate PDF buffer
    const pdfBuffer = pdf.output('arraybuffer')

    console.log(`✅ PDF generated successfully with German text support, size: ${pdfBuffer.byteLength} bytes`)

    return new Response(pdfBuffer, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Formularangaben_${normalizeGermanText(effectiveUserName).replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '')}_${taxYear}.pdf"`
      }
    })

  } catch (error) {
    console.error('❌ Error in generate-form-data-pdf:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
