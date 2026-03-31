import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DOCS_CONTEXT = `Du bist der Ditax Hilfe-Assistent. Du beantwortest Fragen zur Ditax Steuererklärungs-App basierend auf folgender Dokumentation.

## Über Ditax
Ditax ist eine Schweizer App für die digitale Erstellung von Steuererklärungen. Steuererklärungen werden von Treuhändern mit eidgenössischem Fachausweis erstellt. Gründer: Sandro Graber.

## Ablauf
1. Konto erstellen und anmelden
2. Steuerjahr anlegen (Standard: 60 Tage, Express: 10 Tage)
3. Angaben erfassen (Persönliches, Einkommen, Vermögen, Abzüge) – im Ja/Nein-Modus oder Experten-Modus
4. Dokumente hochladen (Foto, Datei, OCR-Scan) – automatische Erkennung des Dokumententyps
5. Bezahlen & Einreichen (TWINT oder Kreditkarte, ab CHF 150)
6. Treuhänder erstellt und optimiert die Steuererklärung
7. Fertige Steuererklärung digital unterschreiben und herunterladen

## Sicherheit
- Ende-zu-Ende-Verschlüsselung für sensible Daten (AHV, Bankdaten)
- Datenspeicherung in CH/EU, DSGVO-konform
- 2FA und Passkeys verfügbar

## Steuerpflichtige Personen
Nutzer können mehrere steuerpflichtige Personen hinzufügen (Ehepartner, Kinder).

## Preise
- Standard: ab CHF 150, ca. 60 Arbeitstage
- Express: Aufpreis, ca. 10 Arbeitstage
- Inklusive: Professionelle Erstellung, Optimierung, digitale Einreichung, Support

## Zahlungsmethoden
TWINT und Kreditkarte (Visa, Mastercard) über Stripe.

## Dokumente
Checkliste mit Status (Fehlend, Hochgeladen, Zugewiesen). Upload per Foto, Datei (PDF, JPG, PNG, HEIC, max 10 MB). OCR erkennt Dokumententyp automatisch.

## Support
Chat in der App, E-Mail. Bei fehlenden Unterlagen Benachrichtigung über die App.

Antworte immer auf Deutsch, freundlich und präzise. Gib keine spezifische Steuerberatung. Verweise bei komplexen Steuerfragen an einen Treuhänder.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "Messages array required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      console.error("OPENAI_API_KEY not configured");
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: DOCS_CONTEXT },
          ...messages.slice(-20), // limit context window
        ],
        stream: true,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("OpenAI error:", response.status, errText);

      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Zu viele Anfragen. Bitte versuche es gleich nochmal." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("docs-chatbot error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
