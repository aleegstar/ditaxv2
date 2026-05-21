## Ziel

Alle drei OCR-Pfade von Gemini (Lovable AI Gateway) auf **Azure Document Intelligence** (Region **Switzerland North**) umstellen. Dokumente verlassen damit weder die Schweiz noch werden sie an einen LLM-Anbieter geschickt. Strukturierte Felder werden in den Edge Functions per Regeln/Regex aus Azures Text+Tabellen-Output gewonnen — kein LLM-Fallback.

## Datenfluss neu

```text
Client (Browser/App)
   │  PDF/Bild (base64, transient)
   ▼
Supabase Edge Function (Auth-gated)
   │  POST .../prebuilt-layout:analyze    (Switzerland North, no-store)
   ▼
Azure Document Intelligence (CH-Region)
   │  AnalyzeResult JSON (Pages, Lines, Tables, KV-Pairs)
   ▼
Regel-Mapper in Edge Function
   │  Strukturierte Felder / Konten / Keyword-Matches
   ▼
Client (kein Rohtext, nur Resultate)
```

## Voraussetzungen (User-Aktion)

1. In Azure Portal: **Document Intelligence**-Ressource in *Switzerland North* erstellen (Tier S0).
2. Endpoint + Key 1 bereitlegen.
3. Lovable fragt anschliessend zwei Secrets ab:
   - `AZURE_DOC_INTEL_ENDPOINT` (z.B. `https://ditax-doc-intel.cognitiveservices.azure.com`)
   - `AZURE_DOC_INTEL_KEY`
4. (Optional, später) Customer-Managed Key + Private Endpoint für höchste Stufe.

## Änderungen

### A. Neues Shared-Modul `supabase/functions/_shared/azure-doc-intel.ts`

- `analyzeDocument(bytes: Uint8Array, mimeType, model = "prebuilt-layout")`:
  - POST `${ENDPOINT}/documentintelligence/documentModels/${model}:analyze?api-version=2024-11-30` mit `Content-Type` aus `mimeType` (oder `application/json` + base64 für ältere Variante).
  - Polling über `Operation-Location` (Intervall 1s, Timeout 60s).
  - Liefert typisiertes `AnalyzeResult` (pages.lines, pages.words, tables, keyValuePairs).
- `extractPlainText(result)` und `extractTables(result)` Helfer.
- Fehlerbehandlung: 401/403 → `azure_unauthorized`, 429 → `rate_limited`, sonst `azure_error`.
- Niemals Rohtext loggen, nur Statuscodes/Latenz.

### B. `supabase/functions/ocr-extract/index.ts` (Upload-Keyword-Matching)

- Gemini-Vision-Call entfernen.
- Bild → `analyzeDocument(..., "prebuilt-read")`.
- `extractPlainText` → case-insensitives Substring-Matching gegen das `keywords`-Array (Logik wie heute auf Modellantwort).
- Response-Shape (`{ matched: string[], duration }`) bleibt identisch, damit `CloudOcrService.ts` unverändert funktioniert.

### C. `supabase/functions/extract-lohnausweis/index.ts`

- Gemini-Tool-Calling entfernen.
- PDF/Bild → `analyzeDocument(..., "prebuilt-layout")` (Tabellen + KV).
- Neuer Mapper `mapLohnausweis(result): LohnausweisFields`:
  - Ziff. 1–15 über deutsche Label-Regexes auf `pages[].lines` + Tabellen-Zellen (z.B. Zeile beginnt mit `1. `, `8. `, `11. `, `13.1.1`).
  - Beträge: `parseChfAmount("1'234.55")`.
  - Felder F/G: Boxen werden in Layout als Tabellenzellen mit `:selected:` / `:unselected:` markiert (Selection Marks API) → bool.
  - AHV-Nr: Regex `756\.\d{4}\.\d{4}\.\d{2}`.
  - Datum `dd.mm.yyyy` → ISO.
  - `notes` (Ziff. 15): Text unterhalb der Ziff.-15-Zeile bis Seitenende.
  - `confidence`: Mittelwert der relevanten Zellen-Confidences.
- Response-Shape (`{ fields }`) bleibt identisch → `LohnausweisOcrService.ts` unverändert.

### D. `supabase/functions/scan-prior-year-ai/index.ts`

