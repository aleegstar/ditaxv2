
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from 'https://deno.land/x/zod@v3.23.8/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Input validation schema
const chatRequestSchema = z.object({
  message: z.string()
    .min(1, 'Message cannot be empty')
    .max(5000, 'Message too long (max 5000 characters)')
    .trim(),
  sessionId: z.string()
    .uuid('Invalid session ID format')
    .optional()
    .nullable(),
  attachmentId: z.string()
    .uuid('Invalid attachment ID format')
    .optional()
    .nullable()
})

/**
 * Load anonymized user status metadata (no personal data, only progress booleans/counts).
 */
async function loadUserStatusContext(supabase: any, userId: string): Promise<string> {
  try {
    // 1. Load all tax filers for this user
    const { data: taxFilers } = await supabase
      .from('tax_filers')
      .select('id, first_name, relationship, is_primary')
      .eq('user_id', userId)

    if (!taxFilers || taxFilers.length === 0) {
      return `\nAKTUELLER STATUS DES USERS (nur Metadaten):\n- Keine steuerpflichtigen Personen angelegt. Der User hat noch nicht begonnen.\n`
    }

    // 2. Load all tax returns
    const { data: taxReturns } = await supabase
      .from('tax_returns')
      .select('id, tax_year, status, workflow_step, payment_status, tax_filer_id')
      .eq('user_id', userId)
      .order('tax_year', { ascending: false })

    if (!taxReturns || taxReturns.length === 0) {
      return `\nAKTUELLER STATUS DES USERS (nur Metadaten):\n- Kein Steuerjahr angelegt. Der User hat noch nicht begonnen.\n`
    }

    // 3. Load form_data completion status (the real source of truth)
    const { data: formDataRecords } = await supabase
      .from('form_data')
      .select('form_type, tax_year, tax_filer_id, data')
      .eq('user_id', userId)
      .in('form_type', ['contactInfo', 'income', 'assets', 'deductions'])

    // 4. Load document counts per tax_filer_id and tax_year
    const { data: documents } = await supabase
      .from('uploaded_documents')
      .select('id, tax_filer_id, tax_year')
      .eq('user_id', userId)

    // 5. Load missing item requests
    const { data: missingItems } = await supabase
      .from('missing_item_requests')
      .select('status, tax_filer_id, tax_return_id')
      .eq('user_id', userId)

    // 6. Load completed tax returns
    const { data: completedReturns } = await supabase
      .from('completed_tax_returns')
      .select('status, tax_year, tax_filer_id')
      .eq('user_id', userId)

    // Build status per tax filer
    let statusLines: string[] = []

    for (const filer of taxFilers) {
      const filerLabel = filer.is_primary
        ? `${filer.first_name} (Hauptperson)`
        : `${filer.first_name} (${filer.relationship || 'Weitere Person'})`

      const filerReturns = taxReturns.filter((tr: any) =>
        tr.tax_filer_id === filer.id || (!tr.tax_filer_id && filer.is_primary)
      )

      if (filerReturns.length === 0) continue

      let filerBlock = `- Steuerpflichtige Person: ${filerLabel}`

      for (const tr of filerReturns) {
        const year = tr.tax_year

        // Check form_data completion (real source of truth)
        const isFormCompleted = (formType: string): boolean => {
          const record = formDataRecords?.find((fd: any) =>
            fd.form_type === formType &&
            fd.tax_year === year &&
            (fd.tax_filer_id === filer.id || (!fd.tax_filer_id && filer.is_primary))
          )
          return record?.data?._completed === true
        }

        const contactDone = isFormCompleted('contactInfo')
        const incomeDone = isFormCompleted('income')
        const assetsDone = isFormCompleted('assets')
        const deductionsDone = isFormCompleted('deductions')

        // Count documents for this filer + year
        const docCount = documents?.filter((d: any) =>
          d.tax_year === year &&
          (d.tax_filer_id === filer.id || (!d.tax_filer_id && filer.is_primary))
        ).length || 0

        // Missing items for this filer
        const filerReturnIds = filerReturns.map((r: any) => r.id)
        const pendingMissing = missingItems?.filter((m: any) =>
          filerReturnIds.includes(m.tax_return_id) && m.status === 'pending'
        ).length || 0
        const submittedMissing = missingItems?.filter((m: any) =>
          filerReturnIds.includes(m.tax_return_id) && m.status === 'submitted'
        ).length || 0

        // Completed returns for this filer + year
        const completed = completedReturns?.find((c: any) =>
          c.tax_year === year &&
          (c.tax_filer_id === filer.id || (!c.tax_filer_id && filer.is_primary))
        )

        const check = (v: boolean) => v ? '✓ Ausgefüllt' : '✗ Noch nicht ausgefüllt'
        const workflowLabel = getWorkflowLabel(tr.workflow_step)
        const paymentLabel = tr.payment_status === 'paid' ? '✓ Bezahlt' : '✗ Noch nicht bezahlt'

        filerBlock += `\n  - Steuerjahr ${year}:
    - Persönliche Angaben: ${check(contactDone)}
    - Einkommen: ${check(incomeDone)}
    - Vermögen: ${check(assetsDone)}
    - Abzüge: ${check(deductionsDone)}
    - Dokumente hochgeladen: ${docCount}
    - Workflow-Schritt: ${workflowLabel}
    - Bezahlung: ${paymentLabel}`

        if (pendingMissing > 0) {
          filerBlock += `\n    - Offene Nachforderungen: ${pendingMissing} (noch ausstehend)`
        }
        if (submittedMissing > 0) {
          filerBlock += `\n    - Eingereichte Nachforderungen: ${submittedMissing}`
        }
        if (completed) {
          filerBlock += `\n    - Fertige Steuererklärung: ✓ Vorhanden (Status: ${completed.status})`
        }
      }

      statusLines.push(filerBlock)
    }

    return `
AKTUELLER STATUS DES USERS (nur Metadaten, keine persönlichen Daten):
${statusLines.join('\n')}`

  } catch (error) {
    console.error('Error loading user status:', error)
    return '\nAKTUELLER STATUS: Konnte nicht geladen werden.\n'
  }
}

