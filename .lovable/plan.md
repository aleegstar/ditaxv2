
# Plan: Session-Persistenz für die Personenauswahl

## Problem

Aktuell wird die `selectionConfirmed` Variable nur im React State gehalten. Bei jeder Seitenaktualisierung oder Navigation wird der Zustand zurückgesetzt und der Benutzer muss erneut eine Person auswählen - obwohl er bereits eine gewählt hat.

---

## Lösung

Die Auswahl wird im `sessionStorage` gespeichert, sodass sie für die Dauer der Browser-Session erhalten bleibt. Erst nach Logout oder Schliessen des Browsers muss der Benutzer erneut wählen.

---

## Technischer Ansatz

### TaxFilerContext.tsx anpassen

1. **Initialisierung aus sessionStorage**
   - Beim Laden prüfen, ob ein `selectedTaxFilerId` im sessionStorage existiert
   - Falls ja: `activeTaxFilerId` und `selectionConfirmed` entsprechend setzen

2. **Persistenz bei Auswahl**
   - Wenn `confirmSelection()` aufgerufen wird: ID in sessionStorage speichern
   - Wenn `setActiveTaxFilerId()` mit neuer ID aufgerufen wird: ebenfalls speichern

3. **Bereinigung bei Logout**
   - In der `onAuthStateChange`-Logik: sessionStorage-Eintrag löschen wenn Session endet

```text
// Beispiel Pseudocode
const SESSION_KEY = 'ditax_selected_tax_filer';

// Beim Initialisieren
const storedFilerId = sessionStorage.getItem(SESSION_KEY);
if (storedFilerId) {
  setActiveTaxFilerId(storedFilerId);
  setSelectionConfirmed(true);
}

// Bei Auswahl
const confirmSelection = () => {
  setSelectionConfirmed(true);
  if (activeTaxFilerId) {
    sessionStorage.setItem(SESSION_KEY, activeTaxFilerId);
  }
};

// Bei Logout
sessionStorage.removeItem(SESSION_KEY);
```

---

## Ablauf nach Implementierung

```text
┌─────────────────────────────────────────────────────────────────┐
│                         LOGIN                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │ sessionStorage hat Auswahl?   │
              └───────────────────────────────┘
                    │               │
                   Ja              Nein
                    │               │
                    ▼               ▼
        ┌───────────────┐   ┌───────────────────────┐
        │  Dashboard    │   │ Mehrere Personen?     │
        │  direkt       │   └───────────────────────┘
        └───────────────┘         │           │
                                 Ja          Nein
                                  │           │
                                  ▼           ▼
                        ┌────────────┐  ┌───────────────┐
                        │ /select-   │  │ Dashboard     │
                        │  person    │  │ (Primär auto) │
                        └────────────┘  └───────────────┘
                                │
                                ▼
                     Benutzer wählt Person
                                │
                                ▼
                    sessionStorage speichern
                                │
                                ▼
                          Dashboard
```

---

## Dateien die geändert werden

| Datei | Änderung |
|-------|----------|
| `src/contexts/TaxFilerContext.tsx` | Session-Persistenz hinzufügen |

---

## Verhalten nach der Änderung

- **Erster Login mit mehreren Personen**: Personenauswahl wird angezeigt
- **Nach Auswahl**: Auswahl wird in sessionStorage gespeichert
- **Seitenneulade/Navigation**: Keine erneute Auswahl nötig
- **Aktiver Wechsel**: Über TaxFilerSelector auf Dashboard → zurück zur Auswahl
- **Logout**: sessionStorage wird gelöscht, beim nächsten Login wieder Auswahl
- **Browser/Tab schliessen**: sessionStorage wird automatisch gelöscht
