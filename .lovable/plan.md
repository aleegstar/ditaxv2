

# Fix: Apple Service ID korrigieren

## Problem

Die Apple Service ID ist falsch hinterlegt:
- **Aktuell im Code:** `com.ditax.web`
- **Korrekt (laut Apple Developer Console):** `ch.ditax.app.service`

Das verursacht den `invalid_client` Fehler beim Apple Login auf dem iPhone.

## Aenderungen

### 1. `src/lib/apple-auth.ts` - Client-seitige Apple ID

Zeile 14 aendern:
```
const APPLE_CLIENT_ID = 'ch.ditax.app.service';
```

### 2. `supabase/functions/auth-apple-callback/index.ts` - Fallback-Wert

Zeile 41 aendern: Den Fallback-Wert von `com.ditax.web` auf `ch.ditax.app.service` aktualisieren.

### 3. Supabase Secret `APPLE_CLIENT_ID` pruefen

Das Secret `APPLE_CLIENT_ID` existiert bereits. Falls es noch den alten Wert `com.ditax.web` enthaelt, muss es auf `ch.ditax.app.service` aktualisiert werden. Da Secret-Werte nicht einsehbar sind, wird es sicherheitshalber aktualisiert.

## Zusammenfassung

Zwei Code-Dateien und ein Secret werden aktualisiert. Alle drei muessen denselben Wert `ch.ditax.app.service` haben, damit Apple den OAuth-Request akzeptiert.

