
# Fix: Google und Apple Sign In auf iPhone (Despia iOS)

## Analyse

Nach umfassender Pruefung des Codes und der Despia-Dokumentation gibt es **zwei separate Probleme**:

### Problem 1: Google Sign In auf iOS
Der Google OAuth Flow nutzt `despia('oauth://...')` -> ASWebAuthenticationSession -> NativeCallback -> Deeplink zurueck zur App. Dieser Flow ist laut Despia-Doku korrekt fuer **beide Plattformen** (iOS + Android). 

**Moegliche Ursache**: Der `auth-start` Edge Function verwendet `flow_type=implicit`, was Tokens im Hash-Fragment (`#access_token=xxx`) zurueckgibt. Auf iOS mit ASWebAuthenticationSession kann das Hash-Fragment beim Redirect verloren gehen. NativeCallback versucht Tokens aus Hash, Path und Query Params zu extrahieren, aber wenn das Hash-Fragment verloren geht, findet NativeCallback keine Tokens und zeigt "Keine Zugangstokens gefunden".

**Fix**: Den `auth-start` Edge Function um einen expliziten `response_type=token` Parameter erweitern und sicherstellen, dass NativeCallback robuster Tokens aus allen URL-Teilen extrahiert. Ausserdem muss Auth.tsx die Tokens korrekt aus den Deeplink-Query-Parametern verarbeiten.

### Problem 2: Apple Sign In auf iOS
Apple Sign In nutzt aktuell den gleichen `oauth://` Flow wie Google. Laut Despia-Dokumentation ist der empfohlene Ansatz fuer Apple auf iOS jedoch das **Apple JS SDK** (nativer Face ID Dialog), da iOS native Apple Sign In Unterstuetzung hat.

**Fix**: Platform-spezifische Implementierung:
- iOS: Apple JS SDK -> Face ID Dialog -> Edge Function -> Session
- Android: oauth:// Flow bleibt unveraendert

## Aenderungen

### 1. NativeCallback.tsx - Robustere Token-Extraktion
- Zusaetzliche Fallback-Logik fuer den Fall, dass Hash-Fragmente auf iOS verloren gehen
- Logging verbessern um das Problem zu diagnostizieren

### 2. Auth.tsx - Deeplink Token Handling verbessern
- Sicherstellen, dass Tokens aus Query-Parametern (vom Deeplink) korrekt verarbeitet werden
- Platform-spezifische Apple-Weiche einbauen:
  - `isDespiaIOS()` -> Apple JS SDK Flow (neu)
  - `isDespiaAndroid()` oder `isDespiaNative()` -> bestehender oauth:// Flow
- Google Flow bleibt fuer beide Plattformen gleich (oauth://)

### 3. Apple JS SDK Integration (nur fuer Apple auf iOS)
- `index.html`: Apple JS SDK Script laden + CSP erweitern
- `src/lib/apple-auth.ts`: Neue Datei mit Apple SDK Wrapper
- `src/pages/AuthLoading.tsx`: Neue Seite die id_token an Edge Function sendet
- `src/App.tsx`: Route + Apple SDK Init hinzufuegen

### 4. Edge Function: auth-apple-callback (NEU)
- Verifiziert Apple id_token mit Apple JWKS Public Keys
- Erstellt/findet Supabase User via Admin API
- Gibt access_token + refresh_token als JSON zurueck (iOS/Web)
- Gibt Redirect mit Deeplink zurueck (Android)

### 5. supabase/config.toml
- `verify_jwt = false` fuer auth-apple-callback

## Voraussetzungen (vom User zu erledigen)

Bevor Apple Sign In auf iOS funktioniert, muessen folgende **Edge Function Secrets** im Supabase Dashboard konfiguriert werden (unter Settings > Edge Functions > Secrets):

- `APPLE_CLIENT_ID` -- Service ID aus Apple Developer Console
- `APPLE_TEAM_ID` -- Team ID aus Apple Developer Portal  
- `APPLE_KEY_ID` -- Key ID des Sign In with Apple Keys
- `APPLE_PRIVATE_KEY` -- Inhalt der .p8 Datei (Zeilenumbrueche durch `\n` ersetzen)
- `APP_URL` -- `https://app.ditax.ch`

Apple Developer Console muss konfiguriert sein:
- Service ID mit Domains `app.ditax.ch` und `gqbhilftduwxjszznnzy.supabase.co`
- Return URLs: `https://gqbhilftduwxjszznnzy.supabase.co/functions/v1/auth-apple-callback` und `https://app.ditax.ch/auth/apple/callback`

## Zusammenfassung der Flows nach dem Fix

| Provider | iOS | Android |
|---|---|---|
| Google | oauth:// (gleich wie Android, Token-Handling verbessert) | oauth:// (unveraendert) |
| Apple | Apple JS SDK -> Face ID -> Edge Function (NEU) | oauth:// (unveraendert) |

## Technische Details

### Apple JS SDK Flow (iOS)
```text
1. handleAppleAuth() -> isDespiaIOS() = true
2. AppleID.auth.signIn() -> nativer Face ID Dialog
3. Response: { id_token, code, user }
4. navigate('/auth-loading', { state: { idToken, code, user } })
5. AuthLoading POST -> auth-apple-callback Edge Function
6. Edge Function: Token verifizieren, User erstellen, Session generieren
7. Response: { access_token, refresh_token }
8. supabase.auth.setSession() -> navigate('/')
```

### Google OAuth Flow (beide Plattformen)
```text
1. handleGoogleAuth() -> isDespiaNative() = true
2. auth-start Edge Function -> OAuth URL
3. despia('oauth://?url=...') -> ASWebAuth/CustomTab
4. Google Login -> Redirect zu /native-callback/ditax/#access_token=xxx
5. NativeCallback: Tokens extrahieren -> Deeplink ditax://oauth/auth?tokens
6. Despia: Browser schliessen -> WebView /auth?tokens
7. Auth.tsx: setSession(tokens) -> navigate('/')
```
