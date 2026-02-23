
## Layout und Zurueck-Button auf allen Unterseiten vereinheitlichen

### Problem
Aktuell verwenden die Unterseiten unterschiedliche maximale Breiten fuer den Inhalt und teilweise eigene Zurueck-Buttons statt der gemeinsamen `SubpageHeader`-Komponente. Das fuehrt in der Desktop-Ansicht zu einem uneinheitlichen Erscheinungsbild.

### Loesung
Alle Unterseiten erhalten ein einheitliches Layout:
- **SubpageHeader** mit `max-w-3xl` als Standard fuer die Header-Leiste (statt `max-w-7xl`)
- **Content-Bereich** einheitlich mit `max-w-3xl mx-auto px-4 sm:px-6`
- Seiten mit eigenen Zurueck-Buttons werden auf `SubpageHeader` umgestellt

### Standard-Breite: `max-w-3xl` (768px)
Dies ist ein guter Mittelweg -- breit genug fuer Formulare und Listen, aber schmal genug fuer gute Lesbarkeit auf Desktop.

### Aenderungen

**1. SubpageHeader-Komponente (`src/components/ui/subpage-header.tsx`)**
- `max-w-7xl` aendern zu `max-w-3xl` -- damit ist der Header auf allen Seiten gleich breit wie der Inhalt

**2. Seiten die SubpageHeader nutzen -- Content-Breite anpassen:**

| Seite | Aktuell | Neu |
|-------|---------|-----|
| Profile.tsx | `max-w-[640px]` | `max-w-3xl` |
| InviteFriends.tsx | `max-w-2xl` | `max-w-3xl` |
| TaxFilers.tsx | `max-w-2xl` | `max-w-3xl` |
| PrivacySettings.tsx | `max-w-3xl` | bleibt |
| Feedback.tsx | `max-w-lg` / `max-w-4xl` | `max-w-3xl` |
| Tickets.tsx | `max-w-4xl` (container) | `max-w-3xl` |
| Invoices.tsx | `max-w-2xl` | `max-w-3xl` |
| DocumentUploadPage.tsx | `max-w-4xl` | `max-w-3xl` |
| Help.tsx | kein max-w | bleibt (iframe, volle Breite sinnvoll) |
| Documents.tsx | `max-w-7xl` | `max-w-3xl` |

**3. Seiten mit eigenem Zurueck-Button -- auf SubpageHeader umstellen:**

| Seite | Aenderung |
|-------|-----------|
| TaxReturnTracking.tsx | Eigenen Header ersetzen durch `SubpageHeader`, Content auf `max-w-3xl` |
| TaxReturnActions.tsx | Eigenen Header ersetzen durch `SubpageHeader`, Content von `max-w-xl` auf `max-w-3xl` |
| MissingItems.tsx | Eigenen Header ersetzen durch `SubpageHeader`, Content von `max-w-4xl` auf `max-w-3xl` |
| CreateTicket.tsx | Eigenen Header ersetzen durch `SubpageHeader`, Content von `max-w-3xl` bleibt |

### Technische Details

- `SubpageHeader` Zeile 43: `max-w-7xl` wird zu `max-w-3xl`
- Alle Content-Container bekommen einheitlich: `max-w-3xl mx-auto px-4 sm:px-6`
- Bei den Seiten mit eigenem Back-Button wird der manuelle `<button>` + `<ArrowLeft>` Block durch `<SubpageHeader title="..." onBack={...} />` ersetzt
- Bestehende Funktionalitaet (Avatar, Year-Selector bei Documents) bleibt erhalten
- Legal-Seiten (AcceptableUse, Privacy, Terms, Impressum, Cookies) behalten ihr bestehendes Layout, da sie den `LegalDocumentPage`-Wrapper verwenden
