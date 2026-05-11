## Newsletter 401 – Auth-Prüfung in Edge Functions auf Signing-Keys umstellen

### Ursache
Sowohl `send-newsletter-test` als auch `send-newsletter` validieren die Anfrage mit:
```ts
const supabaseUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization } } });
const { data: { user } } = await supabaseUser.auth.getUser();
```
Mit dem neuen Supabase Signing-Keys-System ist die korrekte serverseitige JWT-Verifizierung `supabase.auth.getClaims(token)`. `getUser()` schlägt hier in vielen Projekten still fehl und liefert keinen User → Function antwortet **401 Unauthorized** an den Client, was im UI als „Edge Function returned a non-2xx status code" landet.

### Fix
Beide Edge Functions auf das empfohlene Muster umstellen:
1. `Authorization`-Header lesen, Bearer-Token extrahieren.
2. `supabase.auth.getClaims(token)` aufrufen → `userId = claims.sub` daraus ziehen.
3. Admin-Check (`user_roles` mit `role='admin'`) unverändert wie bisher, nur jetzt mit der korrekt validierten `userId`.
4. Alle Error-Responses inkl. CORS-Headers ausliefern (ist bereits so) und den genauen Resend-Fehler im Body durchreichen, damit das UI sinnvoll anzeigt.

### Betroffene Dateien
- `supabase/functions/send-newsletter-test/index.ts` – Auth-Block ersetzen.
- `supabase/functions/send-newsletter/index.ts` – Auth-Block ersetzen.

### Verifikation
- Nach Redeploy: im Admin → Newsletter eine Test-Mail abschicken. Erwartet: 200 + „Test-E-Mail versendet" Toast, oder bei Resend-Problem konkrete Fehlermeldung statt 401.
- Edge-Logs (`send-newsletter-test`, `send-newsletter`) zeigen jetzt POST 200 statt 401.
- Falls Resend selbst ablehnt (z. B. Domain nicht verifiziert), erscheint dies im Toast als detaillierte Meldung; dann wäre der nächste Schritt, den Absender (`noreply@ditax.ch`) auf eine verifizierte Adresse umzustellen – das ist aber ein separates Thema.

### Nicht Teil dieses Plans
- Keine Änderungen an `newsletter_campaigns`-Tabelle, RLS oder UI-Flow.
- Kein Wechsel weg von Resend; nur die Auth-Schicht der Functions wird modernisiert.
