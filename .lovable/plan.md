

# Fix: Session-Validierung mit Server-Check statt nur Local Storage

## Das Problem

Der `AuthContext` nutzt `supabase.auth.getSession()`, um zu pruefen ob der User eingeloggt ist. Diese Methode liest aber nur aus dem **Local Storage** — sie validiert das Token **nicht mit dem Server**. 

Das bedeutet: Ein User kann ein abgelaufenes oder ungueltiges Token im Browser gespeichert haben und trotzdem als "eingeloggt" durchgelassen werden. Das Ergebnis:

- `isValid = true` (basierend auf dem alten Token)
- Die Home-Seite wird angezeigt
- Aber Profil-Daten koennen nicht geladen werden (Server lehnt Token ab)
- "Benutzer" wird als Fallback angezeigt statt dem echten Namen
- Alle weiteren API-Calls schlagen fehl

## Die Loesung

Den `AuthContext` so aendern, dass nach dem schnellen `getSession()` Check eine **Server-Validierung** mit `getUser()` durchgefuehrt wird. Falls das Token ungueltig ist, wird der User sofort ausgeloggt und zu `/auth` weitergeleitet.

### Schritt 1: AuthContext mit Server-Validierung

In `src/contexts/AuthContext.tsx`:

1. `getSession()` bleibt als schneller Initialcheck (verhindert Flackern)
2. Danach wird `getUser()` aufgerufen, um das Token serverseitig zu validieren
3. Falls `getUser()` einen Fehler zurueckgibt (z.B. `AuthSessionMissingError`), wird die Session geloescht und `isValid` auf `false` gesetzt

```typescript
// Nach getSession() — serverseitige Validierung
const { data: { session } } = await supabase.auth.getSession();
if (session) {
  // Validate token server-side
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    // Token is stale/invalid — force logout
    await supabase.auth.signOut();
    setState({ userId: null, email: null, isValid: false, isLoading: false });
    return;
  }
}
```

### Schritt 2: WelcomeHeader Fallback verbessern

In `src/components/ui/welcome-header.tsx`:

Waehrend das Profil geladen wird, "Benutzer" nicht sofort anzeigen — stattdessen den Loading-State beruecksichtigen:

```typescript
const getUserFirstName = () => {
  if (loading) return '...';  // Zeige Platzhalter waehrend des Ladens
  if (profile?.first_name) return profile.first_name;
  return 'Benutzer';
};
```

### Schritt 3: useProfile mit Auth-Fehlerbehandlung

In `src/hooks/useProfile.ts`:

Wenn `getUser()` fehlschlaegt (Session ungueltig), keinen Toast zeigen sondern still fehlschlagen — der AuthContext kuemmert sich um den Redirect.

## Erwartetes Ergebnis

- Abgelaufene/ungueltige Tokens werden beim App-Start erkannt
- User mit ungueltigem Token werden sofort zu `/auth` weitergeleitet
- Kein "Benutzer"-Fallback mehr bei ungueltigem Token
- Schnelles Laden bei gueltigem Token (kein sichtbarer Unterschied)

## Betroffene Dateien

- `src/contexts/AuthContext.tsx` — Server-Validierung hinzufuegen
- `src/components/ui/welcome-header.tsx` — Loading-State fuer Namen
- `src/hooks/useProfile.ts` — Stille Fehlerbehandlung bei Auth-Fehler

