
# Fix: Social Login (Google und Apple) funktioniert nicht auf iPhone

## Analyse

### Was die Logs zeigen

Die Auth-Logs beweisen, dass der Google OAuth-Flow **serverseitig erfolgreich** ist:
- auth-start Edge Function generiert OAuth URL korrekt
- Google Login wird erfolgreich abgeschlossen (Status 302, Login-Event)
- Session wird erstellt

**Aber**: Der User landet trotzdem auf /auth ohne Session. Das bedeutet, die Tokens kommen nicht zurueck in die App.

### Ursache 1: Google auf iOS

Der OAuth-Flow laeuft so:
1. Auth.tsx -> auth-start -> OAuth URL
2. `despia('oauth://...')` -> ASWebAuthenticationSession oeffnet sich
3. User authentifiziert sich bei Google
4. Supabase redirectet zu `/native-callback/ditax/#access_token=xxx`
5. NativeCallback extrahiert Tokens, sendet Deeplink: `ditax://oauth/auth?access_token=xxx`
6. Despia faengt Deeplink ab, schliesst Browser, navigiert WebView zu `/auth?access_token=xxx`
7. Auth.tsx liest Tokens, ruft setSession() auf

**Wahrscheinliches Problem**: In Schritt 4 koennte der Hash-Fragment (#access_token=xxx) verloren gehen, wenn app.ditax.ch kein korrektes SPA-Fallback hat, oder Supabase statt Implicit Flow den PKCE Flow nutzt (gibt `?code=xxx` statt `#access_token=xxx` zurueck). NativeCallback prueft nur den Hash, nicht Query-Parameter.

Zusaetzlich fehlt `response_type=token` im auth-start OAuth-URL, was dazu fuehren koennte, dass Supabase den PKCE Flow statt Implicit verwendet.

### Ursache 2: Apple auf iOS - Falscher Ansatz

Laut Despia-Dokumentation:

| Plattform | Methode | Erlebnis |
|-----------|---------|----------|
| **iOS** | Apple JS SDK | Nativer Face ID Dialog (sofort) |
| Android | oauth:// Protokoll | Chrome Custom Tabs |
| Web | Apple JS SDK | Browser-Dialog |

Der aktuelle Code verwendet `oauth://` fuer Apple auf iOS - das ist laut Despia-Docs **falsch**. iOS soll das Apple JS SDK nutzen, das einen nativen Face ID Dialog zeigt. Die oauth:// Methode ist nur fuer Android gedacht.

## Loesung

### Teil 1: Google auf iOS reparieren (auth-start + NativeCallback)

**auth-start Edge Function**: `response_type=token` explizit hinzufuegen, damit Supabase den Implicit Flow verwendet:

```
// VORHER:
const oauthUrl = `${supabaseUrl}/auth/v1/authorize?provider=${provider}&redirect_to=...&scopes=...&flow_type=implicit`;

// NACHHER:
const oauthUrl = `${supabaseUrl}/auth/v1/authorize?provider=${provider}&redirect_to=...&scopes=...&flow_type=implicit&response_type=token`;
```

**NativeCallback**: Zusaetzlich `code` Parameter abfangen (PKCE Fallback), und bessere Debug-Logs:

```typescript
// Auch code-Parameter pruefen (falls PKCE statt Implicit)
const code = hashParams.get('code') 
  || queryParams.get('code');

if (!accessToken && code) {
  // PKCE Flow: code gegen Tokens tauschen
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  // ...
}
```

### Teil 2: Apple auf iOS - Apple JS SDK implementieren

Dies ist eine groessere Aenderung, die mehrere Komponenten umfasst:

1. **Apple JS SDK in index.html laden**
2. **Neue Datei `src/lib/apple-auth.ts`** - Plattform-Erkennung und Apple JS SDK Integration
3. **Neue Edge Function `auth-apple-callback`** - Verifiziert Apple id_token und erstellt Supabase Session
4. **Auth.tsx handleAppleAuth** - iOS: Apple JS SDK nutzen, Android: weiterhin oauth://
5. **Apple Developer Console** - Service ID mit Return URLs konfigurieren (muss der User machen)

### Aenderungsuebersicht

| Datei | Aenderung |
|-------|-----------|
| `supabase/functions/auth-start/index.ts` | `response_type=token` zum OAuth URL hinzufuegen |
| `src/pages/NativeCallback.tsx` | PKCE code-Parameter als Fallback, bessere Logs |
| `index.html` | Apple JS SDK Script-Tag hinzufuegen |
| `src/lib/apple-auth.ts` | Neue Datei: Apple Auth mit Plattform-Erkennung |
| `supabase/functions/auth-apple-callback/index.ts` | Neue Edge Function: Apple Token Verifikation |
| `src/pages/Auth.tsx` | handleAppleAuth: iOS -> Apple JS SDK, Android -> oauth:// |

### Voraussetzung: Apple Developer Console (User-Aktion)

Fuer Apple Sign In auf iOS muss der User folgendes in der Apple Developer Console konfigurieren:

- **Service ID** erstellen mit Sign In with Apple
- **Domains registrieren**: `app.ditax.ch` und `gqbhilftduwxjszznnzy.supabase.co`
- **Return URLs**: `https://gqbhilftduwxjszznnzy.supabase.co/functions/v1/auth-apple-callback`
- **Sign In Key** erstellen (.p8 Datei)
- **Edge Function Secrets**: APPLE_CLIENT_ID, APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY

### Empfohlene Reihenfolge

1. **Sofort umsetzbar** (ohne User-Aktion): Google Fix (auth-start + NativeCallback)
2. **Braucht User-Setup**: Apple JS SDK (Apple Developer Console Konfiguration)

Soll ich mit Teil 1 (Google Fix) starten und Apple erst danach angehen, sobald die Developer Console konfiguriert ist?
