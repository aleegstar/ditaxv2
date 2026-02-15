

# Fix: Google + Apple Login auf iOS (Despia)

## Problem

Beide OAuth-Flows (Google und Apple) nutzen aktuell `flow_type=implicit`, das Tokens im Hash-Fragment (`#access_token=xxx`) uebergibt. Auf Android funktioniert das dank dem manuell hinzugefuegten `#` (trailing slash im redirect_url). Auf iOS (ASWebAuthenticationSession) geht der Hash-Fragment verloren -- deshalb funktioniert weder Google noch Apple.

**Wichtig:** Der Android-Flow mit dem manuell hinzugefuegten `#` wird NICHT veraendert.

## Loesung

Plattform-spezifische Flows in `auth-start`:

| Plattform | Google | Apple |
|---|---|---|
| **Android** | `flow_type=implicit` (unveraendert) | `flow_type=implicit` (unveraendert) |
| **iOS** | `flow_type=pkce` (Code statt Hash) | Redirect-Flow mit `form_post` via `auth-apple-callback` Edge Function |

### Warum PKCE fuer Google auf iOS?

PKCE (`flow_type=pkce`) gibt einen `code` als **Query-Parameter** zurueck (`?code=xxx`), nicht im Hash-Fragment. Query-Parameter gehen in ASWebAuthenticationSession **nicht verloren**.

### Warum form_post fuer Apple auf iOS?

Apple erfordert `response_mode: form_post` wenn `name`/`email` Scopes angefragt werden. Das POSTet direkt an eine Edge Function, die den Token verifiziert und per Deeplink zurueckgibt.

## Aenderungen

| Datei | Aenderung |
|---|---|
| `supabase/functions/auth-start/index.ts` | Neuer Parameter `platform` akzeptieren; iOS: PKCE fuer Google, separate Apple-URL mit form_post |
| `src/pages/Auth.tsx` | `platform: 'ios'/'android'` an auth-start senden (basierend auf `isDespiaIOS()`) |
| `src/pages/NativeCallback.tsx` | PKCE Code-Exchange hinzufuegen: wenn `?code=xxx` statt `#access_token=xxx` |
| `supabase/functions/auth-apple-callback/index.ts` | **Neue Edge Function**: Empfaengt Apple form_post, verifiziert Token, erstellt Session, Deeplink-Redirect |
| `supabase/config.toml` | `verify_jwt = false` fuer auth-apple-callback |

## Detaillierter Ablauf

### Google auf iOS (NEU)

```text
1. User tippt "Mit Google anmelden"
2. Auth.tsx: isDespiaIOS() -> true -> sendet platform='ios' an auth-start
3. auth-start generiert URL mit flow_type=pkce + code_challenge
4. despia('oauth://...') oeffnet ASWebAuthenticationSession
5. User meldet sich bei Google an
6. Supabase redirected zu /native-callback/ditax/?code=xxx (Query-Parameter, kein Hash!)
7. NativeCallback erkennt ?code= -> tauscht Code gegen Session-Tokens via Supabase
8. Deeplink zurueck zur App mit access_token
9. Auth.tsx setzt Session
```

### Google auf Android (UNVERAENDERT)

```text
1-6. Exakt wie bisher (flow_type=implicit, Hash-Fragment mit #)
7. NativeCallback liest Tokens aus Hash
8-9. Deeplink + Session setzen
```

### Apple auf iOS (NEU)

```text
1. User tippt "Mit Apple anmelden"
2. Auth.tsx: isDespiaIOS() -> true
3. Apple OAuth URL direkt gebaut (form_post, redirect an auth-apple-callback)
4. despia('oauth://...') oeffnet ASWebAuthenticationSession
5. User authentifiziert sich mit Face ID
6. Apple POSTet id_token an auth-apple-callback Edge Function
7. Edge Function verifiziert Token, erstellt Supabase Session
8. Edge Function antwortet mit HTML-Redirect zu ditax://oauth/auth?access_token=xxx
9. ASWebAuthenticationSession schliesst sich
10. Auth.tsx setzt Session
```

### Apple auf Android (UNVERAENDERT)

```text
Exakt wie bisher (auth-start -> oauth:// -> implicit flow)
```

## Technische Details

### auth-start Aenderung

```text
Neuer Parameter: platform ('ios' | 'android' | undefined)

Wenn platform === 'ios' UND provider === 'google':
  -> flow_type=pkce statt implicit
  -> code_challenge + code_challenge_method=S256 generieren
  -> code_verifier als Parameter an redirect_url anhaengen

Wenn platform === 'ios' UND provider === 'apple':
  -> Eigene Apple OAuth URL bauen (nicht Supabase)
  -> response_mode=form_post
  -> redirect_uri = auth-apple-callback Edge Function URL

Sonst (Android):
  -> Alles unveraendert (flow_type=implicit)
```

### NativeCallback Aenderung

```text
Zusaetzliche Pruefung: wenn queryParams.get('code') vorhanden:
  -> Code-Exchange via supabase.auth.exchangeCodeForSession(code)
  -> Dann wie bisher: Session setzen + Deeplink
```

### auth-apple-callback Edge Function

- Empfaengt POST (application/x-www-form-urlencoded) von Apple
- Verifiziert id_token mit Apple JWKS Public Keys
- Erstellt/findet Supabase User via Admin API
- Generiert Session via generateLink + verifyOtp
- Antwortet mit HTML-Seite die Meta-Refresh + JS Redirect auf ditax://oauth/auth?access_token=xxx ausfuehrt

### Benoetigte Secrets fuer Apple

Da Apple als Supabase Auth Provider konfiguriert ist, werden fuer den form_post Flow trotzdem Edge Function Secrets benoetigt, weil die Edge Function den Apple Token selbst verifizieren muss:

- `APPLE_CLIENT_ID` -- Service ID
- `APPLE_TEAM_ID` -- Team ID
- `APPLE_KEY_ID` -- Key ID
- `APPLE_PRIVATE_KEY` -- .p8 Datei Inhalt
- `APP_URL` -- https://app.ditax.ch

Fuer Google auf iOS werden **keine zusaetzlichen Secrets** benoetigt -- PKCE laeuft komplett ueber Supabase.

## Zusammenfassung

- **Google iOS**: Implicit -> PKCE (Tokens als Query-Parameter statt Hash)
- **Google Android**: Unveraendert
- **Apple iOS**: Neuer form_post Flow mit eigener Edge Function
- **Apple Android**: Unveraendert
- Der manuell hinzugefuegte `#` fuer Android wird nicht angefasst

