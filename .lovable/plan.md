
# Fix: Google OAuth mit Supabase Custom Domain (auth.ditax.ch)

## Problem-Analyse

Der Fehler **"redirect_uri_mismatch"** (HTTP 400) tritt auf, weil:

1. **Supabase Custom Domain aktiviert:** `auth.ditax.ch` statt `gqbhilftduwxjszznnzy.supabase.co`
2. **Google Cloud Console:** Kennt nur die alte Redirect-URI
3. **OAuth Callback:** Google erwartet `https://gqbhilftduwxjszznnzy.supabase.co/auth/v1/callback` aber Supabase sendet jetzt `https://auth.ditax.ch/auth/v1/callback`

---

## Erforderliche Schritte (Keine Code-Aenderungen noetig!)

### Schritt 1: Google Cloud Console aktualisieren

Gehe zu: **https://console.cloud.google.com/apis/credentials**

1. Waehle dein Projekt aus
2. Klicke auf die **OAuth 2.0 Client-ID** (Web-Client)
3. Unter **Autorisierte Weiterleitungs-URIs**, fuege hinzu:

```
https://auth.ditax.ch/auth/v1/callback
```

4. Die alte URI kann bleiben (fuer Fallback):
```
https://gqbhilftduwxjszznnzy.supabase.co/auth/v1/callback
```

5. Speichern

### Schritt 2: Autorisierte JavaScript-Urspruenge pruefen

Stelle sicher, dass folgende Origins erlaubt sind:

```
https://app.ditax.ch
https://auth.ditax.ch
https://ditaxv2.lovable.app (optional fuer Preview)
```

---

## Zusammenfassung der Konfiguration

| Einstellung | Alter Wert | Neuer Wert |
|-------------|-----------|------------|
| Supabase Auth Domain | `gqbhilftduwxjszznnzy.supabase.co` | `auth.ditax.ch` |
| Google OAuth Callback | `https://gqbhilftduwxjszznnzy.supabase.co/auth/v1/callback` | `https://auth.ditax.ch/auth/v1/callback` |

---

## Keine Code-Aenderungen erforderlich

Der Supabase Client verwendet automatisch die konfigurierte Auth-Domain. Das Problem liegt ausschliesslich in der Google Cloud Console Konfiguration.

**Nach der Konfiguration:** Das Login sollte sofort funktionieren (keine Wartezeit fuer DNS-Propagation, da die Domain bereits aktiv ist).

---

## Checkliste

- [ ] Google Cloud Console oeffnen
- [ ] OAuth 2.0 Client-ID bearbeiten
- [ ] `https://auth.ditax.ch/auth/v1/callback` als Redirect URI hinzufuegen
- [ ] Speichern
- [ ] Google Login testen
