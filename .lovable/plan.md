

# Fix: Google und Apple Sign In auf iPhone (nur iOS)

Android bleibt komplett unveraendert. Plan basiert 1:1 auf der offiziellen Despia-Dokumentation.

## Analyse der Probleme

### Google Sign In auf iOS
**Ursache**: `auth-start` verwendet `flow_type=implicit`. Supabase gibt Tokens im Hash-Fragment zurueck (`#access_token=xxx`). Auf iOS geht das Hash-Fragment in ASWebAuthenticationSession verloren -> NativeCallback findet keine Tokens.

**Loesung**: Auf PKCE Code-Flow umstellen. Der `code` kommt als Query-Parameter (`?code=xxx`), der auf iOS zuverlaessig erhalten bleibt. NativeCallback tauscht den Code gegen Tokens und sendet diese per Deeplink zurueck.

### Apple Sign In auf iOS (und alle Plattformen)
**Ursache**: Apple nutzt aktuell den gleichen `auth-start` Flow wie Google (ueber Supabase OAuth). Laut Despia-Dokumentation braucht Apple einen **komplett separaten Flow** mit eigener Edge Function, weil Apple `response_mode: form_post` verwendet (POSTet Daten an den Server statt Redirect).

**Loesung**: Eigene `auth-apple-callback` Edge Function + `apple-auth.ts` Helper gemaess Despia Apple OAuth Docs. Der Flow geht direkt zu Apple (nicht ueber Supabase OAuth), Apple POSTet an die Edge Function, die verifiziert und per Deeplink/Redirect zurueckleitet.

## Voraussetzungen (vom User zu erledigen)

Folgende **Edge Function Secrets** muessen im Supabase Dashboard konfiguriert werden (Settings > Edge Functions > Secrets):

- **APPLE_CLIENT_ID** -- Service ID aus Apple Developer Console (z.B. `com.ditax.web`)
- **APPLE_TEAM_ID** -- Team ID aus dem Apple Developer Portal (z.B. `7CS76AQT6P`)
- **APPLE_KEY_ID** -- Key ID des Sign In with Apple Keys
- **APPLE_PRIVATE_KEY** -- Inhalt der .p8 Datei (Zeilenumbrueche durch `\n` ersetzen)
- **APP_URL** -- `https://app.ditax.ch`

Apple Developer Console Konfiguration:
- Service ID mit Domains: `app.ditax.ch` und `gqbhilftduwxjszznnzy.supabase.co`
- Return URL: `https://gqbhilftduwxjszznnzy.supabase.co/functions/v1/auth-apple-callback`

## Aenderungen

### 1. `supabase/functions/auth-start/index.ts` -- PKCE statt Implicit

Aenderung der OAuth URL von `flow_type=implicit` zu `flow_type=pkce&response_type=code`. Dadurch gibt Supabase einen `code` als Query-Parameter zurueck statt Tokens im Hash-Fragment. PKCE ist abwaertskompatibel und funktioniert auch auf Android.

### 2. `src/pages/NativeCallback.tsx` -- Code-Flow Handling

Neue Logik am Anfang von `processAuth()`:
- Pruefen ob `code` als Query-Parameter vorhanden
- Wenn ja: `supabase.auth.exchangeCodeForSession(code)` aufrufen
- Tokens aus dem Result extrahieren
- Deeplink mit Tokens senden (wie bisher)
- Bestehende Hash-Extraktion bleibt als Fallback fuer Kompatibilitaet

### 3. `src/lib/apple-auth.ts` -- Neue Datei (gemaess Despia Docs)

- `getAppleOAuthUrl(isNative, deeplinkScheme)` -- Baut die Apple OAuth URL mit:
  - `client_id`: APPLE_CLIENT_ID (hardcoded, ist oeffentlich)
  - `response_type`: `code id_token`
  - `response_mode`: `form_post` (Apple-Pflicht fuer name/email)
  - `scope`: `name email`
  - `redirect_uri`: Edge Function URL
  - `state`: `uuid|deeplinkScheme` (fuer native) oder `uuid` (fuer web)
