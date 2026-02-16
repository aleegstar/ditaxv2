
# Fix: Google Login iOS - Native Callback gemäss Despia Docs

## Problem

Der aktuelle Ansatz verwendet eine Supabase Edge Function (`auth-ios-bridge`) als Redirect-Ziel fuer Google OAuth auf iOS. Das ist falsch weil:

1. Die Edge Function laeuft auf `gqbhilftduwxjszznnzy.supabase.co` - nicht auf der App-Domain
2. ASWebAuthenticationSession auf iOS erkennt den Custom-Scheme-Deeplink (`ditax://`) moeglicherweise nicht korrekt von einer fremden Domain
3. Die Despia-Dokumentation sagt klar: `/native-callback` soll eine **statische HTML-Seite auf der App-Domain** sein

## Despia-Dokumentation (Original)

Die Docs sagen woertlich:

> "The /native-callback page must render a loader immediately via static HTML."
> "Google Sign In on iOS and Android" - selber Flow fuer beide Plattformen
> "Callback pages need static HTML loaders, not React"

Der Schluessel: Ein inline Script in `index.html` das **VOR dem React-Bundle** ausfuehrt, die Tokens aus dem Hash liest, und sofort den Deeplink feuert.

## Loesung

### 1. Inline Script in index.html (KERNFIX)

Ein kleines Script das SOFORT laeuft, noch bevor React ueberhaupt geladen wird:

```html
<script>
  // Native OAuth callback - runs BEFORE React loads
  (function() {
    if (window.location.pathname.indexOf('/native-callback') !== 0) return;
    
    var hash = window.location.hash.substring(1);
    if (!hash) return; // Kein Hash = React uebernimmt als Fallback
    
    var params = new URLSearchParams(hash);
    var accessToken = params.get('access_token');
    if (!accessToken) return;
    
    var refreshToken = params.get('refresh_token');
    var pathParts = window.location.pathname.split('/');
    var scheme = pathParts[2] || 'ditax';
    
    var deeplink = scheme + '://oauth/auth?access_token=' + encodeURIComponent(accessToken);
    if (refreshToken) {
      deeplink += '&refresh_token=' + encodeURIComponent(refreshToken);
    }
    
    window.location.href = deeplink;
  })();
</script>
```

Dieses Script:
- Prueft ob URL `/native-callback` ist
- Liest Tokens aus dem Hash-Fragment
- Feuert sofort den Deeplink (`ditax://oauth/auth?tokens`)
- Alles in ~500ms statt 3-5 Sekunden (kein React-Bundle noetig)
- Wenn kein Hash vorhanden, laeuft React als Fallback weiter

### 2. auth-start vereinfachen

`platform` Parameter entfernen. IMMER auf `app.ditax.ch/native-callback/` redirecten (fuer iOS UND Android):

```
const redirectUrl = `https://app.ditax.ch/native-callback/${encodeURIComponent(deeplink_scheme)}/`;
```

### 3. Auth.tsx vereinfachen

Die separate iOS-Weiche in `handleGoogleAuth` entfernen. Beide Plattformen nutzen denselben Flow:

```
// DESPIA NATIVE (iOS + Android)
if (isDespia) {
  const { data } = await supabase.functions.invoke('auth-start', {
    body: { provider: 'google', deeplink_scheme: DEEPLINK_SCHEME }
  });
  despia(`oauth://?url=${encodeURIComponent(data.url)}`);
  return;
}
```

## Aenderungen

| Datei | Aktion | Beschreibung |
|-------|--------|-------------|
| `index.html` | Aendern | Inline-Script hinzufuegen das Tokens aus Hash liest und Deeplink feuert BEVOR React laedt |
| `supabase/functions/auth-start/index.ts` | Aendern | `platform` Parameter entfernen, IMMER auf `app.ditax.ch/native-callback/` redirecten |
| `src/pages/Auth.tsx` | Aendern | iOS-Weiche in `handleGoogleAuth` entfernen (Zeilen 193-219), ein Block fuer beide Plattformen |

## Flow nach dem Fix (identisch iOS + Android)

```text
1. User tippt "Mit Google anmelden"
2. Auth.tsx ruft auth-start auf (provider=google, deeplink_scheme=ditax)
3. auth-start gibt OAuth URL mit redirect_to=https://app.ditax.ch/native-callback/ditax/
4. despia('oauth://...') oeffnet ASWebAuthenticationSession (iOS) / Chrome Custom Tab (Android)
5. User loggt sich bei Google ein
6. Google leitet zu Supabase callback
7. Supabase leitet zu app.ditax.ch/native-callback/ditax/#access_token=xxx
8. index.html inline-Script liest Hash SOFORT (kein React noetig)
9. Script setzt window.location.href = "ditax://oauth/auth?access_token=xxx"
10. Despia erkennt ditax://, schliesst Browser, navigiert WebView zu /auth?tokens
11. Auth.tsx liest Tokens, ruft setSession() auf
```

## Was NICHT geaendert wird

- Apple iOS Flow (form_post via auth-apple-callback) - bleibt wie ist
- Apple Android Flow (auth-start Standard) - bleibt wie ist
- NativeCallback.tsx - bleibt als React-Fallback bestehen
- Web Flow - komplett unveraendert

## Voraussetzung (Supabase Dashboard)

Die Redirect URL `https://app.ditax.ch/native-callback/**` muss in der Supabase URL-Konfiguration als erlaubte Redirect URL eingetragen sein. Falls noch nicht vorhanden, bitte manuell hinzufuegen unter Authentication > URL Configuration > Redirect URLs.
