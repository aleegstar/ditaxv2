## Ziel

Pro Steuerjahr kann der User zwischen zwei Modi wählen:

1. **Begleitet** – der aktuelle Schritt-für-Schritt-Flow (unverändert).
2. **Vorjahres-Upload** – User lädt aktuelle Belege + Kopie der letzten Steuererklärung hoch. Ditax scannt die Vorjahres-Erklärung mit Lovable AI (Gemini Vision), erzeugt eine **personalisierte Checkliste** (Arbeitgeber X, Liegenschaft Y, Säule 3a …) und fragt pro Position einzeln, ob es Änderungen gab; pro Position kann der passende Beleg hochgeladen werden.

Modus ist jederzeit wechselbar; eingegebene Daten bleiben erhalten.

## User-Flow

```text
Tax-Year Dashboard (neuer Jahres-Eintrag)
        │
        ▼
┌──────────────────────────────────────┐
│   Modus wählen (Bottom-Sheet)        │
│   ─ Begleitet  ─ Vorjahres-Upload    │
└──────────────────────────────────────┘
        │                       │
        ▼                       ▼
  bestehender Flow      Upload Vorjahres-PDF
                              │
                              ▼
                   Edge Function: scan-prior-year
                   (Gemini Vision → JSON-Checkliste)
                              │
                              ▼
                 Checklisten-Ansicht je Position:
                   • Beleg hochladen
                   • "Gab es Änderungen?" Ja/Nein/Freitext
                   • Position erledigt ✓
                              │
                              ▼
              Übersicht → Einreichen (selber wie heute)

  Modus-Switch jederzeit oben rechts ("Modus wechseln")
```

## Umfang der Änderungen

### 1. Datenbank (Migration)

- Neue Spalte `tax_returns.intake_mode` (`text`, default `'guided'`, check in `'guided','prior_year_upload'`).
- Neue Tabelle `prior_year_checklists` (id, tax_filer_id, tax_year, status, raw_scan jsonb, generated_at, updated_at) — RLS pro user_id/tax_filer_id.
- Neue Tabelle `prior_year_checklist_items` (id, checklist_id, category enum `income|assets|deductions|contact`, label, source_value text, change_status enum `unchanged|changed|new|removed|pending`, change_note text, document_id uuid nullable → `documents.id`, completed bool). RLS via parent checklist.
- Storage: neuer Pfad `prior-year-returns/{user_id}/{filer_id}/{tax_year}.pdf` (private Bucket, RLS path-based).

### 2. Edge Function `scan-prior-year`

- Input: `{ taxFilerId, taxYear, storagePath }`.
- Lädt PDF aus Storage (entschlüsselt falls nötig – siehe `EncryptedDocumentService`).
- Ruft Lovable AI Gateway (`google/gemini-3-flash-preview`, AI SDK `generateText` mit `Output.object`) mit Schema:
  ```
  {
    contact:    [{ label, value }],
    income:     [{ label, value, employer? }],
    assets:     [{ label, value, type? }],
    deductions: [{ label, value }]
  }
  ```
- Speichert `raw_scan` und expandiert es zu `prior_year_checklist_items` (eine Zeile pro Position).
- CORS, JWT-Validierung, Zod-Input-Validierung.

### 3. Frontend

**Neue Komponenten** (`src/components/intake/`):
- `IntakeModeSheet.tsx` – `AppBottomSheet`, zwei Karten (Begleitet / Vorjahres-Upload).
- `PriorYearUpload.tsx` – Drag&Drop-Upload für Vorjahres-PDF + Status (Scanning…).
- `PriorYearChecklist.tsx` – Liste der generierten Positionen, je Position:
  - Label + Vorjahreswert (read-only Pill)
  - Toggle "Unverändert / Geändert / Entfällt"
  - Optionales Freitextfeld bei "Geändert"
  - Inline Document-Upload (verwendet bestehenden `EncryptedDocumentService`)
- `ChecklistProgress.tsx` – Fortschrittsanzeige analog 6-Step-Bar.

**Anpassungen**:
- `TaxYearDashboard.tsx`: rendert je nach `intake_mode` entweder den bestehenden Sections-Block (guided) oder `PriorYearChecklist`. Header bekommt „Modus wechseln"-Button (öffnet `IntakeModeSheet`).
- `pages/Index.tsx`: liest `intake_mode` aus tax_returns, leitet bei `prior_year_upload` ohne Scan auf `PriorYearUpload`, bei vorhandenem Scan auf `PriorYearChecklist`.
- `FormContext` bekommt neue Helper: `intakeMode`, `setIntakeMode(mode)`, `priorYearChecklist`-State + Reload.
- Beim ersten Aufruf eines neuen Tax-Years (kein `intake_mode` gesetzt) öffnet sich automatisch `IntakeModeSheet`.

### 4. Mapping Checkliste → Tax-Return

Beim Einreichen werden Checklisten-Items in das bestehende Canonical-Modell gemappt (analog `importFromPreviousYear`, aber pro Item mit `change_status` als Hinweis für das Backoffice). „Unverändert"-Items übernehmen Vorjahreswerte 1:1. Geänderte Items werden als „needs review" markiert.

### 5. Wechsel zwischen Modi

- Bei Modus-Wechsel bleiben Daten in `form_data` und `prior_year_checklist_items` parallel bestehen. Es wird nur `tax_returns.intake_mode` geändert. Toast: „Modus gewechselt, deine Daten bleiben erhalten."

## Technische Details

- Lovable AI Gateway via Edge Function (`LOVABLE_API_KEY` server-seitig). Modell `google/gemini-3-flash-preview`. Vision-Eingabe via `messages: [{ role:'user', content:[{type:'file', data:base64, mimeType:'application/pdf'}, …] }]` oder als seitenweise gerenderte Bilder, falls PDF-Direkteingabe nicht klappt.
- Strukturiertes Output mit `Output.object` + Zod-Schema.
- Vorjahres-PDF wird wie alle Tax-Docs **mandatorisch E2E-verschlüsselt** (`EncryptedDocumentService`). Edge Function erhält Entschlüsselungs-Key über bestehende Pipeline.
- RLS auf neuen Tabellen via `has_role`/`tax_filer_id`-Match, identisch zum bestehenden Muster.
- Keine neuen Secrets nötig (`LOVABLE_API_KEY` vorhanden).

## Out-of-Scope (für diesen Plan)

- Mehrjahresvergleiche / Trendanalysen.
- Auto-Detection des Vorjahres-Kantons (vorerst Aargau-Layout, andere Kantone best-effort).
- Admin-Backoffice-UI für die neuen Felder (kommt in Folge-Iteration; Daten sind aber persistiert).

## Offene Punkte

- Begriff im UI: „Begleitet" vs. „Express-Modus" vs. „Schritt-für-Schritt"? Aktuell verwende ich **„Begleitet"** und **„Vorjahres-Upload"**.
- Soll bei Vorjahres-Upload zusätzlich die Pflicht bestehen, das aktuelle Lohnausweis-PDF separat hochzuladen, oder reicht die Checklisten-getriebene Upload-Logik?