- `startAppleSignIn(isNative, deeplinkScheme)` -- Startet den Flow
- `setAppleSession(accessToken, refreshToken)` -- Setzt Session

### 4. `supabase/functions/auth-apple-callback/index.ts` -- Neue Edge Function

Exakt nach Despia Apple OAuth Dokumentation:
1. Empfaengt POST mit FormData (`id_token`, `code`, `state`, `user`)
2. Parsed `state` fuer native-Erkennung (`uuid|ditax`)
3. Verifiziert `id_token` mit Apple JWKS Public Keys (jose Library)
4. Erstellt/findet Supabase User via `admin.createUser()`
5. Generiert Session via `admin.generateLink(magiclink)` + `verifyOtp()`
6. Native: Redirect zu `ditax://oauth/auth?access_token=xxx&refresh_token=yyy`
7. Web: Redirect zu `https://app.ditax.ch/auth?access_token=xxx&refresh_token=yyy`

### 5. `src/pages/Auth.tsx` -- Apple-Weiche

`handleAppleAuth` wird geaendert:
- Despia-Erkennung bleibt
- Statt `auth-start` Edge Function wird `getAppleOAuthUrl(true, DEEPLINK_SCHEME)` verwendet
- `despia('oauth://?url=...')` oeffnet die Apple OAuth URL direkt
- Kein Supabase-OAuth-Umweg mehr fuer Apple
- Google-Flow bleibt unveraendert (nutzt weiterhin `auth-start`)

### 6. `supabase/config.toml` -- Neue Function registrieren

`verify_jwt = false` fuer `auth-apple-callback` hinzufuegen.

## Flows nach dem Fix

### Google auf iPhone (PKCE)

```text
1. Auth.tsx -> auth-start Edge Function (PKCE)
2. despia('oauth://...') -> ASWebAuthenticationSession
3. Google Login -> Supabase Redirect
4. Redirect zu /native-callback/ditax/?code=xxx (Query-Param!)
5. NativeCallback: exchangeCodeForSession(code) -> Tokens
6. Deeplink ditax://oauth/auth?access_token=xxx&refresh_token=yyy
7. Despia schliesst Browser -> WebView /auth?tokens
8. Auth.tsx: setSession(tokens) -> navigate('/')
```

### Apple auf iPhone (Form Post + Edge Function)

```text
1. Auth.tsx -> getAppleOAuthUrl(true, 'ditax')
2. despia('oauth://...') -> ASWebAuthenticationSession
3. Apple Login (Face ID/Touch ID)
4. Apple POSTet { id_token, code, user } an auth-apple-callback
5. Edge Function verifiziert Token, erstellt User, generiert Session
6. Edge Function Redirect zu ditax://oauth/auth?access_token=xxx
7. Despia schliesst Browser -> WebView /auth?tokens
8. Auth.tsx: setSession(tokens) -> navigate('/')
```

### Google/Apple auf Android (UNVERAENDERT)

Bleibt exakt wie bisher. PKCE ist abwaertskompatibel.

## Zusammenfassung

| Provider | iPhone (NEU) | Android (UNVERAENDERT) |
|---|---|---|
| Google | oauth:// + PKCE Code-Flow | oauth:// + PKCE (kompatibel) |
| Apple | oauth:// + eigene Edge Function (form_post) | oauth:// via Supabase (bleibt gleich) |

## Reihenfolge der Implementierung

1. `auth-start` auf PKCE umstellen (behebt Google iPhone)
2. NativeCallback Code-Flow Handling einbauen
3. `apple-auth.ts` erstellen
4. `auth-apple-callback` Edge Function erstellen
5. Auth.tsx Apple-Weiche anpassen
6. `config.toml` aktualisieren
7. User auffordern, Apple Secrets zu konfigurieren

