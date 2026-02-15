

# Fix: Google und Apple Sign In auf iPhone (nur iOS)

Android bleibt komplett unveraendert.

## Problem 1: Google Sign In auf iPhone

**Ursache**: Die `auth-start` Edge Function verwendet `flow_type=implicit`. Supabase gibt die Tokens im URL-Hash-Fragment zurueck (`#access_token=xxx`). Auf iOS geht das Hash-Fragment in `ASWebAuthenticationSession` oft verloren. NativeCallback findet keine Tokens und zeigt "Keine Zugangstokens gefunden".

**Loesung**: Auf PKCE Code-Flow umstellen (`flow_type=pkce`). Dabei kommt ein `code` als Query-Parameter (nicht Hash), der zuverlaessig erhalten bleibt. NativeCallback tauscht den Code dann serverseitig gegen Tokens.

### Aenderungen fuer Google iOS

| Datei | Aenderung |
|---|---|
| `supabase/functions/auth-start/index.ts` | `flow_type=pkce` statt `implicit` verwenden |
| `src/pages/NativeCallback.tsx` | Code-Flow Handling: wenn `code` vorhanden, ueber `supabase.auth.exchangeCodeForSession()` Tokens holen, dann Deeplink mit Tokens senden |

### Neuer Google-Flow auf iPhone

```text
1. Auth.tsx -> auth-start Edge Function (unveraendert)
2. despia('oauth://...') -> ASWebAuthenticationSession (unveraendert)
3. Google Login -> Supabase Redirect
4. Redirect zu /native-callback/ditax/?code=xxx (Query-Param statt Hash!)
5. NativeCallback: exchangeCodeForSession(code) -> Tokens
6. Deeplink ditax://oauth/auth?access_token=xxx&refresh_token=yyy
7. Despia schliesst Browser, navigiert WebView zu /auth?tokens
8. Auth.tsx: setSession(tokens) -> navigate('/')
```

## Problem 2: Apple Sign In auf iPhone

**Ursache**: Apple nutzt aktuell denselben `oauth://`-Flow wie Google. Laut Despia-Dokumentation ist fuer Apple auf iOS das **Apple JS SDK** der empfohlene Ansatz (nativer Face ID Dialog direkt im WebView, kein Browser noetig).

**Loesung**: Platform-spezifische Implementierung. iOS nutzt Apple JS SDK, Android bleibt unveraendert.

### Aenderungen fuer Apple iOS

| Datei | Aenderung |
|---|---|
| `index.html` | Apple JS SDK Script-Tag + CSP-Erweiterung (`appleid.cdn-apple.com`, `appleid.apple.com`) |
| `src/lib/apple-auth.ts` | **Neue Datei**: Apple JS SDK Init + `signInWithAppleJS()` |
| `src/pages/Auth.tsx` | `handleAppleAuth` erweitern: `isDespiaIOS()` -> JS SDK Flow, sonst unveraendert |
| `supabase/functions/auth-apple-callback/index.ts` | **Neue Edge Function**: Apple `id_token` verifizieren, Supabase User erstellen/finden, Session-Tokens zurueckgeben |
| `supabase/config.toml` | `verify_jwt = false` fuer `auth-apple-callback` |

### Neuer Apple-Flow auf iPhone

```text
1. User tippt "Mit Apple anmelden"
2. isDespiaIOS() -> true
3. Apple JS SDK zeigt nativen Face ID Dialog (kein Browser!)
4. User authentifiziert sich mit Face ID/Touch ID
5. JS SDK gibt id_token + code zurueck
6. Auth.tsx sendet id_token an auth-apple-callback Edge Function
7. Edge Function verifiziert Token mit Apple JWKS Public Keys
8. Edge Function erstellt/findet Supabase User via Admin API
9. Edge Function gibt access_token + refresh_token zurueck
10. Auth.tsx setzt Session mit supabase.auth.setSession()
11. navigate('/') -- fertig, alles im WebView
```

