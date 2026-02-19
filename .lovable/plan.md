
## Problem

Die `PaymentSection`-Komponente verwaltet ihren eigenen Auth-State (`isLoggedIn`) mit einem separaten `supabase.auth.getSession()`-Aufruf (Zeile 37, 55-77). Dieser lokale State kann veraltet sein und zeigt dann faelschlicherweise "Bitte anmelden" statt "Jetzt bezahlen" an -- obwohl der Benutzer eingeloggt ist.

## Ursache

- `PaymentSection` nutzt **nicht** den zentralen `AuthContext` (`useAuth()`), sondern erstellt einen eigenen Auth-Listener
- `getSession()` liest nur aus dem Local Storage und kann veraltete Daten liefern
- Der zentrale AuthContext validiert die Session serverseitig mit `getUser()`, der lokale Check in PaymentSection tut das nicht

## Loesung

1. **Lokalen Auth-State entfernen** -- die Variablen `isLoggedIn` und den separaten `useEffect` mit `onAuthStateChange` + `getSession()` (Zeilen 37, 55-77) entfernen

2. **Zentralen `useAuth()` Hook verwenden** -- `isValid` und `isLoading` aus dem AuthContext beziehen, der bereits serverseitig validiert ist

3. **Auto-Recovery bei ungueltigem State** -- Falls `isValid === false` und `isLoading === false` auf der Payment-Seite: automatisch `refreshAuth()` versuchen. Falls das fehlschlaegt, einmalig `window.location.reload()` ausfuehren. Falls nach dem Reload immer noch nicht authentifiziert, auf `/auth` weiterleiten.

4. **Button-Logik anpassen** -- `isLoggedIn` durch `isValid` ersetzen, waehrend `isLoading` einen Lade-Zustand anzeigen

## Technische Details

### Datei: `src/components/PaymentSection.tsx`

**Entfernen:**
- `useState` fuer `isLoggedIn` (Zeile 37)
- `useEffect` mit eigenem Auth-Listener (Zeilen 55-77)

**Hinzufuegen:**
- `import { useAuth } from '@/contexts/AuthContext'`
- `const { isValid, isLoading: authLoading, refreshAuth } = useAuth()`
- Neuer `useEffect` fuer Auto-Recovery:

```typescript
useEffect(() => {
  if (authLoading) return;
  if (isValid) return;

  // Session ungueltig -- versuche Refresh
  const sessionKey = 'payment_auth_retry';
  const hasRetried = sessionStorage.getItem(sessionKey);

  if (!hasRetried) {
    sessionStorage.setItem(sessionKey, 'true');
    refreshAuth().then(success => {
      if (!success) {
        window.location.reload();
      }
    });
  } else {
    // Bereits versucht, immer noch ungueltig -> redirect
    sessionStorage.removeItem(sessionKey);
    navigate('/auth');
  }
}, [authLoading, isValid, refreshAuth, navigate]);

// Bei Erfolg: Retry-Flag bereinigen
useEffect(() => {
  if (isValid) {
    sessionStorage.removeItem('payment_auth_retry');
  }
}, [isValid]);
```

**Button aendern (Zeile 432-439):**
- `disabled={isLoading || !priceBreakdown || !isValid || authLoading}`
- Text: `authLoading ? 'Sitzung wird geprueft...' : !isValid ? 'Bitte anmelden' : 'Jetzt bezahlen'`
- Der Fall "Bitte anmelden" sollte in der Praxis nicht mehr sichtbar sein, da der Auto-Recovery-Mechanismus vorher greift

**handlePayment (Zeile 152):**
- `isLoggedIn` durch `isValid` ersetzen
