
# Apple Sign In auf iOS fixen

## Problem

Apple Login auf iOS funktioniert nicht. Der aktuelle Code (Zeilen 278-310 in Auth.tsx) nutzt fuer **alle** Despia-Geraete den gleichen Flow: `auth-start` Edge Function -> Supabase OAuth URL -> `despia('oauth://...')`. Auf Android funktioniert das (Chrome Custom Tabs teilen Storage), auf iOS hat `ASWebAuthenticationSession` isolierten Speicher -- die Session kommt nie im WebView an.

## Loesung

Eine iOS-Weiche wird **vor** dem bestehenden Despia-Block eingefuegt. iOS nutzt einen direkten Apple OAuth Flow mit `response_mode: form_post`. Apple POSTet an eine neue Edge Function, die den Token verifiziert, eine echte Supabase-Session erstellt und per Deeplink zurueckgibt.

**Der bestehende Android-Block (Zeilen 278-310) bleibt exakt unveraendert.**

## Voraussetzung: 5 Edge Function Secrets

Diese Secrets muessen **zuerst** im Supabase Dashboard gesetzt werden (Settings > Edge Functions > Secrets):

| Secret | Beschreibung |
|--------|-------------|
| `APPLE_CLIENT_ID` | Deine Apple Service ID (z.B. `com.ditax.web`) |
| `APPLE_TEAM_ID` | 10-stellige Team ID aus dem Apple Developer Portal |
| `APPLE_KEY_ID` | Key ID des Sign In with Apple Keys |
| `APPLE_PRIVATE_KEY` | Inhalt der .p8 Datei (Zeilenumbrueche durch `\n` ersetzen) |
| `APP_URL` | `https://app.ditax.ch` |

Aktuell sind diese Secrets noch **nicht** vorhanden. Du wirst aufgefordert, sie zu setzen, bevor der Code geschrieben wird.

## Apple Developer Console

Stelle sicher, dass in deiner Apple Service ID konfiguriert ist:
- **Domain:** `gqbhilftduwxjszznnzy.supabase.co`
- **Return URL:** `https://gqbhilftduwxjszznnzy.supabase.co/functions/v1/auth-apple-callback`

## Aenderungen

| Datei | Aktion | Was passiert |
|-------|--------|-------------|
| `supabase/functions/auth-apple-callback/index.ts` | **Neu** | Empfaengt Apple form_post, verifiziert Token, erstellt Supabase-Session, Redirect per Deeplink |
| `src/lib/apple-auth.ts` | **Neu** | `getAppleOAuthUrl()` baut direkte Apple OAuth URL |
| `src/pages/Auth.tsx` | **Aendern** | iOS-Weiche VOR Zeile 278 (bestehender Android-Block bleibt 1:1 unveraendert) |
| `supabase/config.toml` | **Aendern** | `verify_jwt = false` fuer auth-apple-callback |
| `supabase/functions/get-stripe-revenue/index.ts` | **Aendern** | Build-Fix: `catch (error)` -> `catch (error: any)` |

## Code-Aenderung in Auth.tsx (handleAppleAuth)

Nur diese Zeilen werden **vor** Zeile 278 eingefuegt. Alles ab Zeile 278 bleibt exakt so:

```text
// NEU: iOS-spezifischer Apple Flow (VOR dem bestehenden Block)
if (isDespia && isDespiaIOS()) {
  try {
    const url = getAppleOAuthUrl(true, DEEPLINK_SCHEME);
    if (!url) {
      toast.error("Apple Sign In nicht konfiguriert");
      isOAuthInProgress.current = false;
      setIsOAuthLoading(false);
      return;
    }
    despia(`oauth://?url=${encodeURIComponent(url)}`);
    setTimeout(() => {
      isOAuthInProgress.current = false;
      setIsOAuthLoading(false);
    }, 30000);
  } catch (err) {
    toast.error("Fehler bei der Apple-Anmeldung");
    isOAuthInProgress.current = false;
    setIsOAuthLoading(false);
  }
  return;
}

// UNVERAENDERT AB HIER: Bestehender Android Despia-Block (Zeilen 278-310)
if (isDespia) {
  // ... auth-start -> oauth:// -> NativeCallback (BLEIBT EXAKT SO)
}
```

Der bestehende Token-Empfang in `useEffect` (Zeilen 127-145) verarbeitet `access_token` und `refresh_token` aus Query-Parametern bereits korrekt -- funktioniert ohne Aenderung fuer den neuen iOS-Flow.

## Neue Edge Function: auth-apple-callback

Ablauf:
1. Empfaengt POST von Apple (`application/x-www-form-urlencoded`)
2. Parst `id_token`, `code`, `user`, `state`
3. Erkennt Native-Flow anhand `|` im `state` Parameter
4. Verifiziert `id_token` mit Apple JWKS Public Keys (jose Library)
5. Erstellt Supabase User via `admin.createUser({ email_confirm: true })` oder findet existierenden
6. Generiert echte Supabase-Session via `admin.generateLink({ type: 'magiclink' })` + `supabasePublic.auth.verifyOtp()`
7. Native: HTML-Seite mit Meta-Refresh + JavaScript Redirect zu `ditax://oauth/auth?access_token=xxx&refresh_token=yyy`
8. Web: HTTP 302 Redirect zu `https://app.ditax.ch/auth?access_token=xxx&refresh_token=yyy`

## Neuer Helper: src/lib/apple-auth.ts

- `getAppleOAuthUrl(isNative, deeplinkScheme)`: Baut direkte Apple Authorization URL
  - `client_id`: Apple Service ID (hardcoded, ist publishable)
  - `response_type`: `code id_token`
  - `response_mode`: `form_post`
  - `scope`: `name email`
  - `redirect_uri`: Edge Function URL
  - `state`: `UUID|ditax` fuer Native

- `setAppleSession(accessToken, refreshToken)`: Wrapper fuer `supabase.auth.setSession()`

## iOS Flow (NEU)

```text
1. User tippt "Mit Apple anmelden"
2. isDespiaIOS() = true -> neuer Block greift
3. Apple OAuth URL wird direkt gebaut (form_post an Edge Function)
4. despia('oauth://?url=...') oeffnet ASWebAuthenticationSession
5. User authentifiziert sich mit Face ID
6. Apple POSTet id_token an auth-apple-callback
7. Edge Function verifiziert Token, erstellt echte Supabase-Session
8. Edge Function gibt HTML mit Deeplink: ditax://oauth/auth?access_token=xxx
9. ASWebAuthenticationSession schliesst sich
10. WebView navigiert zu /?access_token=xxx (Despia-Verhalten)
11. Auth.tsx useEffect (Zeile 127) erkennt access_token, ruft setSession() auf
12. Fertig
```

## Android Flow (EXAKT UNVERAENDERT)

```text
1. isDespiaIOS() = false
2. isDespiaNative() = true -> bestehender Block (Zeile 278) greift
3. auth-start -> Supabase OAuth URL -> despia('oauth://...')
4. Chrome Custom Tab -> NativeCallback -> Deeplink
5. Auth.tsx setzt Session
```

Kein einziges Zeichen im Android-Flow wird geaendert.

## Reihenfolge

1. Secrets im Supabase Dashboard setzen (5 Secrets)
2. Build-Fix fuer get-stripe-revenue
3. auth-apple-callback Edge Function erstellen
4. apple-auth.ts Helper erstellen
5. Auth.tsx iOS-Weiche einbauen (vor Zeile 278)
6. config.toml aktualisieren
7. Auf iOS testen