- Gemini-Call entfernen, `MODEL`/`LOVABLE_API_KEY` entfernen.
- PDF → `analyzeDocument(..., "prebuilt-layout")`.
- Neuer Mapper `extractAccountsFromTables(result): Account[]`:
  - Filter auf Tabellen, deren Header-Zellen `Kto-Nr`, `Valoren-Nr`, `Bezeichnung` enthalten (Rubrik A + B).
  - Pro Detailzeile: `reference` aus Spalte „Kto-Nr/Valoren-Nr" (IBAN-Regex `CH\d{2}[A-Z0-9]{17}` oder Depot `\d{5,14}`), `institution` aus „Bezeichnung".
  - Dedup nach `reference.replace(/\s+/g,'').toUpperCase()`.
  - Sanity-Filter `IBAN_OK` / `DEPOT_OK` (wie heute schon vorhanden) behalten.
- Bestehende Kategorien-Erkennung (`income`/`assets`/`deductions`) — heute LLM-basiert — wird ersetzt durch **Keyword-Erkennung im Layout-Text** (z.B. Vorkommen von „Lohnausweis" → `income: Lohnausweis`). `ALLOWED_LABELS` bleibt als Whitelist.
- `raw_scan._source` → `"azure_layout"`.
- Restliche DB-Logik (`prior_year_checklists` upsert, items insert, status-Updates) bleibt 1:1.

### E. Aufräumen

- `LOVABLE_API_KEY` wird nicht mehr von diesen drei Functions referenziert (bleibt im Projekt für andere Features wie `chatbot-response`, `docs-chatbot` — **nicht löschen**).
- `supabase/functions/_shared/ai-safety.ts` (`sanitizePromptInput`) bleibt für andere Functions.
- Frontend-Services (`CloudOcrService`, `LohnausweisOcrService`, `seedPriorYearChecklistFromInternal`, `usePriorYearChecklist`) bleiben unverändert — gleiches Response-Schema.

### F. Datenschutz-Dokumentation

- `SECURITY.md`: OCR-Anbieter-Tabelle aktualisieren (Gemini → Azure DI CH-North, No-Retention, kein Training auf Kundendaten).
- Datenschutzerklärung (`src/pages/Privacy.tsx`): Auftragsverarbeiter-Liste aktualisieren — Google LLC / Gemini entfernen für OCR, Microsoft Azure (CH) hinzufügen.

## Akzeptanzkriterien

- Upload eines Lohnausweis-PDFs liefert dieselben Felder wie bisher (manuelle Stichprobe an 3 Belegen).
- `scan-prior-year-ai` auf Beispiel-PDF (Yuh + UBS×3 + Post×2 + Plus500): liefert 6 deduplizierte Konten.
- Bild-Upload mit Keyword-Hint klassifiziert das Dokument identisch (`CloudOcrService` Response-Shape unverändert).
- Keine ausgehenden Requests mehr an `ai.gateway.lovable.dev` aus diesen drei Functions (Logs prüfen).
- 401 von Azure → User bekommt „OCR temporär nicht verfügbar"-Hinweis, kein Crash.

## Technische Details

- API-Version: `2024-11-30` (GA, in Switzerland North verfügbar).
- Modelle: `prebuilt-read` (nur Text, billiger) für `ocr-extract`; `prebuilt-layout` (Text + Tabellen + Selection Marks) für die beiden anderen.
- Limits: 500 MB / 2000 Seiten pro Request — wir capen weiter bei 5 MB (Lohnausweis) und 20 MB (Vorjahr).
- Polling: max 60s, sonst `azure_timeout`. Lohnausweis-PDFs liegen typisch bei 2–4s.
- Auth gegenüber Azure: Header `Ocp-Apim-Subscription-Key: ${AZURE_DOC_INTEL_KEY}`.
- Keine Speicherung — Azure DI verarbeitet transient, keine Trainingsverwendung (Subscription-Default).
- Kosten-Hinweis: ~CHF 1.50 / 1000 Seiten (Read), ~CHF 10 / 1000 Seiten (Layout). Vorher Gemini-Tokens ähnlich, aber CH-Hosting ist der Trade-off.

## Reihenfolge der Umsetzung

1. Secrets-Request (`AZURE_DOC_INTEL_ENDPOINT`, `AZURE_DOC_INTEL_KEY`).
2. Shared-Modul + `ocr-extract` migrieren, mit 1 Test-Upload validieren.
3. `extract-lohnausweis` migrieren + Mapper, an 3 Lohnausweis-Mustern validieren.
4. `scan-prior-year-ai` migrieren + Tabellen-Mapper, am Beispiel-PDF validieren.
5. `SECURITY.md` + `Privacy.tsx` aktualisieren.
