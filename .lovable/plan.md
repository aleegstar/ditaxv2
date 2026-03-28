

## Plan: Fix Chatbot Status-Daten für Multi-Personen-Architektur

### Problem
Der Chatbot liest den Fortschritt aus `form_progress.form_sections`, wo nur `contactInfo: true` steht. Die echten Completion-Daten liegen aber in der `form_data` Tabelle (pro `form_type` mit `_completed: true` im JSON `data`-Feld). Ausserdem wird die Multi-Personen-Architektur (`tax_filer_id`) ignoriert.

**Ist-Zustand für Steuerjahr 2025, Sandro (primary):**
- `form_data`: contactInfo ✓, income ✓, assets ✓, deductions ✓ — alles ausgefüllt
- `form_progress`: zeigt nur `{contactInfo: true}` — veraltet/unvollständig
- Dokumente: 2 hochgeladen
- **Chatbot sagt fälschlicherweise**: "Persönliche Angaben, Einkommen, Vermögen und Abzüge sind noch nicht ausgefüllt"

### Änderung

**Datei: `supabase/functions/chatbot-response/index.ts`**

Die `loadUserStatusContext`-Funktion wird komplett überarbeitet:

1. **Tax Filers laden** — Alle steuerpflichtigen Personen des Users abfragen (`tax_filers` Tabelle)

2. **Completion aus `form_data` statt `form_progress`** — Für jeden Tax Filer und jedes Steuerjahr prüfen, ob `form_data` Einträge mit `_completed: true` existieren für die 4 Formularbereiche (contactInfo, income, assets, deductions)

3. **Dokumente per `tax_filer_id` zählen** — `uploaded_documents` mit `tax_filer_id` filtern

4. **Status pro Tax Filer ausgeben** — z.B.:
```text
AKTUELLER STATUS DES USERS:
- Steuerpflichtige Person: Sandro (Hauptperson)
  - Steuerjahr 2025:
    - Persönliche Angaben: ✓
    - Einkommen: ✓
    - Vermögen: ✓
    - Abzüge: ✓
    - Dokumente: 2
    - Bezahlung: ✗
- Steuerpflichtige Person: Amelia (Kind)
  - Steuerjahr 2025:
    - ...
```

### Technische Details

- Query `form_data` mit `SELECT form_type, (data->>'_completed')::boolean` statt `form_progress.form_sections`
- Gruppierung per `tax_filer_id` für korrekte Multi-Personen-Darstellung
- Nur die 4 relevanten `form_type` Werte prüfen: `contactInfo`, `income`, `assets`, `deductions` (nicht `*_progress` Einträge)
- Kein Frontend-Umbau nötig

