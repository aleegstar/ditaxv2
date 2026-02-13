

## Apple Login Fix auf iPhone (Despia/iOS)

### Identifizierte Probleme

1. **`isOAuthInProgress` wird nie zurueckgesetzt im Despia-Flow**: Nach dem Aufruf von `despia('oauth://...')` gibt es keinen Code, der `isOAuthInProgress.current = false` und `setIsOAuthLoading(false)` setzt, wenn der User zurueckkommt (z.B. durch Abbrechen). Der Apple-Login-Button ist dann dauerhaft blockiert.

2. **Kein Reset bei erneutem Besuch der Auth-Seite**: Wenn der User nach einem fehlgeschlagenen OAuth-Versuch zurueck auf `/auth` kommt, bleibt `isOAuthInProgress` auf `true`.

### Loesung

**Datei: `src/pages/Auth.tsx`**

1. `isOAuthInProgress` und `isOAuthLoading` zuruecksetzen, wenn die Auth-Seite geladen/erneut besucht wird:
   - Im bestehenden `useEffect` fuer `handleDeeplinkAuth` am Anfang `isOAuthInProgress.current = false` setzen, wenn keine OAuth-Parameter vorhanden sind
   - Alternativ: Einen separaten `useEffect` hinzufuegen, der beim Mount `isOAuthInProgress.current = false` setzt

2. Timeout-basierter Reset nach dem `despia()` Aufruf im Apple-Flow (und Google-Flow):
   - Nach 30 Sekunden `isOAuthInProgress.current = false` und `setIsOAuthLoading(false)` setzen
   - Falls der User die OAuth-Seite schliesst oder der Flow fehlschlaegt, kann er es erneut versuchen

### Technische Details

```text
// In Auth.tsx - Mount-Reset hinzufuegen:
useEffect(() => {
  isOAuthInProgress.current = false;
  setIsOAuthLoading(false);
}, []);

// Im Despia Apple-Flow nach despia() Aufruf:
despia(`oauth://?url=${encodeURIComponent(data.url)}`);

// Safety timeout - reset after 30s if OAuth doesn't complete
setTimeout(() => {
  isOAuthInProgress.current = false;
  setIsOAuthLoading(false);
}, 30000);
```

### Betroffene Dateien
- `src/pages/Auth.tsx` - Mount-Reset und Timeout-Reset fuer beide OAuth-Flows (Google + Apple)

