import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OCRRequest {
  imageBase64: string;
  documentType: string;
  expectedKeywords: string[];
  displayName: string;
}

interface OCRResult {
  isMatch: boolean;
  confidence: number;
  foundKeywords: string[];
  missingKeywords: string[];
  reason: string;
  extractedTextPreview: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "AI service is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { imageBase64, documentType, expectedKeywords, displayName } = await req.json() as OCRRequest;

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: "No image provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[OCR-Verify] Processing document type: ${documentType}`);
    console.log(`[OCR-Verify] Expected keywords: ${expectedKeywords.join(', ')}`);

    // Prepare the image URL (handle both data URL and raw base64)
    const imageUrl = imageBase64.startsWith('data:') 
      ? imageBase64 
      : `data:image/png;base64,${imageBase64}`;

    const systemPrompt = `Du bist ein OCR-Spezialist für Schweizer Steuer- und Finanzdokumente. 
Deine Aufgabe ist es, Text aus dem Bild zu extrahieren und zu prüfen, ob das Dokument dem erwarteten Typ entspricht.

WICHTIG: 
- Extrahiere ALLE sichtbaren Texte aus dem Dokument
- Achte besonders auf Überschriften, Titel und wichtige Begriffe
- Die Sprache ist meist Deutsch (Schweiz)
- Prüfe ob die erwarteten Schlüsselwörter im Text vorkommen`;

    const userPrompt = `Analysiere dieses Dokument. Der Benutzer möchte prüfen ob es ein "${displayName}" ist.

Erwartete Schlüsselwörter (mindestens 2-3 sollten gefunden werden):
${expectedKeywords.join(', ')}

Extrahiere den Text und rufe die Funktion document_verification mit dem Ergebnis auf.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: userPrompt },
              { type: "image_url", image_url: { url: imageUrl } }
            ]
          }
        ],
        tools: [{
          type: "function",
          function: {
            name: "document_verification",
            description: "Gibt das Ergebnis der Dokumentenprüfung zurück",
            parameters: {
              type: "object",
              properties: {
                isMatch: { 
                  type: "boolean",
                  description: "True wenn das Dokument zum erwarteten Typ passt"
                },
                confidence: { 
                  type: "number", 
                  minimum: 0, 
                  maximum: 100,
                  description: "Konfidenz in Prozent (0-100)"
                },
                foundKeywords: { 
                  type: "array", 
                  items: { type: "string" },
                  description: "Liste der gefundenen Schlüsselwörter aus dem Dokument"
                },
                extractedTextPreview: { 
                  type: "string",
                  description: "Kurze Vorschau des extrahierten Texts (max 200 Zeichen)"
                },
                reason: { 
                  type: "string",
                  description: "Kurze Begründung auf Deutsch warum das Dokument passt oder nicht passt"
                }
              },
              required: ["isMatch", "confidence", "foundKeywords", "extractedTextPreview", "reason"],
              additionalProperties: false
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "document_verification" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      const errorText = await response.text();
      console.error("[OCR-Verify] AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI processing failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    console.log("[OCR-Verify] AI response received");

    // Extract the tool call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== "document_verification") {
      console.error("[OCR-Verify] Unexpected response format:", JSON.stringify(data));
      return new Response(
        JSON.stringify({ 
          isMatch: true, // Default to allowing the document if AI fails
          confidence: 50,
          foundKeywords: [],
          missingKeywords: expectedKeywords,
          reason: "Automatische Prüfung konnte nicht durchgeführt werden",
          extractedTextPreview: ""
        } as OCRResult),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = JSON.parse(toolCall.function.arguments);
    
    // Calculate missing keywords
    const foundKeywordsLower = (result.foundKeywords || []).map((k: string) => k.toLowerCase());
    const missingKeywords = expectedKeywords.filter(
      k => !foundKeywordsLower.some((fk: string) => fk.includes(k.toLowerCase()) || k.toLowerCase().includes(fk))
    );

    const ocrResult: OCRResult = {
      isMatch: result.isMatch,
      confidence: result.confidence,
      foundKeywords: result.foundKeywords || [],
      missingKeywords,
      reason: result.reason,
      extractedTextPreview: result.extractedTextPreview || ""
    };

    console.log(`[OCR-Verify] Result: isMatch=${ocrResult.isMatch}, confidence=${ocrResult.confidence}%`);
    console.log(`[OCR-Verify] Found keywords: ${ocrResult.foundKeywords.join(', ')}`);

    return new Response(
      JSON.stringify(ocrResult),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[OCR-Verify] Error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error occurred",
        // Fallback: allow document through on error
        isMatch: true,
        confidence: 0,
        foundKeywords: [],
        missingKeywords: [],
        reason: "Fehler bei der Prüfung",
        extractedTextPreview: ""
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
