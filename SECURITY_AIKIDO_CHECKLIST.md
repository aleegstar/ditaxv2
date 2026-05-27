# Aikido-Pentest Vorbereitung — Manuelle Checkliste

Diese Schritte können nicht über Migrationen automatisiert werden. Bitte vor dem Start des Aikido-Scans erledigen.

> Supabase Projekt-Ref: `gqbhilftduwxjszznnzy`

## 1. Supabase Auth Hardening

- [ ] **Leaked Password Protection aktivieren**
  Auth → Policies → "Password strength" → Toggle „Block leaked passwords" einschalten.
  Direkt: <https://supabase.com/dashboard/project/gqbhilftduwxjszznnzy/auth/policies>
- [ ] **MFA-Optionen prüfen** (TOTP + WebAuthn aktiv)
  <https://supabase.com/dashboard/project/gqbhilftduwxjszznnzy/auth/providers>
- [ ] **PostgreSQL-Version** auf neueste verfügbare Patch-Version updaten.
  <https://supabase.com/dashboard/project/gqbhilftduwxjszznnzy/settings/infrastructure>

## 2. Storage

- [ ] **Public Buckets prüfen**: Keine `SELECT`-Policy mit `bucket_id = '*'` ohne Pfad-Constraint.
  <https://supabase.com/dashboard/project/gqbhilftduwxjszznnzy/storage/buckets>
  Erwartet: pfadbasierte Policies (`auth.uid()::text = (storage.foldername(name))[1]`).

## 3. Secrets Rotation (vor dem Scan)

- [ ] **Stripe Secret Key** rotieren (Live + Test) → in Lovable Secrets aktualisieren.
- [ ] **Stripe Webhook Secret** rotieren → in Lovable Secrets aktualisieren.
- [ ] **Resend API Key** rotieren → in Lovable Secrets aktualisieren.
- [ ] **Vertex AI / Google Service Account** prüfen (kein expired key).

## 4. DNS / E-Mail-Reputation (`ditax.ch`)

- [ ] **SPF**: `v=spf1 include:_spf.resend.com -all`
- [ ] **DKIM**: Resend-Selector-Record verifiziert (Dashboard → Domains).
- [ ] **DMARC**: `v=DMARC1; p=quarantine; rua=mailto:dmarc@ditax.ch; pct=100; adkim=s; aspf=s`
  (Nach 2-4 Wochen Monitoring auf `p=reject` heben.)
- [ ] **CAA**-Record (`letsencrypt.org`, `digicert.com` o.ä.).
- [ ] **DNSSEC** aktiviert.

## 5. Cloudflare (Domain `app.ditax.ch`)

- [ ] **Security Headers Worker** an Route `app.ditax.ch/*` gemountet
  (`cloudflare/security-headers-worker.js`).
- [ ] **TLS Minimum** = 1.2, idealerweise 1.3.
- [ ] **WAF** OWASP Core Ruleset = `On`.
- [ ] **Rate-Limiting** auf `/functions/v1/*` (z.B. 60 req/min/IP).
- [ ] **Bot Fight Mode** aktiv.

## 6. Aikido Connector

- [ ] **Workspace → Connectors → Aikido** verbinden.
- [ ] Nach Connect: Erster Scan startet automatisch.
- [ ] Findings im Project → Security Tab triagieren
  (echte Bugs fixen, dokumentierte False Positives mit `manage_security_finding → ignore`).

## 7. PostgreSQL-Extensions

- [ ] **Extension in Public** Warnung: `pg_net` / `pg_cron` ggf. ins `extensions` Schema migrieren.
  <https://supabase.com/dashboard/project/gqbhilftduwxjszznnzy/database/extensions>

## 8. Edge Functions Sanity-Check

Nach Migration `lock_down_anon_and_admin_functions`:

- [ ] App-Login funktioniert (Auth-Flow nutzt nur `auth.*`, nicht GraphQL).
- [ ] Dashboard zeigt eigene Daten (RLS-Policies greifen für `authenticated`).
- [ ] Stripe-Checkout läuft (`create-payment` / `create-payment-intent`).
- [ ] Passkey-Login funktioniert (Edge Functions nutzen `service_role`).
- [ ] Newsletter-Unsubscribe-Link funktioniert (HMAC-Token-Verify).
