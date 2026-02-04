
# Plan: Korrektur der Social Auth für iPad (Despia)

## Problem-Analyse

Das Problem liegt in der **NativeCallback.tsx** Seite. Der OAuth-Flow funktioniert wie folgt:

```text
1. User klickt "Mit Google anmelden" in der App (WebView)
2. Auth.tsx ruft auth-start Edge Function auf
3. despia('oauth://?url=...') öffnet ASWebAuthenticationSession (Safari-Sheet)
4. User meldet sich bei Google an
5. Google redirected zu /native-callback#access_token=xxx
   ↓ HIER IST DAS PROBLEM ↓
6. NativeCallback läuft in ASWebAuthenticationSession, NICHT im WebView!
7. isDespiaNative() prüft User-Agent - aber Safari-Sheet hat anderen User-Agent!
8. isDespiaNative() gibt FALSE zurück
9. Deeplink wird NICHT gesendet
10. User bleibt im Safari-Sheet stecken
```

## Root Cause

Die `isDespiaNative()` Funktion in `src/lib/despia.ts` prüft:
```typescript
navigator.userAgent.toLowerCase().includes('despia')
```

**Problem**: Die ASWebAuthenticationSession auf iOS (Safari-Sheet) hat einen **Standard-Safari User-Agent**, NICHT den Despia-User-Agent! Der Despia User-Agent wird nur im WebView gesetzt.

## Lösung

In **NativeCallback.tsx** dürfen wir uns **nicht** auf `isDespiaNative()` verlassen. Stattdessen sollten wir:

1. **Den deeplink_scheme aus dem URL-Pfad verwenden** (bereits vorhanden)
2. **IMMER den Deeplink senden**, wenn ein `deeplink_scheme` vorhanden ist
3. **Fallback auf Navigation**, wenn Deeplink nicht funktioniert

### Änderungen

| Datei | Änderung |
|-------|----------|
| `src/pages/NativeCallback.tsx` | `isDespiaNative()` Check entfernen, immer Deeplink senden wenn `deeplinkScheme` vorhanden ist |

### Vorher (Zeilen 121-142)

```typescript
// Check if we're in Despia native environment
const inDespiaNative = isDespiaNative();
console.log('🔗 Is Despia native:', inDespiaNative);

if (inDespiaNative) {
  // Send short deeplink to close Chrome Custom Tab
  const shortDeeplinkUrl = `${deeplinkScheme}://oauth/auth?success=true`;
  console.log('🔗 Triggering deeplink:', shortDeeplinkUrl);
  
  // Trigger immediately
  window.location.href = shortDeeplinkUrl;
  
  // Fallback...
} else {
  // Not in native - navigate to home immediately
  console.log('🔗 Not in native, navigating to home...');
  navigate('/', { replace: true });
}
```

### Nachher

```typescript
// WICHTIG: Wir können isDespiaNative() hier NICHT verwenden!
// Diese Seite läuft in ASWebAuthenticationSession (iOS) oder Chrome Custom Tab (Android),
// nicht im Despia WebView. Der User-Agent ist daher Safari/Chrome, nicht Despia.
// 
// Stattdessen prüfen wir, ob ein deeplink_scheme vorhanden ist.
// Wenn ja, kam der Request von einer nativen App und wir senden den Deeplink.
const hasNativeScheme = deeplinkScheme && deeplinkScheme !== 'undefined';
console.log('🔗 Has native scheme:', hasNativeScheme, 'scheme:', deeplinkScheme);

if (hasNativeScheme) {
  // Send short deeplink to close ASWebAuthenticationSession/Chrome Custom Tab
  const shortDeeplinkUrl = `${deeplinkScheme}://oauth/auth?success=true`;
  console.log('🔗 Triggering deeplink:', shortDeeplinkUrl);
  
  // Trigger immediately
  window.location.href = shortDeeplinkUrl;
  
  // Fallback: If deeplink doesn't work after 2 seconds, try navigate
  setTimeout(() => {
    console.log('🔗 Deeplink fallback: navigating to home...');
    window.location.href = '/?success=true';
  }, 2000);
} else {
  // No native scheme - this is a web flow, navigate directly
  console.log('🔗 No native scheme, navigating to home...');
  navigate('/', { replace: true });
}
```

## Warum diese Lösung funktioniert

1. **deeplink_scheme ist im URL-Pfad enthalten**: Die auth-start Edge Function baut die Redirect-URL als `/native-callback/ditax/` auf
2. **Der Pfad-Parameter wird korrekt extrahiert**: `useParams()` holt `deeplinkScheme` aus dem Pfad
3. **Kein User-Agent-Check nötig**: Wir wissen, dass der Request von einer nativen App kommt, wenn `deeplink_scheme` vorhanden ist
4. **Deeplink mit oauth/ Prefix**: `ditax://oauth/auth?success=true` schliesst die ASWebAuthenticationSession korrekt

## Technische Details

### URL-Flow mit iPad

```text
1. Auth.tsx ruft auth-start auf
   → deeplink_scheme: 'ditax'

2. auth-start gibt OAuth URL zurück
   → redirect_to: https://app.ditax.ch/native-callback/ditax/

3. Nach Google-Login:
   → https://app.ditax.ch/native-callback/ditax/#access_token=xxx

4. NativeCallback extrahiert:
   → deeplinkScheme = 'ditax' (aus useParams)
   → accessToken (aus Hash)

5. NativeCallback sendet Deeplink:
   → window.location.href = 'ditax://oauth/auth?success=true'

6. Despia fängt Deeplink ab:
   → Schliesst ASWebAuthenticationSession
   → Navigiert WebView zu /auth?success=true

7. Auth.tsx prüft Session:
   → supabase.auth.getSession() findet Session
   → User ist eingeloggt
```

### Warum Session geteilt wird

Die Session wird in NativeCallback.tsx gesetzt (Zeile 102-105):
```typescript
const { error: sessionError } = await supabase.auth.setSession({
  access_token: accessToken,
  refresh_token: refreshToken || '',
});
```

**iOS (ASWebAuthenticationSession)**: Teilt Cookies/Storage mit Safari und dem WebView, daher ist die Session auch im WebView verfügbar.

**Android (Chrome Custom Tab)**: Teilt Cookies mit Chrome, und Despia nutzt dieselbe Chrome-Instanz, daher ist die Session auch verfügbar.

## Zusammenfassung

Die einzige Änderung ist in `src/pages/NativeCallback.tsx`:
- Entferne die `isDespiaNative()` Prüfung
- Prüfe stattdessen ob `deeplinkScheme` vorhanden ist
- Sende Deeplink wenn ja, navigiere direkt wenn nein
