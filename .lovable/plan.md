

# Apple Auth: Anpassungen gemaess Despia-Dokumentation

## Vergleich: Aktuell vs. Docs

| Aspekt | Aktuell (Code) | Despia Docs (Soll) | Problem |
|--------|---------------|-------------------|---------|
| Native Redirect | HTML-Seite mit `<meta http-equiv="refresh">` und JS | HTTP `302` direkt zum Deeplink | HTML kann auf iOS haengen bleiben, 302 ist zuverlaessiger |
| Fehlerbehandlung | HTML-Fehlerseite zurueckgeben | Redirect mit `?error=` Param (Deeplink oder Web-URL) | User bleibt im Browser bei Fehler statt zurueck zur App |
| User-Suche | Alle User listen, dann nach Email filtern | `createUser` zuerst, bei "already registered" dann suchen | Ineffizient bei vielen Usern, skaliert nicht |
| Supabase Client Import | `npm:@supabase/supabase-js@2.57.2` | `https://esm.sh/@supabase/supabase-js@2` | Funktioniert, aber esm.sh ist der empfohlene Weg |

## Aenderungen

### 1. `supabase/functions/auth-apple-callback/index.ts` - Hauptfix

**a) Native Redirect: HTML -> 302**

Vorher:
```typescript
// Returns full HTML page with meta refresh + JS
const html = `<!DOCTYPE html>...window.location.href = "${deeplink}"...`;
return new Response(html, { status: 200, headers: { 'Content-Type': 'text/html' } });
```

Nachher (gemaess Docs):
```typescript
// Clean 302 redirect - more reliable on iOS
return new Response(null, {
  status: 302,
  headers: { 'Location': `${deeplinkScheme}://oauth/auth?${params.toString()}` }
});
```

**b) Fehlerbehandlung: HTML-Seiten -> Redirects**

Eine `redirectWithError` Hilfsfunktion einfuehren (wie in den Docs):
- Native: Deeplink mit `?error=...` -> schliesst Browser, App zeigt Fehler
- Web: Redirect zu `/auth?error=...` -> Auth.tsx zeigt Toast

Vorher:
```typescript
function errorResponse(message: string) {
  const html = `<h1>Fehler</h1><p>${message}</p>`;
  return new Response(html, { status: 400 });
}
```

Nachher:
```typescript
function redirectWithError(appUrl: string, error: string, isNative: boolean, deeplinkScheme?: string): Response {
  const encoded = encodeURIComponent(error);
  if (isNative && deeplinkScheme) {
    return new Response(null, { status: 302, headers: { 'Location': `${deeplinkScheme}://oauth/auth?error=${encoded}` } });
  }
  return new Response(null, { status: 302, headers: { 'Location': `${appUrl}/auth?error=${encoded}` } });
}
```

**c) User-Erstellung: createUser-first Pattern**

Vorher:
```typescript
// Listen ALLE User, dann nach Email suchen
const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
const existingUser = existingUsers?.users?.find(u => u.email === email);
```

Nachher (gemaess Docs):
```typescript
// Versuche zuerst zu erstellen
const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
  email: userEmail, email_confirm: true, user_metadata: { ... }
});

if (createError?.message?.includes('already been registered')) {
  // Nur dann suchen
  const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
  // ...
}
```

**d) Supabase Client Import**

```typescript
// Vorher
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

// Nachher (gemaess Docs)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
```

### 2. Keine Aenderungen noetig

| Datei | Status |
|-------|--------|
| `src/lib/apple-auth.ts` | Korrekt - hardcoded IDs sind OK fuer Lovable (kein VITE_ Support) |
| `src/pages/Auth.tsx` | Korrekt - iOS nutzt `getAppleOAuthUrl` + `despia()`, Android nutzt `auth-start` |
| `src/pages/AppleAuth.tsx` | Bleibt als Fallback bestehen |
| `auth-start/index.ts` | Nicht betroffen (wird nur fuer Google + Apple Android genutzt) |

## Zusammenfassung

Nur **eine Datei** wird geaendert: `supabase/functions/auth-apple-callback/index.ts`

Die Aenderungen machen den Code zuverlaessiger auf iOS (302 statt HTML), robuster bei Fehlern (Redirect statt HTML-Seite), und skalierbarer (createUser-first statt listUsers).

