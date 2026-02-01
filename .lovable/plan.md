

# Plan: Korrektur der Despia iPad Erkennung und Exit Scheme

## Problem

1. **Hardcodierter Deeplink Scheme**: In `Auth.tsx` wird `deeplink_scheme: 'ditax'` hardcodiert verwendet, anstatt die Konstante `DEEPLINK_SCHEME` aus `src/lib/despia.ts`
2. **iPad User Agent**: iPads haben den User Agent `despia-ipad`, der korrekt erkannt werden muss

## Aktuelle Analyse

| Prüfung | User Agent `despia-ipad` | Ergebnis |
|---------|--------------------------|----------|
| `includes('despia')` | ✅ | Wird erkannt |
| `includes('ipad')` | ✅ | Wird erkannt |
| `includes('iphone')` | ❌ | Wird NICHT erkannt (korrekt) |

Die Erkennung in `isDespiaIOS()` sollte funktionieren, da `'despia-ipad'.includes('ipad')` = `true`.

## Betroffene Stellen

### 1. Auth.tsx - Hardcodierter deeplink_scheme
```tsx
// Zeile 195 (Google)
deeplink_scheme: 'ditax'  // ❌ Hardcodiert

// Zeile 275 (Apple)
deeplink_scheme: 'ditax'  // ❌ Hardcodiert
```

### 2. despia.ts - iPad Erkennung verbessern
Die aktuelle Erkennung funktioniert, aber zur Sicherheit sollte sie expliziter sein:
```tsx
export const isDespiaIOS = (): boolean => {
  const ua = navigator.userAgent.toLowerCase();
  return isDespiaNative() && (ua.includes('iphone') || ua.includes('ipad'));
};
```

## Lösung

### Schritt 1: Auth.tsx - DEEPLINK_SCHEME Konstante verwenden

Import hinzufügen:
```tsx
import { isDespiaNative, triggerDespiaPasskeyAuth, DEEPLINK_SCHEME } from "@/lib/despia";
```

Hardcodierte Werte ersetzen:
```tsx
// Google (Zeile 195)
deeplink_scheme: DEEPLINK_SCHEME

// Apple (Zeile 275)
deeplink_scheme: DEEPLINK_SCHEME
```

### Schritt 2: despia.ts - Robustere iPad Erkennung

Debug-Logging hinzufügen für bessere Fehlersuche:
```tsx
export const isDespiaIOS = (): boolean => {
  const ua = navigator.userAgent.toLowerCase();
  const isIOS = isDespiaNative() && (
    ua.includes('iphone') || 
    ua.includes('ipad') || 
    ua.includes('despia-ipad')  // Explizite Prüfung für iPad User Agent
  );
  
  if (isIOS) {
    console.log('📱 Despia iOS detected:', { userAgent: ua });
  }
  
  return isIOS;
};
```

### Schritt 3: platform.ts - isDespiaEnvironment verbessern

Die Erkennung sollte auch `despia-ipad` explizit berücksichtigen:
```tsx
export const isDespiaEnvironment = (): boolean => {
  if (typeof window !== 'undefined' && typeof (window as any).despia !== 'undefined') {
    return true;
  }
  const userAgent = navigator.userAgent.toLowerCase();
  // Matches: 'despia', 'despia-ipad', 'despia-android', etc.
  return userAgent.includes('despia');
};
```

## Zusammenfassung der Änderungen

| Datei | Änderung |
|-------|----------|
| `src/pages/Auth.tsx` | `DEEPLINK_SCHEME` import hinzufügen, hardcodierte `'ditax'` ersetzen |
| `src/lib/despia.ts` | Debug-Logging in `isDespiaIOS()`, explizite `despia-ipad` Prüfung |

## Test-Szenario

1. OAuth auf iPad starten (User Agent: `despia-ipad`)
2. `isDespiaNative()` sollte `true` zurückgeben
3. `isDespiaIOS()` sollte `true` zurückgeben
4. OAuth Flow sollte mit korrektem `ditax://oauth/auth` Deeplink zurückkehren

