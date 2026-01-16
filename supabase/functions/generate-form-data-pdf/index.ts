
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

// Translation maps
const religionMap: Record<string, string> = {
  'römisch-katholisch': 'Roemisch-katholisch',
  'reformiert': 'Reformiert',
  'christkatolisch': 'Christkatholisch',
  'andere/keine': 'Andere/Keine',
  'none': 'Keine Angabe',
  'other': 'Andere Konfession',
  'katholisch': 'Katholisch',
  'evangelisch': 'Evangelisch'
}

const maritalStatusMap: Record<string, string> = {
  'ledig': 'Ledig',
  'verheiratet': 'Verheiratet',
  'verwitwet': 'Verwitwet',
  'geschieden': 'Geschieden',
  'getrennt': 'Getrennt',
  'single': 'Ledig',
  'married': 'Verheiratet'
}

const deductionMap: Record<string, string> = {
  'fatherHigher': 'Vater (hoeherer Anteil)',
  'motherHigher': 'Mutter (hoeherer Anteil)',
  'split': 'Haelftig geteilt',
  'father': 'Vater',
  'mother': 'Mutter',
  '50/50': 'Haelftig geteilt'
}

const kantonMap: Record<string, string> = {
  'ZH': 'Zuerich',
  'AG': 'Aargau',
  'ZG': 'Zug',
  'SZ': 'Schwyz',
  'BE': 'Bern',
  'LU': 'Luzern',
  'UR': 'Uri',
  'OW': 'Obwalden',
  'NW': 'Nidwalden',
  'GL': 'Glarus',
  'FR': 'Freiburg',
  'SO': 'Solothurn',
  'BS': 'Basel-Stadt',
  'BL': 'Basel-Landschaft',
  'SH': 'Schaffhausen',
  'AR': 'Appenzell Ausserrhoden',
  'AI': 'Appenzell Innerrhoden',
  'SG': 'St. Gallen',
  'GR': 'Graubuenden',
  'TG': 'Thurgau',
  'TI': 'Tessin',
  'VD': 'Waadt',
  'VS': 'Wallis',
  'NE': 'Neuenburg',
  'GE': 'Genf',
  'JU': 'Jura'
}

const translateReligion = (value: string): string => {
  return religionMap[value] || normalizeGermanText(value)
}

const translateMaritalStatus = (value: string): string => {
  return maritalStatusMap[value] || normalizeGermanText(value)
}

const translateDeduction = (value: string): string => {
  return deductionMap[value] || normalizeGermanText(value)
}

const translateKanton = (value: string): string => {
  return kantonMap[value] || normalizeGermanText(value)
}

const formatDate = (dateValue: string | Date | null | undefined): string => {
  if (!dateValue) return ''
  
  try {
    const date = new Date(dateValue)
    if (isNaN(date.getTime())) return String(dateValue)
    
    const day = date.getDate().toString().padStart(2, '0')
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const year = date.getFullYear()
    
    return `${day}.${month}.${year}`
  } catch {
    return String(dateValue)
  }
}

