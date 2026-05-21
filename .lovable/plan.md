## Ziel

Beim Hochladen der Vorjahres-Steuererklärung läuft künftig **Azure Document Intelligence (Switzerland North)** als Standard. Der lokale pdfjs/Tesseract-Pfad bleibt als Offline-Fallback bei Azure-Fehlern (401/429/Netz). UI-Texte werden komplett von „Google Gemini" auf „Microsoft Azure" umgestellt.

## Änderungen

### `src/components/intake/PriorYearUpload.tsx`

1. **Default umkehren**: `aiEnabled` initial `true` (Azure ist Standard). Toggle bleibt sichtbar, beschriftet als „Azure Document Intelligence (Schweiz)".
2. **Kein Consent-Dialog beim ersten Toggle mehr** – Azure DI ist DSGVO-konform und braucht keine separate Zustimmung wie Gemini. Consent-Logik (`CONSENT_KEY`, `consentDialogOpen`, `confirmConsent`) entfernen.
3. **Branding austauschen**:
   - `GoogleG`-SVG raus, durch ein neutrales Azure/Microsoft-Icon (lucide `Cloud` oder `Building2` mit Primary-Tint) ersetzen.
   - Toggle-Label: „Azure Document Intelligence (Schweiz)" · Sub: „DSGVO-konform · Server in Zürich · keine Speicherung".
   - Stage-Label (Zeile 323): „Microsoft Azure analysiert dein PDF" statt „Google Gemini analysiert dein PDF".
   - Privacy-Hinweis (Zeile 405–407): „Für die Analyse wird es einmalig an Microsoft Azure Document Intelligence (Schweiz, Zürich) übermittelt und nicht gespeichert."
4. **Fallback-Logik in `handleFile`**:
   - Wenn `aiEnabled` → `runAiScan(file)` versuchen.
   - Bei Fehler (catch) → automatisch lokalen Pfad ausführen, Toast: „Azure-Analyse nicht verfügbar – nutze lokale Erkennung."
   - Wenn `aiEnabled` aus → direkt lokaler Pfad (heutige Logik).

### Keine Änderungen

- `supabase/functions/scan-prior-year-ai/index.ts` (Azure DI bereits live).
- Datenmodell / `prior_year_checklists`.
- `PriorYearLocalExtractor.ts` (bleibt Fallback).

## Akzeptanzkriterien

- Dialog beim ersten Öffnen: Toggle „Azure DI (Schweiz)" ist **an**.
- Upload startet ohne weiteren Klick die Azure-Analyse.
- Bei Azure-Fehler: lokaler Pfad läuft automatisch durch, User sieht informativen Toast statt Fehler.
- Kein einziger Verweis mehr auf „Google", „Gemini" oder „Lovable AI Gateway" in `PriorYearUpload.tsx`.
