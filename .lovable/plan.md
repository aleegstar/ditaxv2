

## Fix: Apple Login auf iPhone - nur iOS-Erkennung aendern

### Problem

`NativeCallback.tsx` nutzt `isDespiaNative()` um zu entscheiden, ob ein Deeplink ausgeloest wird. Im System-Browser (ASWebAuthenticationSession) auf iOS gibt diese Funktion `false` zurueck, weil der Safari User-Agent kein "despia" enthaelt. Daher werden die Tokens nie an den WebView uebergeben.

### Loesung (Android-sicher)

Statt `isDespiaNative()` wird `!!pathScheme` verwendet. Dies aendert das Verhalten nur basierend auf der URL-Struktur:

- `/native-callback/ditax/` → nativer Flow (Deeplink ausloesen)
- `/native-callback/` ohne Scheme → Web-Flow (navigate)

**Android-Auswirkung:** Minimal. Android-Flows nutzen bereits `/native-callback/ditax/` und der Deeplink `ditax://oauth/auth?tokens` ist in `assetlinks.json` registriert. Falls Android bisher zufaellig ueber den `navigate('/')` Branch funktionierte (weil Cookies geteilt werden), wuerde es jetzt den Deeplink-Branch nutzen - was zuverlaessiger ist, da Tokens explizit uebergeben werden.

### Aenderung

**Datei: `src/pages/NativeCallback.tsx`**

Eine Zeile aendern (ca. Zeile 121):

**Vorher:**
```text
const inDespiaNative = isDespiaNative();
if (inDespiaNative) {
```

**Nachher:**
```text
// If deeplinkScheme came from URL path, this is a native OAuth flow.
// Don't use isDespiaNative() - system browsers (ASWebAuthenticationSession,
// Chrome Custom Tabs) don't have Despia's user agent.
const isNativeOAuthFlow = !!pathScheme;
if (isNativeOAuthFlow) {
```

Der restliche Code (Deeplink-Aufbau, Fallback-Timeout, else-Branch) bleibt identisch. Nur die Bedingung aendert sich.

### Betroffene Dateien
- `src/pages/NativeCallback.tsx` - 1 Bedingung aendern (Zeile ~121)

