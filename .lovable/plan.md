
# Datenlücken schliessen für vollständigen AG eTax / eCH-0119 Export

Ziel: Maximaler Datenumfang im Export ohne den User mit Fragen zu überfluten. Direkt-Eingabe nur wo nötig, sonst OCR.

---

## P0 — Direkt ergänzen (ohne Punkt 6 = Bankverbindung)

Diese Felder werden minimal-invasiv in bestehende Formulare integriert (kein neuer Wizard-Step, sondern Erweiterung bestehender Repeater/Sektionen).

### 1. Liegenschaft — Eigenmietwert + Unterhalt strukturiert
**Datei:** `src/components/forms/RealEstateRepeater.tsx` (bestehender Repeater)
- Neues Feld `eigenmietwert` (CHF) — separat von `rental_income`
- Auswahl `maintenance_method`: `'pauschal' | 'effektiv'` (Radio)
- Bei `effektiv`: Aufteilung `werterhaltend` / `wertvermehrend` (zwei Zahlfelder)
- **Canonical:** `RealEstate` erweitern um `eigenmietwert`, `maintenance_method`, `maintenance_value_preserving`, `maintenance_value_increasing`
- **Mapper:** `mapRealEstate` in `src/domain/canonical/export/ag/mapper.ts` ergänzen

### 2. Hypotheken-Repeater (statt Yes/No)
**Datei:** Neue Komponente `src/components/forms/MortgageRepeater.tsx`, eingebunden wenn `hasMortgage = true`
- Felder pro Hypothek: `lender`, `property_id` (Verknüpfung zu RealEstate-Repeater), `balance`, `interest`
- Mapping nach `Debts.mortgages[]` (existiert bereits im Canonical)
- Im AG-Export bereits via `mapDebts` abgedeckt — nur Erfassung fehlt

### 3. Wertschriften — Verrechnungssteuer + Anschaffungswert
**Datei:** `src/components/forms/SecuritiesRepeater.tsx`
- Pro Position: `withholding_tax_amount` (35% VST-Antrag), `purchase_value`, `purchase_date` (optional)
- Toggle `request_withholding_refund` (Default true)
- **Canonical** `Security` erweitern; **Mapper** `mapAssets.securities` ergänzen

### 4. Bank-Konten — Verrechnungssteuer auf Zinsen
**Datei:** `src/components/forms/BankAccountRepeater.tsx`
- Feld `withholding_tax` pro Konto
- Canonical `BankAccount.withholding_tax`, Mapper-Ergänzung

### 5. Vehicles ins Canonical Assets
**Datei:** `src/domain/canonical/types.ts` + `mappers/fromFormData.ts`
- `Assets.vehicles[]` neu: `{ type, brand, model, year, value, plate? }`
- `VehicleRepeater`-Daten in `fromFormData` mappen
- AG-Mapper: `mapAssets` um `vehicles` erweitern + AG-Type `AGVehicle`

> **Punkt 6 (Bankverbindung Rückerstattung) wird auf Wunsch ausgelassen.**

---

## P1 — OCR-gestützter Lohnausweis-Flow

Grundgedanke: User lädt Lohnausweis-PDF/Foto hoch → OCR extrahiert alle relevanten Felder → User sieht ein **Review-Sheet** mit vorbefüllten Feldern und bestätigt/korrigiert. Keine manuellen Einzelfragen.

### Architektur

```text
EmploymentIncomeForm
  └─ "Lohnausweis hochladen" (primary CTA)
       └─ Upload → encrypted storage
            └─ Edge Function: extract-lohnausweis
                 ├─ AI Gateway (Gemini Vision)
                 ├─ Strukturierte JSON-Extraktion
                 └─ Confidence-Score pro Feld
       └─ Review-Sheet (AppBottomSheet)
            ├─ Alle Felder vorbefüllt
            ├─ Felder mit niedriger Confidence rot markiert
            ├─ User bestätigt → speichern in employment_income.extra
            └─ Fallback "Manuell eingeben" Link
```

### Neue/erweiterte Bausteine

**Edge Function:** `supabase/functions/extract-lohnausweis/index.ts`
- Auth-pflichtig (siehe `ocr-extract` Pattern)
- Input: `{ documentId, taxFilerId }`
- Lädt verschlüsseltes Dokument, entschlüsselt serverseitig (Master Key Pattern)
- Sendet an Lovable AI Gateway (`google/gemini-2.5-flash` mit JSON-Schema)
- Output: Strukturiertes Lohnausweis-Objekt nach Felder Ziff. 1–15 Lohnausweis CH

