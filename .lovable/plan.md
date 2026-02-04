
# Plan: Korrektur des OAuth Exit Schemes und iPad-Erkennung

## Identifizierte Probleme

| Problem | Datei | Zeile | Beschreibung |
|---------|-------|-------|--------------|
| Hardcodierter Scheme | `Auth.tsx` | 195, 275 | `'ditax'` statt `DEEPLINK_SCHEME` Konstante |
| iPad Erkennung | `despia.ts` | 72-75 | Keine explizite `despia-ipad` Prüfung |

## Analyse der `despia-ipad` User Agent Erkennung

```text
User Agent: "...despia-ipad..."

Prüfung                     Ergebnis
─────────────────────────────────────
ua.includes('despia')       ✅ true
ua.includes('ipad')         ✅ true  
ua.includes('iphone')       ❌ false
ua.includes('despia-ipad')  ✅ true
```

Die aktuelle Erkennung funktioniert technisch, da `'despia-ipad'.includes('ipad')` = `true`. Zur Sicherheit und besseren Logs sollte `despia-ipad` explizit geprüft werden.

## Geplante Änderungen

### 1. Auth.tsx - DEEPLINK_SCHEME Konstante verwenden

**Import erweitern (Zeile 14):**
```tsx
import { isDespiaNative, triggerDespiaPasskeyAuth, DEEPLINK_SCHEME } from "@/lib/despia";
```

**Google OAuth (Zeile 195):**
```tsx
deeplink_scheme: DEEPLINK_SCHEME  // statt 'ditax'
```

**Apple OAuth (Zeile 275):**
```tsx
deeplink_scheme: DEEPLINK_SCHEME  // statt 'ditax'
```

### 2. despia.ts - Robustere iPad-Erkennung

**`isDespiaIOS()` erweitern (Zeile 72-75):**
```tsx
export const isDespiaIOS = (): boolean => {
  const ua = navigator.userAgent.toLowerCase();
  const isIOS = isDespiaNative() && (
    ua.includes('iphone') || 
    ua.includes('ipad') || 
    ua.includes('despia-ipad')  // Explizite iPad-Prüfung
  );
  
  if (isIOS) {
    console.log('📱 Despia iOS detected:', { 
      userAgent: ua,
      isIPad: ua.includes('despia-ipad') || ua.includes('ipad')
    });
  }
  
  return isIOS;
};
```

## Zusammenfassung der Dateiänderungen

| Datei | Änderung |
|-------|----------|
| `src/pages/Auth.tsx` | Import `DEEPLINK_SCHEME`, ersetze hardcodierte `'ditax'` (2x) |
| `src/lib/despia.ts` | Erweitere `isDespiaIOS()` mit expliziter `despia-ipad` Prüfung und Logging |

## Technische Details

### Warum ist die Konstante wichtig?

Die `DEEPLINK_SCHEME` Konstante (`"ditax"`) ist zentral in `src/lib/despia.ts` definiert. Bei einer Scheme-Änderung muss nur diese Stelle angepasst werden, statt mehrere Dateien zu durchsuchen.

### Exit Flow gemäss Despia Dokumentation

```text
1. App ruft auth-start Edge Function auf
   → Parameter: { provider: 'google', deeplink_scheme: 'ditax' }

2. Edge Function gibt OAuth URL zurück
   → redirect_to: https://app.ditax.ch/native-callback/ditax/

3. Nach erfolgreicher Auth: NativeCallback.tsx
   → Setzt Session
   → Sendet Exit-Deeplink: ditax://oauth/auth?success=true

4. Despia schliesst Chrome Custom Tab / ASWebAuthenticationSession
   → WebView navigiert zu /auth?success=true

5. Auth.tsx erkennt success=true
   → Lädt bestehende Session
   → Navigiert zu Home
```

Der `oauth/` Prefix im Deeplink ist kritisch - er signalisiert Despia, die Browser-Session zu schliessen.
