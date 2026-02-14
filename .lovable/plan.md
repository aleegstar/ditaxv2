# Fix: Apple Social Login auf iOS (Despia)

## Zusammenfassung

Apple Login funktioniert auf Android (oauth:// Flow), aber nicht auf iOS, weil ASWebAuthenticationSession isolierten Speicher hat. Die Loesung: iOS nutzt das Apple JS SDK (nativer Face ID Dialog direkt im WebView), Android bleibt unveraendert.

## Voraussetzung: Edge Function Secrets

Die Apple Credentials sind aktuell nur als Supabase Auth Provider konfiguriert. Fuer den iOS JS SDK Flow brauchen wir sie **zusaetzlich** als Edge Function Secrets:

- **APPLE_CLIENT_ID** -- Deine Service ID (z.B. `com.ditax.web`)
- **APPLE_TEAM_ID** -- Team ID aus dem Apple Developer Portal
- **APPLE_KEY_ID** -- Key ID des Sign In with Apple Keys
- **APPLE_PRIVATE_KEY** -- Inhalt der .p8 Datei (Zeilenumbrueche durch `\n` ersetzen)
- **APP_URL** -- `https://app.ditax.ch`

Diese werden als erstes abgefragt bevor der Code geschrieben wird.

## Aenderungen


| Datei                                             | Aenderung                                                                                              |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `index.html`                                      | Apple JS SDK Script-Tag + CSP-Erweiterung fuer `appleid.cdn-apple.com`                                 |
| `src/lib/apple-auth.ts`                           | **Neue Datei**: Apple JS SDK Init, `signInWithAppleJS()`, Platform-Erkennung                           |
| `src/pages/Auth.tsx`                              | `handleAppleAuth` anpassen: iOS -> JS SDK, Android -> unveraendert                                     |
| `src/pages/AuthLoading.tsx`                       | **Neue Datei**: Verarbeitet JS SDK Response, sendet id_token an Edge Function                          |
| `src/App.tsx`                                     | Route `/auth-loading` hinzufuegen + `initAppleAuth()` aufrufen                                         |
| `supabase/functions/auth-apple-callback/index.ts` | **Neue Edge Function**: Apple Token verifizieren, Supabase User erstellen, Session-Tokens zurueckgeben |
| `supabase/config.toml`                            | `verify_jwt = false` fuer auth-apple-callback                                                          |


## Ablauf iOS (NEU)

1. User tippt "Mit Apple anmelden"
2. `isDespiaIOS()` ergibt `true`
3. Apple JS SDK zeigt nativen Face ID Dialog (kein Browser!)
4. User authentifiziert sich
5. JS SDK gibt `id_token` + `code` zurueck
6. Navigate zu `/auth-loading` mit den Credentials
7. AuthLoading sendet `id_token` als JSON POST an `auth-apple-callback`
8. Edge Function verifiziert Token mit Apple JWKS Public Keys
9. Edge Function erstellt/findet Supabase User via Admin API
10. Edge Function gibt `access_token` + `refresh_token` zurueck
11. App setzt Session mit `supabase.auth.setSession()`
12. Redirect zu `/` -- fertig, alles im WebView

## Ablauf Android (UNVERAENDERT)

Kein Code wird im Android-Flow geaendert. `handleAppleAuth` prueft zuerst `isDespiaIOS()` -- nur wenn `false` und `isDespiaNative()` true, laeuft der bestehende oauth:// Flow.

## Technische Details

### apple-auth.ts

- Nutzt `isDespiaIOS()` und `isDespiaAndroid()` aus `src/lib/despia.ts`
- `initAppleAuth()`: Initialisiert das Apple JS SDK mit der `APPLE_CLIENT_ID` (hardcoded, da publishable)
- `signInWithAppleJS()`: Ruft `AppleID.auth.signIn()` auf, gibt `idToken`, `code`, `user` zurueck
- Wird nur auf iOS und Web initialisiert, nicht auf Android

### Auth.tsx Aenderung (handleAppleAuth)

- Neue iOS-Weiche innerhalb des bestehenden `if (isDespia)` Blocks
- `isDespiaIOS()` -> Apple JS SDK Flow (neu)
- Sonst -> bestehender oauth:// Flow (unveraendert)

### auth-apple-callback Edge Function

- Akzeptiert JSON POST (iOS/Web) und form_post (Android)
- Verifiziert Apple id_token mit Apple JWKS Public Keys (jose Library)
- Erstellt User via `supabase.auth.admin.createUser()` oder findet existierenden
- Generiert Session via `generateLink()` + `verifyOtp()`
- Gibt `access_token` + `refresh_token` als JSON zurueck (iOS/Web) oder Redirect (Android)

### CSP Anpassung in index.html

- `script-src`: `https://appleid.cdn-apple.com` hinzufuegen
- `connect-src`: `https://appleid.apple.com` hinzufuegen