serve(async (req) => {
  console.log('🚀 generate-form-data-pdf function called, method:', req.method);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const contentType = req.headers.get('content-type');
    
    if (!contentType || !contentType.includes('application/json')) {
      return new Response(
        JSON.stringify({ error: 'Content-Type must be application/json' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    let body;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    let validatedData
    try {
      validatedData = formDataRequestSchema.parse(body)
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        return new Response(
          JSON.stringify({ error: 'Invalid input', details: validationError.errors }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      throw validationError
    }
    
    const { userId, taxYear, userName } = validatedData;
    const effectiveUserName = userName?.trim() || 'Unbekannter Benutzer';
    
    console.log(`🎯 Generating form data PDF for user ${userId}, year ${taxYear}`)

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

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

    const formData = {
      contactInfo: formDataRecords?.find(fd => fd.form_type === 'contactInfo')?.data || {},
      income: formDataRecords?.find(fd => fd.form_type === 'income')?.data || {},
      assets: formDataRecords?.find(fd => fd.form_type === 'assets')?.data || {},
      deductions: formDataRecords?.find(fd => fd.form_type === 'deductions')?.data || {}
    }

    // Create PDF
    const pdf = new jsPDF()
    let yPosition = 20

    // Helper function to safely add text to PDF
    const addTextToPdf = (text: string, x: number, y: number, options?: any) => {
      try {
        pdf.text(normalizeGermanText(text), x, y, options)
      } catch {
        pdf.text(text.replace(/[^\x00-\x7F]/g, ''), x, y, options)
      }
    }

    // Draw section header with lines
    const drawSectionHeader = (title: string) => {
      if (yPosition > 245) {
        pdf.addPage()
        yPosition = 25
      }
      
      yPosition += 5
      
      // Top line
      pdf.setDrawColor(80, 80, 80)
      pdf.setLineWidth(0.5)
      pdf.line(20, yPosition, 190, yPosition)
      yPosition += 8
      
      // Title
      pdf.setFontSize(13)
      pdf.setFont('helvetica', 'bold')
      addTextToPdf(title.toUpperCase(), 20, yPosition)
      yPosition += 4
      
      // Bottom line
      pdf.line(20, yPosition, 190, yPosition)
      yPosition += 10
      
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(10)
    }

    // Add a field with label and value
    const addField = (label: string, value: string, indent: number = 20) => {
      if (!value || value.trim() === '') return
      
      if (yPosition > 275) {
        pdf.addPage()
        yPosition = 25
      }
      
      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'bold')
      addTextToPdf(`${label}:`, indent, yPosition)
      pdf.setFont('helvetica', 'normal')
      
      // Calculate value position based on label width
      const labelWidth = pdf.getTextWidth(`${label}:`) + 3
      addTextToPdf(value, indent + Math.max(labelWidth, 45), yPosition)
      yPosition += 7
    }

    // Add spacing
    const addSpacing = (amount: number = 3) => {
      yPosition += amount
    }

    // ============================================
    // HEADER
    // ============================================
    
    // Draw header box
    pdf.setDrawColor(60, 60, 60)
    pdf.setLineWidth(0.8)
    pdf.rect(15, 12, 180, 35)
    
    pdf.setFontSize(18)
    pdf.setFont('helvetica', 'bold')
    addTextToPdf('FORMULARANGABEN', 20, 25)
    
    pdf.setFontSize(11)
    pdf.setFont('helvetica', 'normal')
    addTextToPdf(`Benutzer:`, 20, 35)
    addTextToPdf(normalizeGermanText(effectiveUserName), 55, 35)
    
    addTextToPdf(`Steuerjahr:`, 120, 35)
    addTextToPdf(taxYear, 155, 35)
    
    addTextToPdf(`Erstellt am:`, 20, 43)
    addTextToPdf(formatDate(new Date()), 55, 43)
    
    yPosition = 60

    // ============================================
    // KONTAKTINFORMATIONEN
    // ============================================
    
    const contact = formData.contactInfo as any
    
    if (contact && Object.keys(contact).length > 0) {
      drawSectionHeader('Kontaktinformationen')
      
      // Personal info
      if (contact.firstName) addField('Vorname', normalizeGermanText(contact.firstName))
      if (contact.lastName) addField('Nachname', normalizeGermanText(contact.lastName))
      if (contact.birthDate) addField('Geburtsdatum', formatDate(contact.birthDate))
      
      addSpacing()
      
      // Address
      if (contact.address) {
        const fullAddress = contact.adressnummer 
          ? `${contact.address} ${contact.adressnummer}` 
          : contact.address
        addField('Adresse', normalizeGermanText(fullAddress))
      }
      if (contact.postalCode || contact.city) {
        const location = `${contact.postalCode || ''} ${normalizeGermanText(contact.city || '')}`.trim()
        addField('PLZ / Ort', location)
      }
      if (contact.kanton) addField('Kanton', translateKanton(contact.kanton))
      
      addSpacing()
      
      // Status
      if (contact.maritalStatus) addField('Zivilstand', translateMaritalStatus(contact.maritalStatus))
      if (contact.religion) addField('Konfession', translateReligion(contact.religion))
      if (contact.firefighterService !== undefined) {
        addField('Feuerwehrdienst', contact.firefighterService ? 'Ja' : 'Nein')
      }
      if (contact.hasChildren !== undefined) {
        addField('Kinder', contact.hasChildren ? 'Ja' : 'Nein')
      }
      
      // ============================================
      // EHEPARTNER (separate section if married)
      // ============================================
      
      if (contact.maritalStatus === 'verheiratet' && (contact.spouseFirstName || contact.spouseLastName)) {
        drawSectionHeader('Ehepartner')
        
        if (contact.spouseFirstName) addField('Vorname', normalizeGermanText(contact.spouseFirstName))
        if (contact.spouseLastName) addField('Nachname', normalizeGermanText(contact.spouseLastName))
        if (contact.spouseReligion) addField('Konfession', translateReligion(contact.spouseReligion))
        if (contact.spouseBirthDate) addField('Geburtsdatum', formatDate(contact.spouseBirthDate))
      }
      
      // ============================================
      // KINDER
      // ============================================
      
      if (contact.children && Array.isArray(contact.children) && contact.children.length > 0) {
        drawSectionHeader(`Kinder (${contact.children.length})`)
        
        contact.children.forEach((child: any, index: number) => {
          if (yPosition > 255) {
            pdf.addPage()
            yPosition = 25
          }
          
          pdf.setFontSize(11)
          pdf.setFont('helvetica', 'bold')
          addTextToPdf(`Kind ${index + 1}:`, 20, yPosition)
          pdf.setFont('helvetica', 'normal')
          yPosition += 8
          
          // Get child name
          const firstName = child.firstName || child.Vorname || ''
          const lastName = child.lastName || child.Nachname || ''
          const fullName = `${firstName} ${lastName}`.trim()
          
          if (fullName) addField('Name', normalizeGermanText(fullName), 28)
          
          // Get birth date
          const birthDate = child.birthDate || child.Geburtsdatum
          if (birthDate) addField('Geburtsdatum', formatDate(birthDate), 28)
          
          // Get religion
          const religion = child.religion || child.Konfession
          if (religion) addField('Konfession', translateReligion(religion), 28)
          
          // Get deduction
          const deduction = child.deduction || child.Abzug
          if (deduction) addField('Abzug bei', translateDeduction(deduction), 28)
          
          addSpacing(5)
        })
      }
    }

    // ============================================
    // EINKOMMEN
    // ============================================
    
    const income = formData.income as any
    
    if (income && Object.keys(income).length > 0) {
      const incomeFields = [
        { key: 'hasSalary', label: 'Lohneinkommen' },
        { key: 'hasRental', label: 'Mieteinnahmen' },
        { key: 'hasDividends', label: 'Dividenden' },
        { key: 'hasFreelance', label: 'Selbstaendig' },
        { key: 'hasPension', label: 'Renten/Pensionen' },
        { key: 'hasGiftInheritance', label: 'Schenkungen/Erbschaften' },
        { key: 'hasPensionPayout', label: 'Pensionskassenauszahlung' },
        { key: 'hasOtherIncome', label: 'Andere Einkuenfte' }
      ]
      
      const activeIncome = incomeFields.filter(f => income[f.key] === true)
      
      if (activeIncome.length > 0) {
        drawSectionHeader('Einkommen')
        
        activeIncome.forEach(field => {
          addField(field.label, 'Ja')
        })
        
        // Employers
        if (income.employers && Array.isArray(income.employers) && income.employers.length > 0) {
          addSpacing(5)
          pdf.setFontSize(11)
          pdf.setFont('helvetica', 'bold')
          addTextToPdf(`Arbeitgeber (${income.employers.length}):`, 20, yPosition)
          pdf.setFont('helvetica', 'normal')
          yPosition += 8
          
          income.employers.forEach((employer: any, index: number) => {
            if (yPosition > 255) {
              pdf.addPage()
              yPosition = 25
            }
            
            pdf.setFontSize(10)
            pdf.setFont('helvetica', 'bold')
            addTextToPdf(`Arbeitgeber ${index + 1}:`, 25, yPosition)
            pdf.setFont('helvetica', 'normal')
            yPosition += 7
            
            if (employer.name) addField('Name', normalizeGermanText(employer.name), 30)
            if (employer.workLocation) addField('Arbeitsort', normalizeGermanText(employer.workLocation), 30)
            if (employer.workload) addField('Pensum', `${employer.workload}%`, 30)
            if (employer.workDays) addField('Arbeitstage/Woche', String(employer.workDays), 30)
            if (employer.commute) addField('Arbeitsweg', normalizeGermanText(employer.commute), 30)
            
            addSpacing(3)
          })
        }
      }
    }

    // ============================================
    // ABZUEGE
    // ============================================
    
    const deductions = formData.deductions as any
    
    if (deductions && Object.keys(deductions).length > 0) {
      const deductionFields = [
        { key: 'hasPillar3a', label: 'Saeule 3a' },
        { key: 'hasBVGPurchase', label: 'BVG-Einkauf' },
        { key: 'hasEducationExpenses', label: 'Ausbildungskosten' },
        { key: 'hasDonations', label: 'Spenden' },
        { key: 'hasPropertyMaintenance', label: 'Liegenschaftsunterhalt' },
        { key: 'hasSupportedPersons', label: 'Unterstuetzte Personen' },
        { key: 'hasMaintenancePayments', label: 'Unterhaltszahlungen' },
        { key: 'hasWorkRelatedExpenses', label: 'Berufskosten' },
        { key: 'hasChildcare', label: 'Kinderbetreuung' },
        { key: 'hasOtherDeductions', label: 'Andere Abzuege' }
      ]
      
      const activeDeductions = deductionFields.filter(f => deductions[f.key] === true)
      
      if (activeDeductions.length > 0) {
        drawSectionHeader('Abzuege')
        
        activeDeductions.forEach(field => {
          addField(field.label, 'Ja')
        })
      }
    }

    // ============================================
    // VERMOEGEN
    // ============================================
    
    const assets = formData.assets as any
    
    if (assets && Object.keys(assets).length > 0) {
      const assetFields = [
        { key: 'hasVehicle', label: 'Fahrzeuge' },
        { key: 'hasProperty', label: 'Liegenschaften' },
        { key: 'hasMortgage', label: 'Hypotheken' },
        { key: 'hasDebt', label: 'Schulden' },
        { key: 'hasDepositAccount', label: 'Bankkonten' },
        { key: 'hasCrypto', label: 'Kryptowaehrungen' },
        { key: 'hasOtherAssets', label: 'Andere Vermoegenswerte' }
      ]
      
      const activeAssets = assetFields.filter(f => assets[f.key] === true)
      
      if (activeAssets.length > 0) {
        drawSectionHeader('Vermoegen')
        
        activeAssets.forEach(field => {
          addField(field.label, 'Ja')
        })
        
        // Vehicles
        if (assets.vehicles && Array.isArray(assets.vehicles) && assets.vehicles.length > 0) {
          addSpacing(5)
          pdf.setFontSize(11)
          pdf.setFont('helvetica', 'bold')
          addTextToPdf(`Fahrzeuge (${assets.vehicles.length}):`, 20, yPosition)
          pdf.setFont('helvetica', 'normal')
          yPosition += 8
          
          assets.vehicles.forEach((vehicle: any, index: number) => {
            if (yPosition > 255) {
              pdf.addPage()
              yPosition = 25
            }
            
            pdf.setFontSize(10)
            pdf.setFont('helvetica', 'bold')
            addTextToPdf(`Fahrzeug ${index + 1}:`, 25, yPosition)
            pdf.setFont('helvetica', 'normal')
            yPosition += 7
            
            if (vehicle.name) addField('Bezeichnung', normalizeGermanText(vehicle.name), 30)
            if (vehicle.purchasePrice) addField('Kaufpreis', `CHF ${vehicle.purchasePrice}`, 30)
            if (vehicle.purchaseYear) addField('Kaufjahr', String(vehicle.purchaseYear), 30)
            
            addSpacing(3)
          })
        }
        
        // Properties
        if (assets.properties && Array.isArray(assets.properties) && assets.properties.length > 0) {
          addSpacing(5)
          pdf.setFontSize(11)
          pdf.setFont('helvetica', 'bold')
          addTextToPdf(`Liegenschaften (${assets.properties.length}):`, 20, yPosition)
          pdf.setFont('helvetica', 'normal')
          yPosition += 8
          
          assets.properties.forEach((property: any, index: number) => {
            if (yPosition > 255) {
              pdf.addPage()
              yPosition = 25
            }
            
            pdf.setFontSize(10)
            pdf.setFont('helvetica', 'bold')
            addTextToPdf(`Liegenschaft ${index + 1}:`, 25, yPosition)
            pdf.setFont('helvetica', 'normal')
            yPosition += 7
            
            if (property.address) addField('Adresse', normalizeGermanText(property.address), 30)
            if (property.value) addField('Wert', `CHF ${property.value}`, 30)
            if (property.type) addField('Typ', normalizeGermanText(property.type), 30)
            
            addSpacing(3)
          })
        }
      }
    }

    // ============================================
    // FOOTER
    // ============================================
    
    // Add footer to last page
    const pageCount = pdf.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i)
      pdf.setFontSize(8)
      pdf.setTextColor(128, 128, 128)
      addTextToPdf(`Seite ${i} von ${pageCount}`, 95, 290)
      pdf.setTextColor(0, 0, 0)
    }

    // Generate PDF buffer
    const pdfBuffer = pdf.output('arraybuffer')

    console.log(`✅ PDF generated successfully, size: ${pdfBuffer.byteLength} bytes`)

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
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
