
# Analyse: iPad Social Login funktioniert nicht

## Befunde der Code-Analyse

### 1. User Agent Erkennung - KORREKT
Die `isDespiaNative()` Funktion prüft auf `despia` im User Agent:
```typescript
// src/lib/despia.ts Zeile 28-36
export const isDespiaNative = (): boolean => {
  const isDespia = typeof navigator !== 'undefined' && 
         navigator.userAgent.toLowerCase().includes('despia');
  return isDespia;
};
```

**`despia-ipad`** enthält **`despia`**, daher wird dies korrekt erkannt.

### 2. Das eigentliche Problem: Hardcodierter deeplink_scheme in Auth.tsx

In `Auth.tsx` wird der `deeplink_scheme` **hardcodiert** statt die Konstante zu verwenden:

| Datei | Zeile | Problem |
|-------|-------|---------|
| `src/pages/Auth.tsx` | 195 | `deeplink_scheme: 'ditax'` (hardcodiert) |
| `src/pages/Auth.tsx` | 275 | `deeplink_scheme: 'ditax'` (hardcodiert) |

Im Gegensatz dazu verwenden `GoogleAuth.tsx` und `AppleAuth.tsx` **korrekt** die Konstante:
```typescript
// GoogleAuth.tsx Zeile 33
deeplink_scheme: DEEPLINK_SCHEME
```

### 3. Unterschied zwischen Android und iPad

**Android** funktioniert, weil:
- Der hardcodierte Wert `'ditax'` zufällig mit `DEEPLINK_SCHEME` übereinstimmt
- Chrome Custom Tabs auf Android verhalten sich anders

**iPad** funktioniert nicht, weil:
- ASWebAuthenticationSession auf iOS strenger ist
- Möglicherweise ist der DEEPLINK_SCHEME nicht importiert

### 4. Fehlender Import in Auth.tsx

```typescript
// Auth.tsx Zeile 14 - DEEPLINK_SCHEME fehlt im Import!
import { isDespiaNative, triggerDespiaPasskeyAuth } from "@/lib/despia";
// Sollte sein:
import { isDespiaNative, triggerDespiaPasskeyAuth, DEEPLINK_SCHEME } from "@/lib/despia";
```

## Lösung

### Änderung 1: DEEPLINK_SCHEME Import hinzufügen
```typescript
// Auth.tsx Zeile 14
import { isDespiaNative, triggerDespiaPasskeyAuth, DEEPLINK_SCHEME } from "@/lib/despia";
```

### Änderung 2: Hardcodierte Werte ersetzen
```typescript
// Zeile 195 (Google)
deeplink_scheme: DEEPLINK_SCHEME

// Zeile 275 (Apple)
deeplink_scheme: DEEPLINK_SCHEME
```

### Änderung 3: Debug-Logging für iPad hinzufügen
```typescript
// In src/lib/despia.ts - isDespiaIOS verbessern
export const isDespiaIOS = (): boolean => {
  const ua = navigator.userAgent.toLowerCase();
  const isIOS = isDespiaNative() && (
    ua.includes('iphone') || 
    ua.includes('ipad') || 
    ua.includes('despia-ipad')  // Explizit für iPad
  );
  
  if (isIOS) {
    console.log('📱 Despia iOS detected:', { userAgent: ua });
  }
  
  return isIOS;
};
```

## Betroffene Dateien

| Datei | Änderung |
|-------|----------|
| `src/pages/Auth.tsx` | Import erweitern + hardcodierte Werte ersetzen |
| `src/lib/despia.ts` | Debug-Logging für iPad |

## Warum Android nicht betroffen ist

Der Code in `Auth.tsx` verwendet bereits `'ditax'` als String, was mit der Konstante übereinstimmt. Das Problem ist nicht der Wert selbst, sondern die Konsistenz und Wartbarkeit.

**Hinweis**: Falls das Problem weiterhin besteht, könnte es an der iOS ASWebAuthenticationSession liegen, die möglicherweise andere Redirect-Handling-Logik benötigt. In diesem Fall müsste die NativeCallback-Logik für iOS angepasst werden.

## Test nach Implementierung

1. iPad öffnen mit User Agent `despia-ipad`
2. Google oder Apple Login starten
3. Console-Logs prüfen für `📱 Despia native detected`
4. OAuth Flow sollte ASWebAuthenticationSession öffnen
5. Nach erfolgreicher Auth: Deeplink `ditax://oauth/auth?success=true` wird ausgelöst
6. App sollte Session erkennen und zur Startseite navigieren
