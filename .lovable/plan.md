# Vorjahr aus Ditax übernehmen — ohne Upload

## Ziel

Wenn der/die Nutzer:in das Vorjahr (z.B. 2024) bereits bei Ditax gemacht hat, soll der Upload entfallen. Stattdessen wird automatisch eine `prior_year_checklists`-Checkliste aus den vorhandenen `form_data` generiert, und der/die Nutzer:in landet direkt im bekannten Bestätigungs-Flow (`PriorYearChecklistBody`) — genau gleich wie nach einem PDF-Upload und OCR-Scan.

## Verhalten

**Erkennung (Dashboard, beim Laden der Tax-Year-Karte):**
- Für `taxYear - 1`, gleicher `tax_filer_id`, gleicher `user_id`: prüfen ob in `form_data` mindestens eine Sektion mit `_completed: true` existiert (income / assets / deductions / contactInfo).
- Flag `hasInternalPriorYear` in State setzen.

**IntakeModePicker / IntakeModeSheet (`prior_year_upload`-Kachel):**
- Wenn `hasInternalPriorYear === true`:
  - Titel: „Vorjahres-Daten aus Ditax übernehmen"
  - Beschreibung: „Wir kennen deine Steuererklärung {prev} schon. Du musst nur noch bestätigen, was sich geändert hat — kein Upload nötig."
  - Badge: „In Sekunden"
  - CTA: „Daten übernehmen"
- Sonst: bisherige „Steuererklärung {prev} hochladen"-Variante unverändert.

**Auswahl der Kachel (`handleSelectMode('prior_year_upload')`):**
1. `tax_returns.intake_mode = 'prior_year_upload'` setzen (wie heute).
2. Wenn `hasInternalPriorYear`: vor dem Anzeigen des `PriorYearChecklistBody` einmalig eine neue Hilfsfunktion `seedChecklistFromInternalPriorYear({ userId, taxFilerId, taxYear })` aufrufen, die idempotent eine `prior_year_checklists`-Zeile mit `status = 'ready'`, `source = 'ditax_prior_year'` anlegt + dazugehörige `prior_year_checklist_items` einfügt.
3. Anschliessend rendert die bestehende Checklist-UI unverändert — Nutzer:in bestätigt Kategorien und tippt Beträge.

**Idempotenz / Re-Run:**
- `seedChecklistFromInternalPriorYear` läuft nur wenn keine `prior_year_checklists`-Zeile für (`tax_filer_id`, `tax_year`) existiert. Bestehende Checklisten (z.B. nach Upload) werden nie überschrieben.
- „Daten neu laden"-Aktion in der Checklist-Card: zusätzlicher Button „Aus Vorjahres-Daten neu erzeugen", der nach Bestätigung die Checklist + Items löscht und neu seedet.

## Mapping form_data → Checklist-Items

Die Hilfsfunktion liest die drei Sektionen `income`, `assets`, `deductions` aus `form_data` (Vorjahr) und erzeugt Items analog zur OCR-Logik:

```text
income
  - jeder Eintrag in `employers[]`      → "Lohnausweis – {employerName}"
  - `rentalIncomes[]`                   → "Mieteinnahmen – {address}"
  - `dividends[]`                       → "Wertschriften – {institution}"
  - `freelanceIncome[]`                 → "Selbständige Tätigkeit – {description}"
  - Boolean-Flags (AHV, IV, ALV, …)     → je ein Item mit Standard-Label

assets
  - `properties[]`                       → "Liegenschaft – {address}"
  - `vehicles[]`                         → "Fahrzeug – {make} {model}"
  - `debts[]`                            → "Schuldnachweis – {creditor}"
  - Bankkonten-Flag                      → "Bankauszüge per 31.12."

deductions
  - `supportedPersons[]`                 → "Unterstützungs-Nachweis – {name}"
  - `maintenancePayments[]`              → "Alimente – {recipient}"
  - Berufskosten-Flag                    → "Berufskosten-Belege"
  - Versicherungs-Flag                   → "Versicherungsprämien-Nachweis"
  - Säule-3a-Flag                        → "Säule-3a-Bescheinigung"
  - Krankheitskosten-Flag                → "Krankheitskosten-Belege"

contact
  - Wird über die bestehende `contact_changes_confirmed_at`-Logik abgehandelt; Items sind nicht nötig.
```

Mapping-Tabelle wird zentral in `src/components/intake/internalPriorYearMapping.ts` definiert und ist erweiterbar.

## Bestätigungs-Flow

Unverändert: `PriorYearChecklistBody` zeigt pro Kategorie die Frage „Brauchst du diese Belege wieder?" mit den generierten Items. Quelle (`raw_scan._source = 'ditax_prior_year'`) wird im Header dezent angezeigt: „Aus deiner Steuererklärung {prev} übernommen".

Der „Datei ersetzen / hochladen"-Button im Checklist-Header wird ausgeblendet, wenn `source = 'ditax_prior_year'` und kein PDF in `source_storage_path` liegt. Stattdessen: „PDF stattdessen hochladen" — öffnet das bestehende Upload-Sheet.

## Technische Details

**Neue Dateien**
- `src/components/intake/internalPriorYearMapping.ts` — Mapping form_data → Items.
- `src/services/seedPriorYearChecklistFromInternal.ts` — Idempotente Seed-Funktion (rein client-seitig, nutzt `supabase.from('form_data')` lesend und `prior_year_checklists` / `prior_year_checklist_items` schreibend; bestehende RLS reicht).

**Änderungen**
- `src/components/TaxYearDashboard.tsx`
  - State `hasInternalPriorYear` + Effect (Query auf `form_data`, taxYear-1, gleicher Filer).
  - In `handleSelectMode('prior_year_upload')`: wenn Flag gesetzt → `seedPriorYearChecklistFromInternal` aufrufen, dann `setIntakeMode('prior_year_upload')`.
  - Prop `hasInternalPriorYear` an `IntakeModePicker` / `IntakeModeSheet` weiterreichen.
- `src/components/intake/IntakeModePicker.tsx` & `IntakeModeSheet.tsx`
  - Neue Prop `hasInternalPriorYear?: boolean` — Titel/Desc/Badge/CTA der ersten Kachel umschalten.
- `src/components/intake/PriorYearChecklist.tsx`
  - Header-Subtitle dynamisch je nach `raw_scan._source`.
  - „Ersetzen"-Button konditional umlabeln.

**Keine Schema-Änderung nötig** — `prior_year_checklists.source_storage_path` bleibt nullable, `raw_scan` (jsonb) trägt `_source: 'ditax_prior_year'`.

## Out of Scope

- Keine Übernahme von CHF-Beträgen — Nutzer:in trägt aktuelle Werte neu ein (wie heute bei Upload-Flow).
- Keine Änderung an `importFromPreviousYear`-Logik in `FormContext` — die bestehende „Strukturen übernehmen"-Funktion bleibt für die manuelle Sektion-Bearbeitung.
- Keine neue Edge Function.
