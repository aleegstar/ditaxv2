

# Fix: Apple OAuth Token-Übergabe auf iOS (Despia)

## Problem
Auf dem iPhone mit Despia wird nach erfolgreicher Apple-Anmeldung der Token nicht an die App übergeben. Der Benutzer bleibt auf der Anmeldeseite.

## Ursache
iOS verwendet **ASWebAuthenticationSession** für den OAuth-Browserflow. Dieser Browser läuft in einem **isolierten Prozess mit eigenem Speicher**. Das bedeutet:

1. Der Benutzer meldet sich erfolgreich bei Apple an
2. Supabase leitet zu `/native-callback/ditax/` weiter (mit Tokens)
3. `NativeCallback.tsx` speichert die Session im Browser-Speicher -- aber dieser gehört **nicht** zur App
4. Der Deeplink `ditax://oauth/auth?success=true` schliesst den Browser
5. Die App versucht die Session zu laden, findet aber **nichts** im eigenen Speicher

Auf Android funktioniert es zufällig, weil Chrome Custom Tabs den Speicher oft teilen.

## Lösung
Die Tokens direkt im Deeplink-URL mitgeben, damit `Auth.tsx` die Session **im eigenen WebView-Kontext** setzen kann.

## Technische Änderungen

### 1. `src/pages/NativeCallback.tsx`
- Statt nur `success=true` im Deeplink zu senden, die Tokens `access_token` und `refresh_token` mitgeben
- Format: `ditax://oauth/auth?access_token=xxx&refresh_token=xxx`
- Die Session muss nicht mehr in NativeCallback gesetzt werden (auf iOS bringt es nichts), aber wir behalten es als Fallback für Android

### 2. `src/pages/Auth.tsx`
- Bereits vorbereitet: Der "LEGACY"-Block (Zeile 120-140) verarbeitet Tokens aus URL-Parametern und ruft `setSession()` auf
- Keine Änderung nötig -- der bestehende Code erkennt `access_token` in den Query-Parametern und setzt die Session korrekt

### Zusammenfassung
Eine Änderung in einer Datei (`NativeCallback.tsx`): Tokens im Deeplink übergeben statt nur `success=true`. Der Rest der Infrastruktur ist bereits vorhanden.

