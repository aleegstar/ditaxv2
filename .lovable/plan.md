
# Apple Sign In auf iOS fixen (gemaess Despia-Dokumentation)

## Problem

Apple Login nutzt aktuell auf iOS und Android den gleichen `oauth://` -> `auth-start` -> Supabase OAuth Flow. Das funktioniert auf Android, aber NICHT auf iOS, weil `ASWebAuthenticationSession` isolierten Speicher hat.

## Was sagt die Despia-Dokumentation?

Die offizielle Despia-Doku (https://setup.despia.com/lovable/native-features/o-auth-2-0/apple-auth) definiert klar:

- **iOS**: Apple JS SDK -> Nativer Face ID Dialog (direkt im WebView, kein Browser noetig)
- **Android**: `oauth://` Protokoll -> Chrome Custom Tab -> form_post (bleibt wie jetzt)
- **Web**: Apple JS SDK -> Browser Dialog

Das ist KEIN Wechsel weg von Despia -- das IST der offizielle Despia-Weg fuer Apple auf iOS. Der `oauth://`-Mechanismus ist nur fuer Android gedacht, weil Android keine native Apple-Unterstuetzung hat.

## Was bleibt unveraendert

- Android Apple Login (oauth:// Flow via auth-start) -- KEIN Code wird geaendert
- Android Google Login -- KEIN Code wird geaendert
- Web Flows -- KEIN Code wird geaendert
- NativeCallback.tsx -- bleibt wie es ist
- Die `#`-basierte Token-Uebergabe fuer Google auf Android -- wird NICHT angefasst

## Aenderungen

| Datei | Aenderung |
|---|---|
| `index.html` | Apple JS SDK Script-Tag + CSP fuer `appleid.cdn-apple.com` und `appleid.apple.com` |
| `src/lib/apple-auth.ts` | **Neue Datei**: Platform-Erkennung, `initAppleAuth()`, `signInWithAppleJS()` |
| `src/pages/Auth.tsx` | `handleAppleAuth`: iOS-Weiche VOR dem bestehenden Despia-Block |
| `src/pages/AuthLoading.tsx` | **Neue Datei**: Verarbeitet JS SDK Response, POSTet an Edge Function, setzt Session |
| `src/App.tsx` | Route `/auth-loading` + `initAppleAuth()` beim Start |
| `supabase/functions/auth-apple-callback/index.ts` | **Neue Edge Function**: Verarbeitet JSON (iOS/Web) UND form_post (Android) |
| `supabase/config.toml` | `verify_jwt = false` fuer auth-apple-callback |

## Benoetigte Secrets (Edge Function Secrets in Supabase)

Diese 5 Werte muessen als Edge Function Secrets gesetzt werden (die gleichen Credentials die du schon als Auth Provider konfiguriert hast):

- `APPLE_CLIENT_ID` -- Deine Apple Service ID
- `APPLE_TEAM_ID` -- Team ID
- `APPLE_KEY_ID` -- Key ID des Sign In with Apple Keys
- `APPLE_PRIVATE_KEY` -- Inhalt der .p8 Datei (Zeilenumbrueche durch `\n` ersetzen)
- `APP_URL` -- `https://app.ditax.ch`

## Apple Developer Console

Stelle sicher dass in der Service ID konfiguriert ist:

- Domain: `app.ditax.ch`
- Domain: `gqbhilftduwxjszznnzy.supabase.co`
- Return URL: `https://gqbhilftduwxjszznnzy.supabase.co/functions/v1/auth-apple-callback`
- Return URL: `https://app.ditax.ch/auth/apple/callback`

## iOS Flow (NEU -- gemaess Despia-Doku)

```text
1. User tippt "Mit Apple anmelden"
2. isDespiaIOS() = true
3. Apple JS SDK zeigt nativen Face ID Dialog (KEIN Browser!)
4. User authentifiziert sich mit Face ID
5. JS SDK gibt id_token + code zurueck (direkt an JavaScript)
6. Navigate zu /auth-loading mit den Credentials
7. AuthLoading POSTet id_token als JSON an auth-apple-callback Edge Function
8. Edge Function verifiziert Token mit Apple JWKS Public Keys
9. Edge Function erstellt/findet Supabase User via Admin API
10. Edge Function gibt access_token + refresh_token als JSON zurueck
11. App setzt Session mit supabase.auth.setSession()
12. Redirect zu / -- fertig, alles im WebView
```

## Android Flow (KOMPLETT UNVERAENDERT)

```text
1. isDespiaIOS() = false, isDespiaNative() = true
2. auth-start Edge Function -> Supabase OAuth URL
3. despia('oauth://...') -> Chrome Custom Tab
4. NativeCallback -> Deeplink mit Tokens (ueber #)
5. Auth.tsx setzt Session
```

## Technische Details

### index.html

Apple JS SDK Script hinzufuegen und CSP erweitern:
- `script-src`: `https://appleid.cdn-apple.com` hinzufuegen
- `connect-src`: `https://appleid.apple.com` hinzufuegen

### apple-auth.ts (Neue Datei)

Gemaess Despia-Doku Zeile 143-243:
- `detectPlatform()`: Prueft UserAgent auf `despia-iphone`/`despia-ipad` (iOS), `despia-android` (Android), sonst Web
- `initAppleAuth()`: Initialisiert Apple JS SDK mit Client ID (nur iOS/Web, NICHT Android)
- `signInWithAppleJS()`: Ruft `AppleID.auth.signIn()` auf, gibt `idToken`, `code`, `user` zurueck
- `setAppleSession()`: Wrapper fuer `supabase.auth.setSession()`
- Kein `import.meta.env.VITE_*` -- APPLE_CLIENT_ID wird direkt hardcoded (ist publishable, wie in Despia-Doku beschrieben)

### Auth.tsx -- handleAppleAuth Aenderung

Neue iOS-Weiche wird VOR dem bestehenden `if (isDespia)` Block eingefuegt:

```text
if (isDespia && isDespiaIOS()) {
  // iOS: Apple JS SDK (gemaess Despia-Doku)
  const { idToken, code, user } = await signInWithAppleJS();
  navigate('/auth-loading', { state: { idToken, code, user, platform: 'ios' }, replace: true });
  return;
}

// UNVERAENDERT: Bestehender Android-Flow
if (isDespia) {
  // auth-start -> oauth:// -> ...
}
```

### AuthLoading.tsx (Neue Datei)

Gemaess Despia-Doku Zeile 326-414:
- Empfaengt `idToken`, `code`, `user` via `location.state`
- POSTet als JSON an `auth-apple-callback` Edge Function
- Empfaengt `access_token` + `refresh_token` als JSON Response
- Setzt Session via `supabase.auth.setSession()`
- Navigiert zu `/` bei Erfolg

### auth-apple-callback Edge Function (Neue Datei)

Gemaess Despia-Doku Zeile 555-794. Verarbeitet zwei Formate:

**JSON (iOS/Web -- vom JS SDK):**
- Empfaengt `{ id_token, code, user, platform }`
- Verifiziert mit Apple JWKS Public Keys
- Erstellt/findet Supabase User
- Gibt `{ access_token, refresh_token }` als JSON zurueck

**form_post (Android -- von oauth:// Flow):**
- Empfaengt `id_token`, `code`, `user`, `state` als Formulardaten
- Verifiziert Token
- Erstellt/findet User
- Redirect zu Deeplink: `ditax://oauth/auth?access_token=xxx`

Session-Erzeugung: `admin.generateLink({ type: 'magiclink' })` + `verifyOtp()` (KEIN manuelles JWT!)

## Reihenfolge

1. Secrets im Supabase-Dashboard setzen (APPLE_CLIENT_ID, APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY, APP_URL)
2. Apple Developer Console pruefen (Domains + Return URLs)
3. `auth-apple-callback` Edge Function erstellen
4. `supabase/config.toml` aktualisieren
5. Apple JS SDK in `index.html` einbinden
6. `apple-auth.ts` erstellen
7. `AuthLoading.tsx` erstellen
8. `Auth.tsx` anpassen (iOS-Weiche)
9. `App.tsx` aktualisieren (Route + Init)
10. Testen auf iOS-Geraet
