
# Multi-Personen-Steuererklarungen

## Ubersicht

Aktuell ist jede Steuererklarung direkt mit einem User-Account verknupft (`user_id` in `tax_returns`). Das bedeutet: **1 Account = 1 Person = mehrere Jahre**. Wenn ein Elternteil Steuererklarungen fur sich selbst und 2 Kinder erstellen mochte, benotigt er aktuell 3 separate Accounts.

Die Losung ist ein **Steuerpflichtigen-Konzept (Tax Filer / Steuerperson)**, das zwischen dem User-Account und den Steuererklarungen steht.

```text
Aktuelle Struktur:
+------------------+       +------------------+
|      User        | 1:n   |   Tax Return     |
|   (Account)      |------>|   (2023, 2024)   |
+------------------+       +------------------+

Neue Struktur:
+------------------+       +------------------+       +------------------+
|      User        | 1:n   |   Tax Filer      | 1:n   |   Tax Return     |
|   (Account)      |------>|   (Person)       |------>|   (2023, 2024)   |
+------------------+       +------------------+       +------------------+
                           |  - Max Muster    |
                           |  - Anna (Kind)   |
                           |  - Leo (Kind)    |
                           +------------------+
```

---

## Technischer Plan

### 1. Neue Datenbank-Tabelle: `tax_filers`

```sql
CREATE TABLE public.tax_filers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  date_of_birth date,
  relationship text, -- 'self' | 'child' | 'spouse' | 'parent' | 'other'
  ahv_number text,
  is_primary boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS aktivieren
ALTER TABLE public.tax_filers ENABLE ROW LEVEL SECURITY;

-- User kann nur eigene Steuerpflichtigen sehen/bearbeiten
CREATE POLICY "Users can manage own tax filers" ON public.tax_filers
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

### 2. Bestehende Tabellen erweitern

Alle Tabellen, die aktuell `user_id` verwenden, benotigen eine zusatzliche `tax_filer_id` Spalte:

| Tabelle | Anderung |
|---------|----------|
| `tax_returns` | + `tax_filer_id uuid REFERENCES tax_filers(id)` |
| `form_data` | + `tax_filer_id uuid REFERENCES tax_filers(id)` |
| `form_progress` | + `tax_filer_id uuid REFERENCES tax_filers(id)` |
| `uploaded_documents` | + `tax_filer_id uuid REFERENCES tax_filers(id)` |
| `completed_tax_returns` | + `tax_filer_id uuid REFERENCES tax_filers(id)` |

### 3. Migration fur bestehende User

```sql
-- Fur jeden existierenden User einen primaren Tax Filer erstellen
INSERT INTO tax_filers (user_id, first_name, last_name, relationship, is_primary)
SELECT 
  p.id,
  COALESCE(p.first_name, 'Unbekannt'),
  COALESCE(p.last_name, ''),
  'self',
  true
FROM profiles p;

-- Bestehende tax_returns mit dem neuen tax_filer verknupfen
UPDATE tax_returns tr
SET tax_filer_id = tf.id
FROM tax_filers tf
WHERE tr.user_id = tf.user_id AND tf.is_primary = true;
```

### 4. Frontend-Anderungen

#### A. Neuer Personen-Wahler im Dashboard

**Komponente: `TaxFilerSelector.tsx`**
- Dropdown/Tabs zur Auswahl der Person
- "Person hinzufugen" Button
- Aktive Person wird im Context gespeichert

#### B. Personen-Verwaltungsseite: `/tax-filers`

- Liste aller Steuerpflichtigen
- Formular zum Hinzufugen neuer Personen (Name, Geburtsdatum, Beziehung)
- Bearbeiten/Loschen von Personen
- "Primary" Person kann nicht geloscht werden

#### C. Anpassung der Datenladung

**FormContext.tsx erweitern:**
```typescript
// Neuer State
const [activeTaxFilerId, setActiveTaxFilerId] = useState<string | null>(null);

// Datenladung mit tax_filer_id filtern
const { data } = await supabase
  .from('form_data')
  .select('*')
  .eq('tax_year', yearToLoad)
  .eq('tax_filer_id', activeTaxFilerId);
```

#### D. Dashboard (UserTaxReturns.tsx)

- Steuererklarungen nach Person gruppieren
- Personen-Switcher im Header
- Separate Fortschrittsanzeige pro Person

### 5. UX-Flow fur Benutzer

1. **Neuer Benutzer:** Automatisch wird ein "Ich selbst" Tax Filer erstellt
2. **Person hinzufugen:** 
   - Im Dashboard "Person hinzufugen" klicken
   - Namen, Geburtsdatum, Beziehung eingeben
   - Person erscheint im Personen-Wahler
3. **Steuererklarung erstellen:** 
   - Person auswahlen
   - Jahr auswahlen
   - Formular ausfullen (pro Person separiert)

---

## Implementierungsreihenfolge

| Phase | Aufwand | Beschreibung | Status |
|-------|---------|--------------|--------|
| 1 | ~2h | Datenbank: `tax_filers` Tabelle + RLS | ✅ Fertig |
| 2 | ~2h | Migration: Bestehende User zu Tax Filern | ✅ Fertig |
| 3 | ~4h | Frontend: `TaxFilerSelector` + Context | ✅ Fertig |
| 4 | ~3h | Frontend: Personen-Verwaltungsseite | ✅ Fertig |
| 5 | ~4h | Anpassung aller Queries (FormContext, Hooks) | ⏳ Ausstehend |
| 6 | ~2h | Dashboard-Anpassung + Integration | ⏳ Ausstehend |

**Gesamtaufwand:** ~17 Stunden

---

## Vorteile dieser Losung

- **Ruckwartskompatibel:** Bestehende Benutzer behalten ihre Daten
- **Skalierbar:** Beliebig viele Personen pro Account
- **Sauber getrennt:** Jede Person hat eigene Formulardaten
- **Flexibel:** Kann spater fur Ehepartner-gemeinsame Steuererklarung erweitert werden

---

## Alternative: Einfachere Losung

Falls der volle Umfang zu gross ist, gibt es eine **Minimal-Variante**:

**"Steuererklarung fur andere Person"** als Tag/Label auf bestehenden Steuererklarungen:
- Neues Feld `behalf_of_name` in `tax_returns`
- Im Dashboard wird der Name angezeigt
- Keine separate Personenverwaltung
- Nachteil: Weniger strukturiert, keine Wiederverwendung der Personendaten uber Jahre

---

Soll ich mit der vollstandigen Losung (Multi-Personen) oder der einfacheren Variante (Label) beginnen?