function getWorkflowLabel(step: string | null): string {
  switch (step) {
    case 'data_collection': return 'Daten erfassen'
    case 'document_upload': return 'Dokumente hochladen'
    case 'submission': return 'Bereit zum Einreichen'
    case 'creation_in_progress': return 'Steuererklärung wird erstellt'
    case 'completed': return 'Abgeschlossen'
    default: return step || 'Nicht gestartet'
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Parse and validate request body
    const body = await req.json()
    
    let validatedData
    try {
      validatedData = chatRequestSchema.parse(body)
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

    const { message, sessionId, attachmentId } = validatedData

    console.log('=== CHATBOT REQUEST START ===')
    console.log('Message length:', message.length)
    console.log('Session ID:', sessionId || 'none')

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase configuration')
      throw new Error('Supabase configuration missing')
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey)

    // SECURITY: Extract and verify authenticated user from Authorization header
    console.log('=== AUTHENTICATING USER ===')
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error('Missing Authorization header')
      throw new Error('Authentication required')
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      console.error('Authentication failed:', authError)
      throw new Error('Invalid authentication token')
    }

    const userId = user.id
    console.log('Authenticated User ID:', userId)

    // Check ONLY for explicit admin bot handovers - NOT for user escalations
    console.log('=== CHECKING BOT HANDOVER ===')
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    
    const { data: handoverCheck, error: handoverError } = await supabase
      .from('chat_messages')
      .select('bot_handover_requested, handled_by_admin, created_at, sender_id')
      .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
      .eq('bot_handover_requested', true)
      .gte('created_at', fiveMinutesAgo)
      .order('created_at', { ascending: false })
      .limit(1)

    if (handoverError) {
      console.error('Error checking bot handover:', handoverError)
    } else if (handoverCheck && handoverCheck.length > 0) {
      const handover = handoverCheck[0]
      if (handover.sender_id && handover.sender_id !== userId) {
        console.log('Admin bot handover detected - resetting escalation flags')
        
        const { error: resetError } = await supabase
          .from('chat_messages')
          .update({ 
            escalation_requested: false, 
            handled_by_admin: null, 
            bot_handover_requested: false 
          })
          .eq('created_at', handover.created_at)

        if (resetError) {
          console.error('Error resetting escalation flags:', resetError)
        } else {
          console.log('✓ Escalation flags reset successfully for admin handover')
        }
      } else {
        console.log('User escalation detected - NOT resetting flags')
      }
    }

    // Get OpenAI API key
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured')
    }

    // Check for escalation keywords
    const escalationKeywords = [
      'mitarbeiter', 'human', 'person', 'beschwerde', 'unzufrieden', 
      'sprechen', 'anrufen', 'hilfe', 'problem', 'fehler', 'dringend',
      'support', 'agent', 'mensch'
    ]
    
    const shouldEscalate = escalationKeywords.some(keyword => 
      message.toLowerCase().includes(keyword)
    )

    // Save user message FIRST
    console.log('=== SAVING USER MESSAGE ===')
    const userMessageData = {
      sender_id: userId,
      recipient_id: null,
      content: message,
      chat_type: 'human',
      bot_session_id: sessionId || null,
      escalation_requested: shouldEscalate,
      attachment_id: attachmentId || null
    }
    
    const { error: userMessageError, data: savedUserMessage } = await supabase
      .from('chat_messages')
      .insert(userMessageData)
      .select()
      .single()

    if (userMessageError) {
      console.error('ERROR saving user message:', userMessageError)
      throw new Error(`Failed to save user message: ${userMessageError.message}`)
    } else {
      console.log('✓ User message saved successfully')
    }

    if (shouldEscalate) {
      console.log('ESCALATION DETECTED - Sending escalation response')
      
      const escalationResponse = "Ich verstehe, dass Sie mit einem Mitarbeiter sprechen möchten. Ich leite Sie an unser Support-Team weiter. Ein Mitarbeiter wird sich in Kürze bei Ihnen melden."
      
      const botMessageData = {
        sender_id: null,
        recipient_id: userId,
        content: escalationResponse,
        chat_type: 'bot',
        bot_session_id: sessionId || null
      }
      
      const { error: botResponseError } = await supabase
        .from('chat_messages')
        .insert(botMessageData)

      if (botResponseError) {
        console.error('ERROR saving bot escalation response:', botResponseError)
        throw new Error(`Failed to save bot response: ${botResponseError.message}`)
      }

      return new Response(
        JSON.stringify({ 
          response: escalationResponse,
          escalated: true 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Load user status context (anonymized metadata only)
    console.log('=== LOADING USER STATUS CONTEXT ===')
    const userStatusContext = await loadUserStatusContext(supabase, userId)
    console.log('User status context loaded')

    // Get recent conversation context (last 10 messages)
    console.log('=== LOADING CONVERSATION CONTEXT ===')
    const { data: recentMessages, error: contextError } = await supabase
      .from('chat_messages')
      .select('content, chat_type, sender_id')
      .or(`and(sender_id.eq.${userId},bot_session_id.eq.${sessionId || 'null'}),and(recipient_id.eq.${userId},bot_session_id.eq.${sessionId || 'null'})`)
      .order('created_at', { ascending: false })
      .limit(10)

    if (contextError) {
      console.error('Error loading context:', contextError)
    }

    // Build conversation context for OpenAI
    const conversationHistory = recentMessages?.reverse().map(msg => ({
      role: msg.chat_type === 'bot' ? 'assistant' : 'user',
      content: msg.content || ''
    })) || []

    // System prompt for the DiTax assistant bot
    const systemPrompt = `Du bist der KI-Assistent von DiTax, der digitalen Steuerplattform für die Schweiz.

ÜBER DITAX:
- DiTax ist eine digitale Steuerplattform, die Privatpersonen ermöglicht, ihre Steuererklärung vollständig digital erstellen zu lassen
- WICHTIG: Die Steuererklärung wird von qualifizierten Treuhändern mit eidg. Fachausweis erstellt — nicht vom User selbst
- Der User liefert lediglich seine Angaben und Dokumente, den Rest erledigt DiTax
- Gründer: Sandro Graber, Treuhänder mit eidg. Fachausweis
- Webseite: www.ditax.ch

SO FUNKTIONIERT ES (4 Schritte):
1. Anmelden / Registrieren — Konto erstellen und einloggen
2. Angaben erfassen — Persönliche Daten, Einkommen, Vermögen und Abzüge in 4 Formularen eingeben
3. Unterlagen hochladen — Lohnausweise, Kontoauszüge, Belege etc. gemäss individueller Checkliste hochladen
4. Fertige Steuererklärung erhalten — Ein Treuhänder erstellt die Steuererklärung, der User erhält sie zum Download

PREISE & BEARBEITUNGSDAUER:
- Ab 150 CHF, transparente Preisgestaltung ohne versteckte Kosten
- Standard-Bearbeitung: bis 60 Tage
- Express-Service: innerhalb von 10 Tagen
- Individuellen Preis berechnen: Preisrechner auf www.ditax.ch

SICHERHEIT:
- Ende-zu-Ende Verschlüsselung aller Daten
- Optionale Zwei-Faktor-Authentifizierung (2FA) via App oder Passkey
- Datenspeicherung ausschliesslich in der Schweiz/EU
- DSGVO konform, SSL/TLS verschlüsselt
- Alle Zugriffe werden protokolliert (Audit-Logs)
- Gesichert mit Aikido Security

NAVIGATION & FEATURES:
- Steuerjahr anlegen: Auf der Startseite auf "+" oder "Steuerjahr hinzufügen" tippen
- Vorjahres-Import: Beim Anlegen eines neuen Steuerjahrs können Daten aus dem Vorjahr übernommen werden
- Formulare ausfüllen: Unter dem jeweiligen Steuerjahr die Bereiche Schritt für Schritt ausfüllen
- Dokumente hochladen: Im Bereich "Dokumente" Lohnausweise, Kontoauszüge, Belege etc. hochladen
- Steuererklärung einreichen: Nach Fertigstellung aller Formulare über "Einreichen" absenden
- Status verfolgen: Unter "Meine Steuererklärungen" den aktuellen Bearbeitungsstand einsehen
- Fehlende Unterlagen: Falls Unterlagen fehlen, erscheint eine Benachrichtigung mit Details
- Definitive Steuerrechnung: Nach Abschluss der Veranlagung unter "Steuerrechnungen" einsehbar
- Rechnungen: Unter "Rechnungen" die DiTax-Gebühren und Zahlungen verwalten
- Profil: Persönliche Daten und Einstellungen unter "Profil" verwalten
- Support-Tickets: Bei Problemen unter "Support" ein Ticket erstellen
- Steuerpflichtige Personen: Unter "Steuerpflichtige" Ehepartner oder Kinder hinzufügen

UNTERSTÜTZTE KANTONE: Aargau (AG), Zürich (ZH), Zug (ZG), Schwyz (SZ)

FORMULARBEREICHE:
- Persönliche Angaben: Adresse, Zivilstand, Kinder, Religion, Konfession
- Einkommen: Lohn aus unselbständiger Arbeit, Selbständigkeit, Mieteinnahmen, Dividenden, Renten
- Vermögen: Bankkonten, Wertschriften/Aktien, Immobilien, Fahrzeuge, Kryptowährungen
- Abzüge: Säule 3a, BVG-Einkauf, Spenden, Krankheitskosten, Kinderbetreuungskosten, Berufsauslagen

WISSENSDATENBANK:
- In der App unter "Hilfe & Support" im Menü verfügbar
- Kategorien: Registrieren/Anmelden, Angaben hinzufügen, Dokumente hochladen, Steuererklärung anpassen lassen, Sicherheit
- Bei detaillierten Anleitungsfragen verweise den User auf die Wissensdatenbank: "Detaillierte Schritt-für-Schritt-Anleitungen finden Sie in unserer Wissensdatenbank unter 'Hilfe & Support' im Menü."

APP-VERFÜGBARKEIT:
- iOS: Im App Store verfügbar
- Android: Im Google Play Store verfügbar
- Web: www.ditax.ch

${userStatusContext}

KONTEXTBASIERTE HILFE (nutze den obigen Status, um dem User gezielt zu helfen):
- Wenn Formulare fehlen: Sage dem User welche Bereiche noch nicht ausgefüllt sind und wie er dorthin navigiert (z.B. "Tippe auf dein Steuerjahr und dann auf 'Einkommen'")
- Wenn alle Formulare ausgefüllt aber keine Dokumente hochgeladen: Weise auf den Dokumenten-Upload hin
- Wenn Dokumente hochgeladen aber nicht eingereicht: Erkläre wie die Einreichung funktioniert
- Wenn offene Nachforderungen vorhanden: Informiere den User und erkläre wie er diese bearbeiten kann
- Wenn Steuererklärung fertig: Gratuliere und weise auf den Download hin
- Wenn kein Steuerjahr angelegt: Führe den User durch den ersten Schritt

WICHTIGE REGELN:
- Du hilfst bei allgemeinen Steuerfragen und bei der Bedienung der DiTax-App
- Du gibst KEINE spezifische Steuerberatung (z.B. "Sie sollten X abziehen")
- Du hast KEINEN Zugriff auf persönliche Daten oder hochgeladene Dokumente
- Du kennst nur den Fortschrittsstatus (welche Bereiche ausgefüllt sind, Anzahl Dokumente etc.)
- Bei Navigationsfragen gibst du konkrete Hinweise (z.B. "Gehen Sie auf die Startseite und tippen Sie auf '+' um ein neues Steuerjahr hinzuzufügen")
- Antworte immer auf Deutsch
- Sei freundlich und professionell
- Halte Antworten präzise und hilfreich

ESKALATION:
Wenn jemand nach einem Mitarbeiter fragt oder bei komplexen steuerlichen Problemen, sage: "Für diese spezielle Anfrage verbinde ich Sie gern mit einem unserer Steuerexperten."

WICHTIG: Falls der Chat zuvor eskaliert war und nun wieder an dich zurückgegeben wurde, begrüße den Benutzer freundlich und zeige, dass du wieder verfügbar bist.`

    // Call OpenAI API
    console.log('=== CALLING OPENAI API ===')
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          ...conversationHistory,
          { role: 'user', content: message }
        ],
        max_tokens: 700,
        temperature: 0.7,
      }),
    })

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text()
      console.error('OpenAI API error:', openaiResponse.status, errorText)
      throw new Error(`OpenAI API error: ${openaiResponse.statusText}`)
    }

    const openaiData = await openaiResponse.json()
    const botResponse = openaiData.choices[0]?.message?.content || 'Entschuldigung, ich konnte Ihre Anfrage nicht verarbeiten. Bitte versuchen Sie es erneut.'

    console.log('OpenAI response received:', botResponse.substring(0, 100) + '...')

    // Check if bot suggests escalation
    const botSuggestsEscalation = botResponse.toLowerCase().includes('steuerexperten') || 
                                  botResponse.toLowerCase().includes('mitarbeiter') ||
                                  botResponse.toLowerCase().includes('kollegen')

    // Save bot response
    console.log('=== SAVING BOT MESSAGE ===')
    const botMessageData = {
      sender_id: null,
      recipient_id: userId,
      content: botResponse,
      chat_type: 'bot',
      bot_session_id: sessionId || null,
      escalation_requested: botSuggestsEscalation
    }
    
    const { error: botMessageError } = await supabase
      .from('chat_messages')
      .insert(botMessageData)
      .select()
      .single()

    if (botMessageError) {
      console.error('ERROR saving bot message:', botMessageError)
      throw new Error(`Failed to save bot message: ${botMessageError.message}`)
    } else {
      console.log('✓ Bot message saved successfully')
    }

    console.log('=== CHATBOT REQUEST END ===')

    return new Response(
      JSON.stringify({ 
        response: botResponse,
        escalated: false,
        suggestsEscalation: botSuggestsEscalation
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('=== CHATBOT ERROR ===')
    console.error('Error details:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Chatbot service temporarily unavailable',
        response: 'Entschuldigung, der Chat-Service ist momentan nicht verfügbar. Bitte versuchen Sie es später erneut oder kontaktieren Sie unser Support-Team direkt.'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
