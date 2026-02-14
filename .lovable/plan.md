
# Fix: Apple Social Login auf iOS (Despia)

## Problem

Der Apple Login nutzt aktuell auf **beiden Plattformen** (iOS und Android) den gleichen `oauth://`-Flow. Auf Android funktioniert das einwandfrei (Chrome Custom Tabs teilen teilweise den Storage). Auf iOS jedoch hat `ASWebAuthenticationSession` **isolierten Speicher** -- die Session, die im Browser gesetzt wird, kommt nie im WebView an.

## Ursache laut Despia-Dokumentation

Die Despia-Doku beschreibt **zwei verschiedene Strategien** fuer Apple Sign In:

```text
iOS (Despia):     Apple JS SDK -> Native Face ID Dialog (instant, kein Browser noetig)
Android (Despia): oauth:// Protokoll -> Chrome Custom Tab -> form_post Callback
```

Der aktuelle Code verwendet fuer iOS den gleichen `oauth://`-Flow wie Android. Das ist das Problem.

## Loesung

Plattform-spezifische Implementierung: iOS nutzt das Apple JS SDK (nativer Face ID Dialog direkt im WebView), Android bleibt unveraendert.

### Aenderungen

| Datei | Aenderung |
|---|---|
| `index.html` | Apple JS SDK Script-Tag hinzufuegen |
| `src/lib/apple-auth.ts` | Neue Datei: Apple JS SDK Integration mit Plattform-Erkennung |
| `src/pages/Auth.tsx` | `handleAppleAuth` erweitern: iOS -> JS SDK, Android -> unveraendert (oauth://) |
| `src/pages/AuthLoading.tsx` | Neue Datei: Verarbeitung der JS SDK Response (id_token an Edge Function senden) |
| `supabase/functions/auth-apple-callback/index.ts` | Neue Edge Function: Apple Token verifizieren, Supabase User erstellen/finden, Session-Tokens zurueckgeben |
| `supabase/config.toml` | JWT-Verifizierung fuer auth-apple-callback deaktivieren |

### Benoetigte Secrets (MUSS VOR Implementierung konfiguriert werden)

Diese Secrets muessen im Supabase-Projekt konfiguriert werden:

- `APPLE_CLIENT_ID` -- Die Service ID aus dem Apple Developer Console (z.B. `com.ditax.web`)
- `APPLE_TEAM_ID` -- Team ID aus dem Apple Developer Portal
- `APPLE_KEY_ID` -- Key ID des Sign In with Apple Keys
- `APPLE_PRIVATE_KEY` -- Inhalt der `.p8` Datei

### Ablauf auf iOS (NEU)

```text
1. User tippt "Mit Apple anmelden"
2. isDespiaIOS() -> true
3. Apple JS SDK zeigt nativen Face ID Dialog (kein Browser!)
4. User authentifiziert sich mit Face ID
5. JS SDK gibt id_token + code zurueck
6. App sendet id_token an auth-apple-callback Edge Function
7. Edge Function verifiziert Token mit Apple Public Keys
8. Edge Function erstellt/findet Supabase User
9. Edge Function gibt access_token + refresh_token zurueck
10. App setzt Session mit supabase.auth.setSession()
11. Fertig -- alles im WebView, kein Browser noetig
```

### Ablauf auf Android (UNVERAENDERT)

```text
1. User tippt "Mit Apple anmelden"
2. isDespiaIOS() -> false, isDespiaNative() -> true
3. auth-start Edge Function liefert OAuth URL
4. despia('oauth://...') oeffnet Chrome Custom Tab
5. NativeCallback setzt Session + sendet Deeplink
6. Auth.tsx empfaengt Tokens
```

### Technische Details

**1. `index.html`** -- Apple JS SDK laden:
```html
<script type="text/javascript" src="https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js"></script>
```

**2. `src/lib/apple-auth.ts`** -- Neue Bibliothek:
- `initAppleAuth()` -- Initialisiert Apple ID SDK (nur iOS/Web, nicht Android)
- `signInWithAppleJS()` -- Ruft nativen Dialog auf, gibt id_token zurueck
- Nutzt bestehende `isDespiaIOS()` und `isDespiaAndroid()` aus `despia.ts`

**3. `src/pages/Auth.tsx`** -- handleAppleAuth Aenderung:
```typescript
if (isDespia) {
  if (isDespiaIOS()) {
    // NEU: Apple JS SDK fuer iOS
    const { idToken, code, user } = await signInWithAppleJS();
    // Sende an Edge Function...
  } else {
    // UNVERAENDERT: Android oauth:// Flow
    despia(`oauth://?url=${encodeURIComponent(data.url)}`);
  }
}
```

**4. `supabase/functions/auth-apple-callback/index.ts`**:
- Empfaengt id_token (JSON POST)
- Verifiziert mit Apple Public Keys (JWKS)
- Erstellt oder findet Supabase User via Admin API
- Gibt access_token + refresh_token zurueck

### Apple Developer Console Setup (vom User durchzufuehren)

Folgende Konfiguration muss im Apple Developer Portal vorhanden sein:

1. **App ID** mit "Sign In with Apple" aktiviert
2. **Service ID** (z.B. `com.ditax.web`) mit:
   - Domain: `app.ditax.ch`
   - Domain: `gqbhilftduwxjszznnzy.supabase.co`
   - Return URL: `https://gqbhilftduwxjszznnzy.supabase.co/functions/v1/auth-apple-callback`
   - Return URL: `https://app.ditax.ch/auth/apple/callback`
3. **Sign In Key** (.p8 Datei) erstellt und heruntergeladen

### Reihenfolge der Implementierung

1. User konfiguriert Apple Developer Console und liefert Credentials
2. Secrets im Supabase-Projekt setzen (APPLE_CLIENT_ID, APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY)
3. `auth-apple-callback` Edge Function erstellen
4. Apple JS SDK in index.html einbinden
5. `apple-auth.ts` Bibliothek erstellen
6. `Auth.tsx` anpassen (iOS-Weiche)
7. Testen auf iOS-Geraet
