
# Fix: Zwei Probleme in auth-apple-callback

Die Despia-Doku und unsere Implementierung verglichen -- zwei Probleme gefunden:

## Problem 1: `Response.redirect()` funktioniert nicht mit Deeplinks

Zeile 213 verwendet `Response.redirect(redirectUrl, 302)` mit einer Deeplink-URL wie `ditax://oauth/auth?tokens`. HTTP-Redirects (`302`) funktionieren **nicht mit Custom URL Schemes** -- der Browser/Server weiss nicht, wie er `ditax://` aufloesen soll.

**Fix**: Statt `Response.redirect()` eine HTML-Seite zurueckgeben, die per `window.location.href` oder `<meta http-equiv="refresh">` zum Deeplink weiterleitet. Das ist der gleiche Ansatz wie in NativeCallback.tsx.

## Problem 2: `listUsers()` laedt ALLE User

Zeile 117 ruft `supabaseAdmin.auth.admin.listUsers()` ohne Filter auf. Das laedt **alle** User in den Speicher und sucht dann client-seitig per `.find()`. Bei vielen Usern:
- Performance-Problem (langsam, viel Speicher)
- Supabase paginiert standardmaessig auf 1000 -- User ab #1001 werden nie gefunden
- Edge Function koennte timeout bekommen

**Fix**: Stattdessen gezielt per Email suchen mit der `listUsers` API mit Filter-Parameter, oder direkt per REST API.

## Aenderungen

### `supabase/functions/auth-apple-callback/index.ts`

1. **Deeplink-Redirect**: `Response.redirect()` ersetzen durch HTML-Response mit JavaScript-Redirect:
```typescript
// Statt: return Response.redirect(redirectUrl, 302);
// Neu:
const html = `<html><head><meta http-equiv="refresh" content="0;url=${redirectUrl}"></head><body><script>window.location.href="${redirectUrl}";</script></body></html>`;
return new Response(html, {
  status: 200,
  headers: { 'Content-Type': 'text/html' },
});
```

2. **User-Lookup**: `listUsers()` ersetzen durch gefilterte Suche:
```typescript
// Statt: const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
// Neu: Direkt per REST API mit Email-Filter
const response = await fetch(
  `${supabaseUrl}/auth/v1/admin/users?filter=${encodeURIComponent(email)}`,
  { headers: { Authorization: `Bearer ${supabaseServiceKey}`, apikey: supabaseServiceKey } }
);
```

3. **redirectWithError()**: Gleiche HTML-Redirect-Aenderung auch fuer die Fehlerfaelle.

### Keine anderen Dateien betroffen

Die restliche Implementierung (auth-start PKCE, NativeCallback Code-Exchange, apple-auth.ts, Auth.tsx) ist korrekt und stimmt mit der Despia-Dokumentation ueberein.
