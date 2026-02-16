

# Fix: Google iOS Login - Redirect erreicht auth-ios-bridge nicht

## Problem

Die Logs zeigen eindeutig:
- `auth-start` wird korrekt aufgerufen mit `platform: 'ios'`
- `redirect_to` wird korrekt auf `auth-ios-bridge` gesetzt
- **ABER: auth-ios-bridge hat NULL Logs** -- wird nie aufgerufen

Supabase prueft `redirect_to` gegen eine Allowlist (Authentication > URL Configuration > Redirect URLs). Wenn die URL nicht gelistet ist, wird auf die Site URL (`app.ditax.ch`) umgeleitet. Deshalb landet der User auf der vollen App-Seite im In-App-Browser statt auf der leichtgewichtigen Bridge.

## Loesung

### Schritt 1: Redirect URL in Supabase Dashboard hinzufuegen

Im Supabase Dashboard unter **Authentication > URL Configuration > Redirect URLs** muss folgende URL hinzugefuegt werden:

```
https://gqbhilftduwxjszznnzy.supabase.co/functions/v1/auth-ios-bridge**
```

Das `**` am Ende ist ein Wildcard-Pattern, das auch Query-Parameter wie `?scheme=ditax` abdeckt.

**Wichtig:** Das muss manuell im Supabase Dashboard gemacht werden -- das kann nicht per Code geaendert werden.

### Schritt 2: Google Cloud Console pruefen

In der Google Cloud Console muss die Supabase Callback URL als Authorized Redirect URI konfiguriert sein. Da die App `auth.ditax.ch` als Custom Auth Domain nutzt, muss dort stehen:

```
https://auth.ditax.ch/auth/v1/callback
```

Falls noch nicht vorhanden, auch:
```
https://gqbhilftduwxjszznnzy.supabase.co/auth/v1/callback
```

### Warum das Problem auftritt

```text
AKTUELLER FLOW (fehlerhaft):
1. auth-start gibt OAuth URL mit redirect_to=auth-ios-bridge
2. User authentifiziert bei Google
3. Google leitet zu Supabase callback
4. Supabase prueft redirect_to gegen Allowlist
5. auth-ios-bridge URL NICHT in Allowlist -> ABGELEHNT
6. Supabase nutzt Site URL Fallback: app.ditax.ch
7. ASWebAuthenticationSession laedt volle React SPA
8. User bleibt im In-App-Browser haengen (kein Deeplink)

NACH DEM FIX:
1-4. Gleich wie oben
5. auth-ios-bridge URL IN Allowlist -> AKZEPTIERT
6. Supabase leitet zu auth-ios-bridge#access_token=xxx
7. Minimale HTML-Seite liest Hash, setzt Deeplink
8. ditax://oauth/auth?tokens -> ASWebAuth schliesst sich -> App
```

### Code-Aenderungen

**Keine Code-Aenderungen noetig.** Der Code ist korrekt, nur die Supabase-Konfiguration fehlt.

### Anleitung

1. Oeffne das Supabase Dashboard: https://supabase.com/dashboard/project/gqbhilftduwxjszznnzy/auth/url-configuration
2. Unter "Redirect URLs" klicke "Add URL"
3. Fuege ein: `https://gqbhilftduwxjszznnzy.supabase.co/functions/v1/auth-ios-bridge**`
4. Speichern
5. Nochmal auf iOS testen

