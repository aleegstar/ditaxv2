
# Fix: Google und Apple Login auf iOS (iPhone)

## Analyse

Zwei Probleme wurden identifiziert:

### 1. isDespiaIOS() erkennt das iPhone nicht
Die auth-start Logs zeigen, dass Apple Login auf iOS immer noch den alten `auth-start` Flow nutzt -- der neue iOS-spezifische Code wird nie erreicht. `isDespiaIOS()` prueft auf "iphone"/"ipad" im User-Agent, aber die Despia WebView auf iOS koennte einen anderen User-Agent senden (z.B. "Macintosh" bei iPads mit "Desktop-Website anfordern" oder ein Custom User-Agent).

### 2. NativeCallback React-Seite in ASWebAuthenticationSession
Fuer Google Login auf iOS muss die komplette React SPA (`app.ditax.ch/native-callback/ditax/`) in ASWebAuthenticationSession laden. Das JS-Bundle muss heruntergeladen und ausgefuehrt werden, bevor die Tokens aus dem `#`-Fragment gelesen werden koennen. Das ist langsam und fehleranfaellig.

## Loesung

### Teil 1: iOS-Erkennung verbessern (despia.ts)

Statt nur "iphone"/"ipad" im User-Agent zu suchen, auch pruefen:
- Ob NICHT "android" im User-Agent steht (= wenn Despia erkannt wird und es kein Android ist, muss es iOS sein)
- Zusaetzlich `navigator.platform` und `navigator.maxTouchPoints` als Fallback

```
isDespiaIOS = isDespiaNative() && !isDespiaAndroid()
```

Diese Logik ist sicher, weil Despia nur iOS und Android unterstuetzt. Wenn es Despia ist aber nicht Android, dann ist es iOS.

### Teil 2: Leichtgewichtige Bridge-Seite als Edge Function (auth-ios-bridge)

Statt die volle React SPA in ASWebAuthenticationSession zu laden, erstellen wir eine minimale Edge Function `auth-ios-bridge`, die:
1. Eine statische HTML-Seite liefert (wenige KB, kein JS-Bundle noetig)
2. Per JavaScript `window.location.hash` liest (Tokens aus dem Fragment)
3. Sofort zum Deeplink (`ditax://oauth/auth?access_token=xxx`) weiterleitet

Fuer iOS-Google wird `auth-start` den redirect auf diese Edge Function setzen statt auf die React NativeCallback-Seite.

### Teil 3: Google iOS Flow aendern (Auth.tsx + auth-start)

In `handleGoogleAuth` wird eine iOS-Weiche eingefuegt (GENAU WIE bei Apple -- VOR dem bestehenden Android-Block):

```
if (isDespia && isDespiaIOS()) {
  // iOS: auth-start mit platform=ios -> redirect zu auth-ios-bridge
  const { data } = await supabase.functions.invoke('auth-start', {
    body: { provider: 'google', deeplink_scheme: DEEPLINK_SCHEME, platform: 'ios' }
  });
  despia(`oauth://?url=${data.url}`);
  return;
}
// UNVERAENDERT: Android Despia Flow
if (isDespia) { ... }
```

### Teil 4: auth-start erweitern

`auth-start` erhaelt einen optionalen `platform` Parameter. Wenn `platform === 'ios'`, wird die `redirect_to` URL auf die neue Bridge Edge Function gesetzt statt auf die React NativeCallback-Seite:

- Android: `redirect_to = https://app.ditax.ch/native-callback/{scheme}/`
- iOS: `redirect_to = https://gqbhilftduwxjszznnzy.supabase.co/functions/v1/auth-ios-bridge?scheme={scheme}`

## Aenderungen

| Datei | Aktion | Was passiert |
|-------|--------|-------------|
| `src/lib/despia.ts` | Aendern | `isDespiaIOS()`: Neue Logik `isDespiaNative() && !isDespiaAndroid()` |
| `supabase/functions/auth-ios-bridge/index.ts` | Neu | Leichtgewichtige HTML-Seite: liest Hash-Fragment, leitet per Deeplink weiter |
| `supabase/functions/auth-start/index.ts` | Aendern | Neuer `platform` Parameter, iOS redirect zu auth-ios-bridge |
| `src/pages/Auth.tsx` | Aendern | iOS-Weiche in `handleGoogleAuth` (VOR dem Android-Block) |
| `supabase/config.toml` | Aendern | `verify_jwt = false` fuer auth-ios-bridge |

## Android: EXAKT UNVERAENDERT

Kein einziges Zeichen im Android-Flow wird geaendert:
- `handleGoogleAuth`: Der bestehende `if (isDespia)` Block (nach der neuen iOS-Weiche) bleibt 1:1
- `handleAppleAuth`: Der bestehende Android Despia Block bleibt 1:1
- `auth-start`: Bei fehlendem `platform` Parameter verhaelt sich alles wie bisher
- `NativeCallback.tsx`: Bleibt komplett unveraendert (wird weiterhin von Android genutzt)

## Neue Edge Function: auth-ios-bridge

Minimale HTML-Seite (~1KB), die in ASWebAuthenticationSession sofort laedt:

```text
1. Supabase leitet zu: auth-ios-bridge?scheme=ditax#access_token=xxx&refresh_token=yyy
2. Edge Function liefert HTML-Seite
3. JavaScript liest window.location.hash
4. JavaScript extrahiert access_token und refresh_token
5. JavaScript setzt window.location.href = "ditax://oauth/auth?access_token=xxx&refresh_token=yyy"
6. Despia faengt Deeplink ab, schliesst ASWebAuth, navigiert WebView zu /auth?access_token=xxx
7. Auth.tsx useEffect liest Tokens, ruft setSession() auf
```

## iOS Flows nach dem Fix

### Google iOS (NEU):
```text
1. isDespiaIOS() = true (neue Logik: isDespia UND nicht Android)
2. auth-start mit platform=ios -> redirect_to = auth-ios-bridge
3. despia('oauth://...') oeffnet ASWebAuthenticationSession
4. User loggt sich bei Google ein
5. Supabase leitet zu auth-ios-bridge#access_token=xxx
6. Minimale HTML-Seite liest Hash, leitet zu Deeplink
7. ditax://oauth/auth?access_token=xxx -> WebView -> setSession
```

### Apple iOS (BESTEHEND, jetzt funktionierend dank iOS-Erkennung):
```text
1. isDespiaIOS() = true (neue Logik greift jetzt!)
2. Direkter Apple OAuth mit form_post -> auth-apple-callback
3. Edge Function verifiziert Token, erstellt Session
4. Deeplink zurueck -> setSession
```

## Reihenfolge

1. isDespiaIOS() Logik in despia.ts aendern
2. auth-ios-bridge Edge Function erstellen
3. auth-start um platform-Parameter erweitern
4. Auth.tsx iOS-Weiche in handleGoogleAuth
5. config.toml fuer auth-ios-bridge
6. Edge Functions deployen
7. Auf iOS testen
