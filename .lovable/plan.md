

## Optimierung: Nahtlose Weiterleitung nach Login

### Problem
Nach dem Login sieht der Nutzer mit mehreren Personen alle Zwischenschritte:
1. `/auth` (Login)
2. `/auth-success` (Erfolgsseite mit Spinner + Checkmark)
3. `/` (Dashboard blitzt kurz auf)
4. `/select-person` (finale Zielseite)

### Loesung
Die Weiterleitung wird an zwei Stellen optimiert, damit der Nutzer nur den Login und dann direkt die Personenauswahl sieht -- ohne sichtbare Zwischenschritte.

### Aenderungen

**1. `src/pages/AuthSuccess.tsx`**
- Nach erfolgreichem Session-Setzen (Web-Flow, Zeile 82): Statt `window.location.href = '/'` wird zu `/` navigiert, aber die AuthSuccess-Seite bleibt als visueller "Screen" stehen, bis die Navigation abgeschlossen ist.
- Kein visueller Unterschied fuer den Nutzer -- die Erfolgsanzeige bleibt bis zum naechsten Screen sichtbar.

**2. `src/pages/UserTaxReturns.tsx`**
- Die Komponente zeigt bereits ein Skeleton/nichts waehrend `authLoading` oder `taxFilerLoading`. Das Problem ist, dass der kurze Moment zwischen "auth fertig" und "taxFilerLoading fertig" einen Flash verursacht.
- Loesung: Die `isReady`-Logik wird erweitert, sodass der Skeleton-Screen laenger angezeigt wird, bis auch die Tax-Filer-Daten geladen sind und die Redirect-Entscheidung getroffen wurde. Damit sieht der Nutzer keinen Dashboard-Inhalt vor dem Redirect.

**3. `src/App.tsx` - AuthenticatedApp**
- Die `AuthenticatedApp`-Komponente wird so angepasst, dass waehrend `TaxFilerProvider` noch laedt, weiterhin der `LoadingSpinner` angezeigt wird -- nicht der Route-Inhalt.
- Dazu wird ein neuer innerer Wrapper eingefuehrt, der den `isLoading`-State aus `useTaxFiler()` prueft und bei Bedarf den LoadingSpinner zeigt, bevor Routes gerendert werden.

### Technische Details

```text
Vorher:
Auth --> AuthSuccess (1-2s sichtbar) --> / (Flash) --> /select-person

Nachher:
Auth --> AuthSuccess (bleibt sichtbar) --> /select-person (direkt)
```

Der Kern der Loesung ist ein neuer `TaxFilerGate`-Wrapper innerhalb von `AuthenticatedApp`, der:
- Waehrend TaxFiler-Daten laden: LoadingSpinner zeigt (oder AuthSuccess bleibt sichtbar)
- Wenn Multiple Filers + keine Auswahl: Sofort zu `/select-person` redirected, BEVOR irgendein Route-Inhalt gerendert wird
- Sonst: Normal die Routes rendert

So wird die Redirect-Entscheidung VOR dem Route-Rendering getroffen, nicht danach.

