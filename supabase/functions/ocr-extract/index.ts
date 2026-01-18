import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { imageBase64, mimeType } = await req.json()
    
    if (!imageBase64) {
      console.error('[OCR] No image data provided')
      return new Response(
        JSON.stringify({ success: false, error: 'No image provided', extractedText: '' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')
    if (!lovableApiKey) {
      console.error('[OCR] LOVABLE_API_KEY not configured')
      return new Response(
        JSON.stringify({ success: false, error: 'OCR service not configured', extractedText: '' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[OCR] Processing image, type: ${mimeType}, size: ${(imageBase64.length * 0.75 / 1024).toFixed(1)} KB`)

    // Call Gemini Vision via Lovable AI Gateway
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Du bist ein OCR-System. Extrahiere den KOMPLETTEN sichtbaren Text aus diesem Dokument.

WICHTIGE REGELN:
1. Gib NUR den erkannten Text zurück - keine Erklärungen, keine Formatierung, keine Kommentare
2. Erkenne deutsche Umlaute korrekt (ä, ö, ü, ß)
3. Lies das Dokument von oben nach unten, links nach rechts
4. Behalte Zeilenumbrüche bei wichtigen Abschnitten bei
5. Ignoriere Wasserzeichen oder Hintergrundmuster
6. Bei Formularen: Extrahiere sowohl Feldnamen als auch ausgefüllte Werte

Das Dokument könnte sein:
- Lohnausweis / Gehaltsabrechnung
- Steuererklärung / Steuerformular
- Bankdokument / Kontoauszug
- Versicherungsnachweis
- Offizielles Behördenschreiben

Beginne direkt mit dem extrahierten Text:`
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType || 'image/jpeg'};base64,${imageBase64}`
                }
              }
            ]
          }
        ],
        max_tokens: 4000
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[OCR] Gemini API error:', response.status, errorText)
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: 'Rate limit exceeded, please try again later', extractedText: '' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: 'OCR service payment required', extractedText: '' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      return new Response(
        JSON.stringify({ success: false, error: `OCR service error: ${response.status}`, extractedText: '' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const data = await response.json()
    const extractedText = data.choices?.[0]?.message?.content || ''

    console.log(`[OCR] Successfully extracted ${extractedText.length} characters`)

    return new Response(
      JSON.stringify({ 
        success: true,
        extractedText,
        charCount: extractedText.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[OCR] Extraction error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        extractedText: ''
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
