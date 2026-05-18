# Opt-in: KI-gestützter Scan (Google Gemini) – DSGVO-konform

## Idee
Zusätzlich zum bisherigen rein lokalen Pfad (PDF.js + Tesseract on-device) bekommt der User unter dem "PDF auswählen"-Button einen **Toggle**:

> ⦿ Google Gemini · KI-gestützte Analyse (genauer, schneller)
> _Dein PDF wird verschlüsselt an Google Gemini (EU) übermittelt und nach Verarbeitung sofort gelöscht._

Standard: **aus**. Erst wenn der User ihn aktiv einschaltet (und damit ausdrücklich einwilligt), läuft die Analyse über die Edge Function mit Vollbild-Vision-Modell – sonst bleibt alles wie bisher (lokal).

## UX-Änderungen in `src/components/intake/PriorYearUpload.tsx`

- Unter dem Button neue Zeile mit:
  - kleinem Google-G-Icon (Inline-SVG, nicht das Lucide-`Bot`)
  - Label "KI-gestützte Analyse (Google Gemini)"
  - Sub-Label "Genauer für gescannte PDFs · DSGVO-konform"
  - `Switch` (shadcn) rechts
- Klick auf den Switch öffnet beim ersten Aktivieren einen `AppDialog` mit der Einwilligung:
  - Was übermittelt wird (das PDF, **nicht** Account-Daten)
  - Wer es verarbeitet (Google Gemini, EU-Region via Lovable AI Gateway)
  - Zweckbindung (nur Erstellung der Checkliste)
  - Speicherung (kein Persistieren der PDF auf unseren Servern; Gemini-Retention = 0)
  - Buttons: "Zustimmen & aktivieren" / "Abbrechen"
- Bestätigung wird mit Timestamp in `localStorage` (`ditax.aiScanConsent.v1`) und in `prior_year_checklists.ai_consent_at` (siehe Migration) gespeichert. Beim nächsten Mal nicht mehr nachfragen, Switch kann ohne Dialog umgeschaltet werden.
- Privacy-Hinweis-Card unten passt sich dem Modus dynamisch an ("Lokale Verarbeitung" vs. "KI-Verarbeitung mit Google Gemini").

## Verarbeitungs-Flow

```
Switch AUS (Default)                    Switch AN
─────────────────────                   ─────────
1. pdfjs Text-Layer                     1. Upload PDF (verschlüsselt) an
2. Tesseract OCR (lokal)                   neue Edge Function `scan-prior-year-ai`
3. Regex-Mapping                        2. Gemini 2.5 Flash (Vision) extrahiert
4. Optional: pseudonym. Text               benötigte Dokumentenliste
   an Gemini (Fallback)                 3. Function schreibt Items
                                        4. PDF wird sofort verworfen
                                           (nichts in Storage)
```

## Backend

### Neue Edge Function `scan-prior-year-ai`
- Accepts `multipart/form-data` mit `file`, `taxFilerId`, `taxYear`.
- Prüft JWT, prüft `ai_consent_at` für diesen User+Filer in DB (Server-Side-Guard – Client-Toggle alleine reicht nicht).
- Sendet PDF base64 an Lovable AI Gateway (`google/gemini-2.5-flash`, vision messages).
- Gleicher System-Prompt wie heute: **nur** Dokumenten-Labels pro Kategorie, keine Werte/PII.
- Schreibt Items in `prior_year_checklist_items` (gleiche Tabelle, gleiche Struktur).
- PDF nie speichern, nie loggen.

### DB-Migration
- `ALTER TABLE prior_year_checklists ADD COLUMN ai_consent_at timestamptz;`
- Wird beim ersten Aktivieren des Switches per RPC/Update gesetzt (RLS: nur eigener Filer).
- Verwendet als Audit-Trail (wer hat wann zugestimmt) – wichtig für DSGVO Art. 7 Abs. 1.

## Rechtliches / Wording (kurz, Du-Form)
> "Wenn Du die KI-gestützte Analyse aktivierst, übermitteln wir Dein hochgeladenes PDF an Google Gemini (Region EU) zur einmaligen Auswertung. Es werden **nur** die benötigten Dokumenten-Kategorien zurückgegeben – keine Beträge, Namen oder Adressen. Dein PDF wird nach der Verarbeitung sofort verworfen und nicht von uns oder Google gespeichert. Du kannst diese Funktion jederzeit wieder deaktivieren."

(Ergänzung in `Privacy.tsx` als zusätzlicher Absatz – als kleiner Folge-Patch, gleicher Loop.)

## Was bleibt unverändert
- Bestehender Lokal-Pfad, OCR-Fallback, Regex-Mapping (`PriorYearLocalExtractor`).
- Vorhandene `scan-prior-year` Edge Function (anonymisierter Text-Fallback) – wird weiter für Stufe 3 im lokalen Pfad benutzt.
- Datenbank-Struktur der Checklisten/Items.

## Risiken
- Wenn Gemini doch mal Beträge zurückspielt: harter Server-Filter, der `value`-Felder ignoriert und Labels gegen Whitelist matcht (gleiche Liste wie im Lokal-Extractor).
- Falls Lovable-AI-Gateway das Modell wechselt: Model-String zentral in der Function konstantieren.
