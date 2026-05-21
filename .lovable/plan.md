## Ziel

Vorjahres-Steuererklärung wird mit **Gemini 2.5 Pro via Google Cloud Vertex AI in Region `europe-west6` (Zürich, Schweiz)** analysiert. Daten verlassen die Schweiz nicht, kein Training auf Kundendaten (Vertex AI Default), DSGVO-konform über Google Cloud DPA + Swiss Data Residency. Azure Document Intelligence wird komplett entfernt. Lokaler Extractor bleibt als Fallback.

## Warum Vertex AI statt AI Studio / Lovable Gateway

- **Lovable AI Gateway / AI Studio**: Daten gehen über Google-US-Endpoints → nicht CH-resident.
- **Vertex AI mit `location: europe-west6`**: Inference läuft physisch in Zürich, Daten bleiben in der Schweiz, „Data residency commitments" durch Google Cloud garantiert.
- Gemini-Präzision (PDF nativ als Input, kein OCR-Vorverarbeitung nötig) bei voller DSGVO/CH-Compliance.

## Architektur

```text
PriorYearUpload (Client)
   │  PDF (verschlüsselt über HTTPS)
   ▼
scan-prior-year-vertex (Edge Function, neu)
   │  - holt OAuth-Token aus Service-Account-JWT
   │  - POST europe-west6-aiplatform.googleapis.com/.../gemini-2.5-pro:generateContent
   │  - PDF als inlineData (base64) + strukturierter Prompt
   ▼
Vertex AI Zürich → strukturiertes JSON (income/assets/deductions + Codes)
   ▼
prior_year_checklists + items (wie bisher)
```

Fallback bei Fehler/Quota: lokaler `PriorYearLocalExtractor` (unverändert).

## Aufgaben

### 1. Secrets (neu, via add_secret)

- `GCP_VERTEX_SA_JSON` — Service-Account-JSON (mit Rolle `roles/aiplatform.user`) als String.
- `GCP_VERTEX_PROJECT_ID` — GCP-Projekt-ID des Users.
- `GCP_VERTEX_LOCATION` — fix `europe-west6` (default im Code, aber überschreibbar).

Setup-Anleitung für den User:
1. GCP-Projekt, Vertex AI API aktivieren, Region `europe-west6` erlauben.
2. Service Account mit `Vertex AI User` Rolle, JSON-Key erzeugen.
3. Beide Werte in Lovable Secrets eintragen.

### 2. Neue Edge Function: `supabase/functions/scan-prior-year-vertex/index.ts`

- Auth-Check (JWT → user) + tax_filer Ownership prüfen.
- Body: `{ taxFilerId, taxYear, pdfBase64, storagePath }`.
- Service-Account-JWT signieren (RS256, jose via npm), Access-Token via `oauth2.googleapis.com/token` holen, im Memory cachen (50 min TTL).
- Vertex-Call: `POST https://europe-west6-aiplatform.googleapis.com/v1/projects/{PID}/locations/europe-west6/publishers/google/models/gemini-2.5-pro:generateContent`
  - `contents: [{ role: "user", parts: [{ inlineData: { mimeType: "application/pdf", data: pdfBase64 } }, { text: PROMPT }] }]`
  - `generationConfig.responseMimeType: "application/json"` + `responseSchema` (income/assets/deductions Arrays mit `{label, code?}`).
  - `safetySettings`: alle auf `BLOCK_NONE` (Steuerdaten).
- Antwort parsen, in `prior_year_checklists` + `prior_year_checklist_items` schreiben (gleiche Tabellen wie bisher).
- Strukturierte Fehler: `vertex_unauthorized`, `vertex_quota`, `vertex_timeout`, `vertex_error`.

Prompt-Kern (deutsch, Schweizer Steuerexperte, Aargau-Codes-Liste eingebettet, Beispiel-Output):
- Aufgabe: nur Kategorien/Belege bestimmen, keine Beträge/PII extrahieren.
- Strikte JSON-Antwort gegen `responseSchema`.

### 3. Azure entfernen

- `supabase/functions/scan-prior-year-ai/index.ts` → **löschen** (via supabase--delete_edge_functions).
- `supabase/functions/_shared/azure-doc-intel.ts` → **löschen**.
- `supabase/functions/extract-lohnausweis/index.ts` & `ocr-extract/index.ts` → Azure-Pfad raus, auf bisherige (lokale/Gemini) Logik zurück bzw. neu auf Vertex umstellen, falls AI dort nötig.
- Secrets `AZURE_DOC_INTEL_ENDPOINT` & `AZURE_DOC_INTEL_KEY` → Liste an User, manuell aus Lovable Secrets löschen.

### 4. `src/components/intake/PriorYearUpload.tsx`

- `runAiScan`: ruft neue Function `scan-prior-year-vertex` (statt `scan-prior-year-ai`).
- Texte:
  - Toggle-Label: „Gemini 2.5 Pro · Vertex AI (Schweiz, Zürich)".
  - Sub: „Google Cloud · Region europe-west6 · DSGVO-konform · kein Training auf deinen Daten".
  - Stage: „Gemini analysiert dein PDF (Schweizer Server)".
  - Privacy-Hinweis: „Verarbeitung über Google Cloud Vertex AI in Zürich (europe-west6). PDF wird nicht gespeichert, kein Modelltraining."
- Branding-Icon: lucide `Sparkles` (Gemini-konnotiert, neutral) oder bestehendes `GoogleG` wieder.
- Fallback-Logik bleibt: Vertex-Fehler → lokaler Pfad + Toast „KI-Analyse nicht verfügbar – nutze lokale Erkennung."

### 5. `.lovable/plan.md`

- Inhalt durch dieses neue Konzept ersetzen (Azure → Vertex AI Schweiz).

### 6. Memory

- Neue Memory `mem://integrations/vertex-ai-swiss-region`: Pflicht, Vertex AI mit `europe-west6` für alle KI-Analysen von Kundendokumenten. Kein AI-Studio, kein Azure, kein US-Endpoint.
- Index aktualisieren.

## Was nicht angefasst wird

- `prior_year_checklists` / `prior_year_checklist_items` Schema.
- `PriorYearLocalExtractor.ts` (Fallback bleibt).
- `seedPriorYearChecklistFromInternal.ts`.

## Akzeptanzkriterien

- Upload Vorjahres-PDF → Edge-Logs zeigen Call an `europe-west6-aiplatform.googleapis.com`, kein Azure-Endpoint mehr.
- Checkliste enthält korrekt erkannte Kategorien (Lohnausweis, Wertschriftenverzeichnis, 3a, etc.) basierend auf Aargau-Codes — Qualität ≥ bisheriger lokaler Fallback, idealerweise besser.
- Bei abgeschaltetem GCP-Secret → User sieht „nutze lokale Erkennung" Toast, lokaler Pfad läuft durch.
- Keine Referenzen auf „Azure", „Microsoft" oder `azure-doc-intel` mehr im Codebase.
- README/Memory dokumentiert die Schweizer Region.

## Offene Punkte zur Bestätigung

1. **Hast du bereits ein GCP-Projekt mit Vertex AI in `europe-west6`?** Falls nein, brauchst du das vor der Implementierung (5 Min: API aktivieren + Service Account + JSON-Key).
2. **Modell**: `gemini-2.5-pro` (beste Qualität, ~3× teurer) oder `gemini-2.5-flash` (günstig, sehr gute Qualität für diesen Use-Case)?
3. **Lohnausweis-OCR** (`extract-lohnausweis`) — auch auf Vertex umstellen oder zurück auf alte Lösung?
