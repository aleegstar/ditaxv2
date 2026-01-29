

# Plan: Vollständige Multi-Person Unterstützung implementieren

## Problemursache

**1. Datenbank-Constraint fehlt `tax_filer_id`:**
```sql
-- AKTUELL (blockiert Leano's 2024 Steuererklärung):
UNIQUE (user_id, tax_year)

-- BENÖTIGT:
UNIQUE (user_id, tax_filer_id, tax_year)
```

**2. Code-Stellen ohne `tax_filer_id` Filterung:**

| Datei | Zeile | Problem |
|-------|-------|---------|
| `PaymentSection.tsx` | 136 | SELECT ohne `tax_filer_id` |
| `PaymentSection.tsx` | 142-146 | INSERT ohne `tax_filer_id` |
| `TaxYearDashboard.tsx` | 45 | SELECT ohne `tax_filer_id` |
| `UserTaxReturns.tsx` | 177-179 | DELETE ohne `tax_filer_id` |
| `DocumentChecklist.tsx` | 147 | SELECT ohne `tax_filer_id` |

---

## Schritt 1: Datenbank-Migration

```sql
-- Alte Constraint entfernen
ALTER TABLE tax_returns DROP CONSTRAINT IF EXISTS unique_user_tax_year;

-- Neue Constraint mit tax_filer_id
ALTER TABLE tax_returns 
ADD CONSTRAINT unique_user_taxfiler_tax_year 
UNIQUE (user_id, tax_filer_id, tax_year);
```

Diese Migration ist **nicht destruktiv** - keine Daten gehen verloren.

---

## Schritt 2: PaymentSection.tsx korrigieren

**Datei:** `src/components/PaymentSection.tsx`

Context-Hook hinzufügen und Queries anpassen:

```text
// Import hinzufügen
import { useTaxFiler } from '@/contexts/TaxFilerContext';

// Im Komponenten-Body
const { activeTaxFilerId } = useTaxFiler();

// Zeile 136 - SELECT mit tax_filer_id
.eq('user_id', user.id)
.eq('tax_year', year)
.eq('tax_filer_id', activeTaxFilerId)  // NEU

// Zeile 142-146 - INSERT mit tax_filer_id
.insert({
  user_id: user.id,
  tax_filer_id: activeTaxFilerId,  // NEU
  tax_year: year,
  payment_status: 'pending'
})
```

---

## Schritt 3: TaxYearDashboard.tsx korrigieren

**Datei:** `src/components/TaxYearDashboard.tsx`

```text
// Import hinzufügen
import { useTaxFiler } from '@/contexts/TaxFilerContext';

// Im Komponenten-Body
const { activeTaxFilerId } = useTaxFiler();

// Zeile 45 - SELECT mit tax_filer_id
.eq('user_id', user.id)
.eq('tax_year', taxYear)
.eq('tax_filer_id', activeTaxFilerId)  // NEU
```

---

## Schritt 4: UserTaxReturns.tsx DELETE korrigieren

**Datei:** `src/pages/UserTaxReturns.tsx`

```text
// Zeile 177-179 - DELETE mit tax_filer_id
await supabase.from('form_data').delete()
  .eq('user_id', userId)
  .eq('tax_year', year)
  .eq('tax_filer_id', activeTaxFilerId);  // NEU

await supabase.from('form_progress').delete()
  .eq('user_id', userId)
  .eq('tax_year', year)
  .eq('tax_filer_id', activeTaxFilerId);  // NEU

await supabase.from('uploaded_documents').delete()
  .eq('user_id', userId)
  .eq('tax_year', year)
  .eq('tax_filer_id', activeTaxFilerId);  // NEU
```

---

## Schritt 5: DocumentChecklist.tsx korrigieren

**Datei:** `src/components/DocumentChecklist.tsx`

```text
// Import und Context hinzufügen (falls noch nicht vorhanden)
import { useTaxFiler } from '@/contexts/TaxFilerContext';
const { activeTaxFilerId } = useTaxFiler();

// Zeile 147 - SELECT mit tax_filer_id
.eq('user_id', userId)
.eq('status', 'active')
.eq('is_assigned_to_checklist', false)
.eq('tax_year', taxYear)
.eq('tax_filer_id', activeTaxFilerId)  // NEU
```

---

## Zusammenfassung

| Änderung | Typ |
|----------|-----|
| Datenbank: `unique_user_taxfiler_tax_year` Constraint | Migration |
| `PaymentSection.tsx` | Code + Context |
| `TaxYearDashboard.tsx` | Code + Context |
| `UserTaxReturns.tsx` | Code (DELETE-Queries) |
| `DocumentChecklist.tsx` | Code + Context |

---

## Ergebnis

Nach dieser Implementierung:
- Jede Person kann ihre eigene Steuererklärung pro Jahr haben
- Leano kann eine 2024-Steuererklärung erstellen, auch wenn Sandro bereits eine hat
- Alle Daten (Formulare, Dokumente, Fortschritt) werden personenspezifisch behandelt
- Die Datenbank garantiert Eindeutigkeit auf Personenebene