**Extrahierte Felder:**
- Bruttolohn (Ziff. 1), Gratifikation/Bonus (Ziff. 2.1), Mitarbeiterbeteiligungen (Ziff. 5)
- Verpflegungsentschädigung (Ziff. 2.2), Spesenpauschale (Ziff. 13.1.1), effektive Spesen (Ziff. 13.2)
- Geschäftsfahrzeug (Ziff. 2.2 / F)
- AHV/IV/EO (Ziff. 9), NBU (Ziff. 9), BVG-Beiträge (Ziff. 10.1), BVG-Einkauf (Ziff. 10.2)
- Quellensteuer (Ziff. 12), Kapitalleistungen (Ziff. 5)
- Beschäftigungsdauer (Ziff. 14 von/bis)
- Arbeitgeber-Adresse, AHV-Nummer Arbeitnehmer

**Komponente:** `src/components/forms/LohnausweisOcrReview.tsx`
- AppBottomSheet, full width
- Pro Feld: Label, Wert (editierbar), Confidence-Badge, Original-Vorschau-Snippet
- "Bestätigen" → Speichern in `employment_income.extra` + Verknüpfung `source_document_id`

**Speicherung:**
- Felder landen in `EmploymentIncome.extra: Record<string, unknown>` (existiert bereits)
- AG-Mapper: `mapEmployment` erweitern um `extra`-Pass-through bzw. dedizierte Felder

### Zusätzliche P1-Punkte (nur Eingabe wo OCR nicht greift)

- **Versicherungsprämien-Abzug:** kompakte Sektion unter "Abzüge" — KK/Unfall/Lebensvers./Sparzinsen (4 Zahlfelder, alle optional)
- **Behindertenkosten:** eigenes Feld in `health_costs` (`disability_costs` separat, ohne Selbstbehalt)
- **Berufsauslagen strukturiert:** km, ÖV-Abo, Verpflegungstage, Wochenaufenthalt — nur wenn `hasCommutingCosts = true`
- **Unterstützungsabzug-Repeater:** Person, Verwandtschaft, AHV, Höhe — nur wenn `hasSupportedPersons = true`
- **Kapitalleistung Vorsorge:** Sektion bei `hasPensionPayout = true` (Auszahler, Datum, Betrag, Art)

---

## P2 — Kontaktangaben erweitern (Punkt 17)

**Datei:** `src/pages/PersonalInfo.tsx` + ggf. `TaxFilers`

Neue/zusätzliche Felder in den Kontakt-Stammdaten pro Tax Filer:
- **Beruf** (Freitext)
- **Arbeitspensum** (%, 0–100)
- **Heimatort** (Bürgerort CH oder Heimatstaat)
- **Heiratsdatum** (bei `marital_status = married`)
- **Trennungs-/Scheidungsdatum** (bei `divorced/separated`)
- **Wohnsitzwechsel im Steuerjahr** (Datum + alte Adresse, optional)
- **Spouse-Stammdaten** vollständig (falls noch nicht erfasst): Vorname, Nachname, AHV, Geburtsdatum, Beruf, Pensum

**Canonical:** `Person` erweitern um `profession`, `work_percentage`, `place_of_origin`, `marriage_date`, `separation_date`, `residence_change_date`, `previous_address`.

**Mapper:** `mapPerson` in AG-Mapper ergänzen.

> **P2 Restpunkte (DA-1, Auslandeinkommen, Self-Employment Bilanz, Parteispenden, Lebensversicherung Rückkaufswert) bleiben out-of-scope dieser Phase.**

---

## Reihenfolge der Umsetzung

1. **P0 (1–5):** Canonical-Types + Mapper + UI-Erweiterungen der bestehenden Repeater
2. **P1 OCR:** Edge Function `extract-lohnausweis` + Review-Sheet + Integration in `EmploymentIncomeForm`
3. **P1 Direkteingabe-Reste:** Versicherungen, Behindertenkosten, Berufsauslagen, Unterstützung, Kapitalleistung
4. **P2:** Stammdaten in `PersonalInfo` erweitern, Spouse-Felder

## Technische Hinweise

- Alle UI: AppButton, AppBottomSheet (full width), SubpageHeader, semantic tokens — gemäss Memory.
- Lohnausweis-PDFs sind sensitiv → **Mandatory E2E Encryption** (`EncryptedDocumentService`); OCR erfolgt serverseitig nach Entschlüsselung in der Edge Function (transient, kein Logging).
- Pro Tax Filer isoliert (`tax_filer_id` Filter überall).
- AG-Export `mapper.ts` deterministisch halten — neue Felder via `compact()` einbinden, `index`-Sortierung beibehalten.
- Keine neuen Yes/No-Gates ohne folgendes Detail-Repeater (siehe Memory: `_completed: true` Flag bleibt verbindlich).

## Out of Scope (bestätigt)

- Bankverbindung Rückerstattung (P0 Punkt 6)
- DA-1, Auslandeinkommen, Self-Employment Bilanz/ER, Parteispenden, Lebensvers. Rückkaufswert
- Production-Submission-Flows / neue Canton-Adapter
