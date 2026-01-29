
# Plan: Dedizierte Personenauswahl-Seite statt Dropdown

## Aktuelle Situation
- Bei mehreren Personen erscheint ein **Dropdown auf der Hauptseite** (`TaxFilerSelector`)
- Der Benutzer kann während der Arbeit zwischen Personen wechseln
- Dies kann verwirrend sein, da man möglicherweise versehentlich Daten für die falsche Person sieht

## Neue Lösung
Eine **dedizierte Personenauswahl-Seite** erscheint **vor dem Dashboard**, wenn mehr als eine Person vorhanden ist. Erst nach der Auswahl wird das Dashboard angezeigt.

---

## Benutzerfluss

```text
Login → Personen prüfen
         ↓
    Nur 1 Person? → Dashboard (/)
         ↓
    Mehrere Personen? → Personenauswahl-Seite (/select-person)
                              ↓
                        Person wählen → Dashboard (/)
```

---

## Technische Änderungen

### 1. Neue Seite erstellen: `/select-person`
**Neue Datei:** `src/pages/SelectPerson.tsx`

- Zeigt alle verfügbaren Personen als anklickbare Karten
- Beim Klick wird `setActiveTaxFilerId` gesetzt und zur Hauptseite navigiert
- Option "Person hinzufügen" am Ende
- Design: Saubere, moderne Karten im bestehenden Stil

### 2. TaxFilerContext erweitern
**Datei:** `src/contexts/TaxFilerContext.tsx`

Neue Felder hinzufügen:
| Feld | Beschreibung |
|------|--------------|
| `hasMultipleFilers` | Boolean - ob mehr als 1 Person existiert |
| `selectionConfirmed` | Boolean - ob Person explizit gewählt wurde |
| `confirmSelection()` | Methode zum Bestätigen der Auswahl |
| `resetSelection()` | Methode zum Zurücksetzen (bei Logout) |

### 3. UserTaxReturns.tsx anpassen
**Datei:** `src/pages/UserTaxReturns.tsx`

- Prüfen ob `hasMultipleFilers && !selectionConfirmed`
- Falls ja: Redirect zu `/select-person`
- `TaxFilerSelector` Dropdown entfernen

### 4. Alle geschützten Seiten absichern
**Betroffene Dateien:**
- `src/pages/Documents.tsx`
- `src/pages/Index.tsx` (Form)
- Andere geschützte Routen

Prüflogik am Anfang:
```text
if (hasMultipleFilers && !selectionConfirmed) {
  navigate('/select-person');
  return null;
}
```

### 5. App.tsx Route hinzufügen
**Datei:** `src/App.tsx`

Neue Route registrieren:
```text
<Route path="/select-person" element={<SelectPerson />} />
```

### 6. Header mit aktiver Person anzeigen
**Datei:** `src/components/ui/welcome-header.tsx` oder neuer Header

- Bei mehreren Personen: Anzeige der aktuell ausgewählten Person
- Klick darauf → zurück zu `/select-person`

---

## UI-Design für Personenauswahl-Seite

- **Header:** "Für wen möchtest du arbeiten?"
- **Karten:** Pro Person eine Karte mit:
  - Avatar/Icon
  - Name
  - Beziehung (Kind, Ehepartner, etc.)
  - Anzahl offener Steuererklärungen
- **Footer:** "Person hinzufügen" Button → führt zu `/tax-filers`
- **Stil:** Konsistent mit bestehendem Card-Design (rounded-[2.5rem], Schatten)

---

## Zusammenfassung der Dateien

| Datei | Änderung |
|-------|----------|
| `src/pages/SelectPerson.tsx` | **NEU** - Personenauswahl-Seite |
| `src/contexts/TaxFilerContext.tsx` | `selectionConfirmed`, `hasMultipleFilers` hinzufügen |
| `src/pages/UserTaxReturns.tsx` | Redirect-Logik, Dropdown entfernen |
| `src/pages/Documents.tsx` | Redirect-Logik hinzufügen |
| `src/pages/Index.tsx` | Redirect-Logik hinzufügen |
| `src/App.tsx` | Route `/select-person` hinzufügen |
| `src/components/dashboard/TaxFilerSelector.tsx` | Zu Header-Anzeige umbauen (ohne Dropdown) |

---

## Ergebnis

Nach dieser Änderung:
- Bei mehreren Personen wird zuerst die Person gewählt
- Alle nachfolgenden Seiten zeigen Daten für diese Person
- Kein versehentliches Arbeiten mit falschen Daten
- Klare visuelle Bestätigung, für wen man arbeitet
- Möglichkeit, jederzeit zur Personenauswahl zurückzukehren
