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

---

## 9. Aikido Scan-Fenster Runbook

### T-7 Tage
- [ ] `supabase--linter` laufen lassen, Findings dokumentieren.
- [ ] Storage-Buckets durchgehen (s. §2).
- [ ] `PENTEST_CLEANUP_TEMPLATE.sql` reviewen und Cascade-Pfade verifizieren.

### T-1 Tag
- [ ] DB-Backup auslösen.
- [ ] Secrets-Snapshot (Werte sicher dokumentieren für Re-Rotation).
- [ ] Pentest-Daten-Prefix kommunizieren: `aikido_test_*` für E-Mails/Namen.

### T-0 (Scan-Start)
- [ ] Secret `PENTEST_MODE=true` setzen → killswitch für alle Mail- und Stripe-Side-Effects.
  Edge Functions mit Guard: `send-newsletter`, `send-newsletter-test`, `new-message-notification`,
  `missing-items-reminder`, `missing-items-notification`, `unread-message-notifications`,
  `marketing-automation`, `create-payment`, `create-payment-intent`.
- [ ] Stripe-Secrets temporär auf Test-Keys (`sk_test_…`, neuer `whsec_…` für Test-Webhook).
- [ ] Supabase Auth Rate-Limits restriktiv setzen (Signup/OTP/Reset).
- [ ] Cloudflare WAF: Aikido-IPs Allowlist (höchste Priorität), Bot Fight Mode aus, Rate-Limits ausnehmen.
- [ ] Pg-Cron-Mail-Jobs pausieren: `SELECT cron.unschedule('jobname')` für Newsletter/Reminder-Jobs.
- [ ] Aikido-Scan starten.

### T+0 nach Scan
- [ ] `PENTEST_MODE=false` setzen (oder Secret löschen).
- [ ] Stripe-Live-Keys zurück, Live-Webhook reaktivieren.
- [ ] Cloudflare-Rules zurücksetzen.
- [ ] Cron-Jobs reaktivieren (`cron.schedule(...)`).
- [ ] Cleanup: `POST /functions/v1/cleanup-pentest-data` (Admin-JWT, optional `{"dry_run":true}` zuerst).
- [ ] Edge-Function-Logs ab Scan-Start archivieren.

### T+1 Tag
- [ ] Findings triagieren mit `security--manage_security_finding`.
- [ ] `@security-memory` und `.lovable/plan.md` aktualisieren.

---

## 10. `verify_jwt = false` Functions – Begründungen

Alle 17 Functions deployen ohne automatische JWT-Verifikation, validieren aber **in-code**.
Konform mit Supabase Signing-Keys-System.

| Function | Auth-Mechanismus |
|---|---|
| `stripe-webhook` | Stripe-Signature via `constructEventAsync` |
| `newsletter-track-click` | HMAC-Token im Query-String |
| `newsletter-unsubscribe` | HMAC-Token im Query-String |
| `csp-report` | Public Browser-Endpoint (keine sensitiven Daten) |
| `passkey-challenge` | Public Initial-Step (WebAuthn-Standard) |
| `passkey-authenticate` | WebAuthn-Signatur-Verifikation in-code |
| `auth-apple-callback` | Apple-Signed JWT, in-code verifiziert |
| `auth-ios-bridge` | Code-Exchange, kein User-State |
| `auth-start` | Public OAuth-Init |
| `payment-redirect` | Public Stripe-Return-URL (read-only) |
| `unread-message-notifications` | `CRON_SECRET` Bearer |
| `missing-items-reminder` | `CRON_SECRET` Bearer |
| `cleanup-inactive-users` | `CRON_SECRET` Bearer |
| `cleanup-unverified-registrations` | `CRON_SECRET` Bearer |
| `cleanup-signed-tax-year-documents` | `CRON_SECRET` Bearer |
| `setup-email-cron` | `CRON_SECRET` Bearer |

---

## 11. Scan-Tag Aktivierungs-Checkliste (2-Minuten-Runbook)

**Vor dem Scan:**

1. [ ] Secret `PENTEST_MODE=true` setzen
       → deaktiviert Stripe-Charges, Mails **und alle 4 Vertex-AI-OCR-Functions** (Stub-Response).
       Functions mit Guard: `create-payment`, `create-payment-intent`,
       `send-newsletter*`, `*-notification`, `missing-items-reminder`,
       `marketing-automation`, **`ocr-extract`, `extract-lohnausweis`,
       `scan-prior-year`, `scan-prior-year-vertex`**.
2. [ ] `STRIPE_SECRET_KEY` → `sk_test_*` (aus Stripe Test-Dashboard kopieren)
3. [ ] `STRIPE_WEBHOOK_SECRET` → Test-Mode-Webhook-Secret
4. [ ] Im Stripe-Dashboard: Webhook-Endpoint im **Test-Mode** auf
       `https://gqbhilftduwxjszznnzy.supabase.co/functions/v1/stripe-webhook`
       registrieren (Events `payment_intent.succeeded`, `checkout.session.completed`).
5. [ ] Edge Function aufrufen (als Admin):
       `POST /functions/v1/seed-aikido-users` → 6 Credentials für Aikido kopieren.
6. [ ] Cloudflare: Aikido-IPs in WAF auf **Allow** (höchste Priorität),
       Bot Fight Mode **Off**.

**Nach dem Scan:**

7. [ ] `POST /functions/v1/cleanup-pentest-data` (löscht alle `aikido_*@ditax.test`).
8. [ ] `STRIPE_SECRET_KEY` und `STRIPE_WEBHOOK_SECRET` zurück auf Live.
9. [ ] `PENTEST_MODE` Secret löschen (oder auf `false` setzen).
10. [ ] Cloudflare-Regeln wieder schärfen (Bot Fight Mode On).
11. [ ] Findings triagieren, Security-Memory aktualisieren.

## 12. Rollen-Mapping (Aikido ↔ Ditax)

Aikido spricht von Admin / Manager / Viewer. Unser Enum `public.app_role`
kennt nur `admin`, `moderator`, `user`. Mapping:

| Aikido-Rolle | Ditax-Rolle (`app_role`) | Bedeutung |
|--------------|--------------------------|-----------|
| Admin        | `admin`                  | Voller Admin-Zugriff (Dashboard, alle Tax Returns) |
| Manager      | `moderator`              | Erweiterte Lese-/Bearbeitungsrechte (kein Mod-Konzept im UI, daher faktisch wie `user`) |
| Viewer       | `user`                   | Standard-Endkunde mit RLS-Isolation auf eigene `tax_filer_id` |

**Mandanten-Isolation**: Ditax hat keinen klassischen Tenant — Isolation
erfolgt strikt über `auth.uid()` und `tax_filer_id`. Zwei Aikido-User
A/B simulieren zwei Mandanten; Cross-Tenant-Leak bedeutet hier:
User B sieht Daten von User A.


