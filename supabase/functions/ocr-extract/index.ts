import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * OCR Extract Edge Function
 * 
 * DSGVO-konform: 
 * - Bild wird nur temporär im RAM verarbeitet
 * - Nur Keyword-Matches werden zurückgegeben, nie Rohtext
 * - Kein Logging von Bildinhalten
 * - Transiente Verarbeitung über Lovable AI Gateway
 */
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, keywords } = await req.json();

    // Validate input
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return new Response(
        JSON.stringify({ error: 'imageBase64 is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return new Response(
        JSON.stringify({ error: 'keywords array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check image size (max 1MB base64 = ~750KB actual)
    if (imageBase64.length > 1400000) {
      return new Response(
        JSON.stringify({ error: 'Image too large, max 1MB' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error('[OCR-Extract] LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'OCR service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare the prompt - only extract specific keywords, never return full text
    const keywordList = keywords.slice(0, 50).join(', '); // Max 50 keywords
    const systemPrompt = `Du bist ein Dokumenten-Scanner. Analysiere das Bild und finde NUR folgende Begriffe:
${keywordList}

WICHTIGE REGELN:
1. Antworte NUR mit gefundenen Begriffen als JSON-Array
2. Gib NIEMALS anderen Text aus dem Dokument zurück (Datenschutz!)
3. Bei Unsicherheit: Begriff nicht listen
4. Antworte nur mit einem JSON-Array, keine Erklärungen

Beispiel-Antwort: ["Lohnausweis", "Bruttolohn"]`;

    console.log('[OCR-Extract] Sending to Lovable AI Gateway...');
    const startTime = Date.now();

    // Determine image type from base64 header
    let mimeType = 'image/jpeg';
    if (imageBase64.startsWith('/9j/')) {
      mimeType = 'image/jpeg';
    } else if (imageBase64.startsWith('iVBORw')) {
      mimeType = 'image/png';
    } else if (imageBase64.startsWith('R0lGOD')) {
      mimeType = 'image/gif';
    } else if (imageBase64.startsWith('UklGR')) {
      mimeType = 'image/webp';
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { 
            role: "user", 
            content: [
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${imageBase64}`
                }
              },
              {
                type: "text",
                text: "Welche der angegebenen Begriffe findest du in diesem Bild? Antworte nur mit JSON-Array."
              }
            ]
          }
        ],
        max_tokens: 500,
        temperature: 0.1 // Low temperature for consistent extraction
      }),
    });

    const duration = Date.now() - startTime;
    console.log(`[OCR-Extract] AI response in ${duration}ms, status: ${response.status}`);

    if (!response.ok) {
      // Handle rate limits
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded, please try again later' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Service credits exhausted' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const errorText = await response.text();
      console.error('[OCR-Extract] AI gateway error:', errorText);
      return new Response(
        JSON.stringify({ error: 'OCR processing failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content || '[]';

    // Parse the response - extract JSON array from response
    let matchedKeywords: string[] = [];
    try {
      // Try to extract JSON array from response
      const jsonMatch = content.match(/\[[\s\S]*?\]/);
      if (jsonMatch) {
        matchedKeywords = JSON.parse(jsonMatch[0]);
        // Filter to only include keywords that were requested
        matchedKeywords = matchedKeywords.filter((k: string) => 
          keywords.some((kw: string) => 
            k.toLowerCase().includes(kw.toLowerCase()) || 
            kw.toLowerCase().includes(k.toLowerCase())
          )
        );
      }
    } catch (parseError) {
      console.warn('[OCR-Extract] Failed to parse AI response:', parseError);
      matchedKeywords = [];
    }

    console.log(`[OCR-Extract] Found ${matchedKeywords.length} keywords`);

    return new Response(
      JSON.stringify({ 
        matched: matchedKeywords,
        count: matchedKeywords.length,
        duration
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[OCR-Extract] Error:', errorMessage);
    return new Response(
      JSON.stringify({ error: 'OCR processing failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