## Voraussetzungen (vom User zu erledigen)

Fuer Apple JS SDK auf iPhone muessen folgende **Edge Function Secrets** im Supabase Dashboard konfiguriert werden (Settings > Edge Functions > Secrets):

- `APPLE_CLIENT_ID` -- Service ID aus Apple Developer Console (z.B. `com.ditax.web`)
- `APPLE_TEAM_ID` -- Team ID aus dem Apple Developer Portal
- `APPLE_KEY_ID` -- Key ID des Sign In with Apple Keys
- `APPLE_PRIVATE_KEY` -- Inhalt der .p8 Datei (Zeilenumbrueche durch `\n` ersetzen)
- `APP_URL` -- `https://app.ditax.ch`

Diese sind aktuell nur als Supabase Auth Provider konfiguriert, muessen aber zusaetzlich als Edge Function Secrets gesetzt werden.

Apple Developer Console muss konfiguriert sein:
- Service ID mit Domains: `app.ditax.ch` und `gqbhilftduwxjszznnzy.supabase.co`
- Return URLs: `https://gqbhilftduwxjszznnzy.supabase.co/functions/v1/auth-apple-callback`

## Zusammenfassung

| Provider | iPhone (NEU) | Android (UNVERAENDERT) |
|---|---|---|
| Google | oauth:// + PKCE Code-Flow (Hash-Problem geloest) | oauth:// + implicit (bleibt gleich) |
| Apple | Apple JS SDK + Face ID (kein Browser) | oauth:// (bleibt gleich) |

## Technische Details

### auth-start Aenderung (PKCE statt Implicit)

Die URL wird von:
```text
...&flow_type=implicit
```
geaendert zu:
```text
...&flow_type=pkce&response_type=code
```

Dies bewirkt, dass Supabase einen `code` als Query-Parameter zurueckgibt statt Tokens im Hash-Fragment. Wichtig: PKCE funktioniert auch auf Android, daher ist die Aenderung fuer beide Plattformen kompatibel. NativeCallback muss zusaetzlich den Code-Flow unterstuetzen (Hash-Extraktion bleibt als Fallback).

### NativeCallback Erweiterung

Neue Logik am Anfang von processAuth():
1. Pruefen ob `code` als Query-Parameter vorhanden
2. Wenn ja: `supabase.auth.exchangeCodeForSession(code)` aufrufen
3. Session-Tokens aus dem Result extrahieren
4. Deeplink mit Tokens senden (wie bisher)
5. Bestehende Hash-Extraktion bleibt als Fallback

### apple-auth.ts

- `initAppleAuth(clientId)` -- Apple JS SDK initialisieren
- `signInWithAppleJS()` -- Nativen Dialog aufrufen, gibt `{ idToken, code, user }` zurueck
- Wird nur auf iOS und Web initialisiert, nicht auf Android

### auth-apple-callback Edge Function

- Empfaengt JSON POST mit `id_token`
- Verifiziert Token mit Apple JWKS Public Keys (jose Library fuer Deno)
- Erstellt User via `supabase.auth.admin.createUser()` oder findet existierenden
- Generiert Session-Tokens und gibt sie als JSON zurueck

### CSP-Erweiterung in index.html

- `script-src`: `https://appleid.cdn-apple.com` hinzufuegen
- `connect-src`: `https://appleid.apple.com` hinzufuegen

### Reihenfolge der Implementierung

1. Secrets abfragen (APPLE_CLIENT_ID, APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY, APP_URL)
2. auth-start auf PKCE umstellen (behebt Google iPhone)
3. NativeCallback Code-Flow Handling einbauen
4. auth-apple-callback Edge Function erstellen
5. Apple JS SDK in index.html + apple-auth.ts
6. Auth.tsx iOS-Weiche fuer Apple einbauen
7. config.toml aktualisieren

