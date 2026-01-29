
# Plan: Tax Filer Wechsel-Funktion implementieren

## Problem
Du hast 2 Personen (Tax Filers) angelegt, aber es gibt keine Möglichkeit, zwischen ihnen zu wechseln. Das System lädt immer automatisch den primären Benutzer (dich selbst).

## Lösung
Die vorhandene `TaxFilerSelector`-Komponente wird an zwei wichtigen Stellen in die App eingebaut, damit du einfach zwischen den Personen wechseln kannst.

---

## Änderungen

### 1. Tax Filer Selector auf dem Formular-Dashboard hinzufügen
**Datei:** `src/components/TaxYearDashboard.tsx`

Der Personen-Wähler wird direkt unter dem Header eingefügt:
- Zeigt die aktuell ausgewählte Person an
- Ermöglicht den Wechsel zwischen allen verfügbaren Personen per Dropdown
- Wird nur angezeigt, wenn mehr als eine Person vorhanden ist

### 2. Tax Filer Selector auf dem Haupt-Dashboard hinzufügen
**Datei:** `src/pages/UserTaxReturns.tsx`

Ein kompakter Personen-Wähler wird im Greeting-Bereich eingefügt:
- Zeigt "Steuererklärung für: [Name]" an
- Ermöglicht den Wechsel zwischen Personen
- Wird nur angezeigt, wenn mehr als eine Person vorhanden ist

---

## Technische Details

### Import der benötigten Komponenten
```text
- TaxFilerSelector aus '@/components/dashboard/TaxFilerSelector'
- useTaxFiler aus '@/contexts/TaxFilerContext'
```

### Integration in TaxYearDashboard
Der Selector wird zwischen Header und dem ersten Step eingefügt:

```text
+------------------------------------+
|  ← Steuererklärung 2029    [Avatar]|  <- Header
+------------------------------------+
|  👤 Person: [Dropdown Selector]    |  <- NEU: Tax Filer Selector
+------------------------------------+
|  1. Persönliche Angaben           |
|  ...                               |
+------------------------------------+
```

### Integration in UserTaxReturns
Der Selector wird im Greeting-Bereich eingefügt:

```text
+------------------------------------+
|  ditax Logo        [Notification]  |
+------------------------------------+
|  Guten Tag                         |
|  Sandro                            |
|  📋 Für: [Chiara ▼] verwalten     |  <- NEU: Kompakter Selector
+------------------------------------+
|  [Steuerjahr-Karten]               |
+------------------------------------+
```

### Verhalten beim Wechsel
Wenn du eine andere Person auswählst:
1. Der `activeTaxFilerId` wird im Context aktualisiert
2. Die Formulardaten werden automatisch für diese Person neu geladen
3. Alle Eingaben und Dokumente werden separat pro Person gespeichert

---

## Betroffene Dateien
| Datei | Änderung |
|-------|----------|
| `src/components/TaxYearDashboard.tsx` | TaxFilerSelector unter Header einfügen |
| `src/pages/UserTaxReturns.tsx` | Kompakten TaxFilerSelector im Greeting-Bereich einfügen |

---

## Ergebnis
Nach dieser Änderung kannst du:
- Auf dem Haupt-Dashboard sehen, für welche Person du gerade arbeitest
- Einfach zwischen Personen wechseln, ohne zur Verwaltungsseite zu gehen
- Separate Steuererklärungen für jede Person führen
