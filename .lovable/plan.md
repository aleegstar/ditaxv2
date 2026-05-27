# Aikido AI Pentest – Vorbereitung Ditax

Strukturierter Maßnahmenplan, priorisiert nach **Kritisch → Empfohlen → Optional**. Jeder Punkt erklärt **was**, **warum**, und **Risiko**.

---

## Empfehlung vorab: Staging-Strategie

Ein voll separater Stack (`staging.ditax.ch` + eigene Supabase + eigener Stripe-Account + eigene Resend-Domain) wäre der Goldstandard – ist aber für einen einmaligen automatisierten Scan **überdimensioniert** und mehrere Tage Setup.

**Pragmatische Empfehlung:** Production-Hardening mit klarer Test-Markierung. Aikido scannt primär Surface/SAST – das braucht kein laufendes Live-Frontend, nur eine erreichbare URL und das Repo. Echte Side-Effects (Charges/Mails) verhindern wir per Feature-Flag + Key-Rotation **temporär** während des Scan-Fensters.

Falls du echtes Staging willst: separater Plan-Schritt, ~1–2 Tage Aufwand.

---

## 🔴 KRITISCH (vor Scan-Start zwingend)

### K1. Stripe in Test-Mode für Scan-Fenster
- Secrets `STRIPE_SECRET_KEY` und `STRIPE_WEBHOOK_SECRET` temporär auf Test-Keys (`sk_test_…`) umstellen via Lovable Secrets.
- Frontend: kein `pk_live` im Code (prüfen mit `rg "pk_live|pk_test"`).
- Webhook-Endpoint in Stripe-Test-Dashboard mit neuem Test-Secret registrieren.
- **Warum:** Verhindert echte Charges/Rechnungen falls Scanner Checkout-Flow triggert.
- **Risiko:** Echte Kunden können während des Fensters nicht zahlen → Scan-Fenster eng halten (z.B. 2h Nachts) und vorher kommunizieren.

### K2. Resend / Mail-Versand abklemmen
- Option A: Secret `RESEND_API_KEY` temporär durch Test-Key ersetzen (Resend Test-Mode liefert nicht aus).
- Option B (sicherer): Feature-Flag in allen Mail-Edge-Functions (`send-newsletter`, `missing-items-notification`, `new-message-notification`, `unread-message-notifications`, `missing-items-reminder`, `cleanup-*`): wenn `PENTEST_MODE=true` → early return mit Log.
- Auth-Mails (Supabase Auth) im Dashboard temporär auf „Confirm email"=off oder Rate-Limit auf 1/h.
- **Warum:** AI-Scanner triggert oft Signup/Password-Reset hunderte Male.
- **Risiko:** Kunden bekommen während Fenster keine Mails (Tickets, Notifications, Newsletter). Cron-Jobs (`setup-email-cron`) pausieren.

### K3. Auth Rate-Limits härten
- Supabase Auth Settings: Rate-Limits auf Signup, OTP, Password-Reset auf restriktive Werte.
- Direkt: https://supabase.com/dashboard/project/gqbhilftduwxjszznnzy/auth/rate-limits
- **Warum:** Verhindert dass Scanner User-DB / Mail-Quota sprengt.

### K4. Backup vor Scan
- Supabase DB-Backup auslösen (Dashboard → Database → Backups).
- Storage: kein Backup-Tool nativ, aber `scan-prior-year-vertex`/Tax-Docs sind verschlüsselt → low risk.
- Secrets-Snapshot: Werte der relevanten Secrets dokumentiert ablegen (Pre-Rotation), damit Re-Rotation nach Scan klar ist.
- **Warum:** Restore-Path falls Scanner destruktiv testet (DELETE-Endpoints).

### K5. Cloudflare: Aikido-IPs nicht blocken
- Aikido Scan-IPs in Cloudflare WAF auf **Allow** (IP-Allowlist Rule mit höchster Priorität).
- Bot Fight Mode für Scan-Fenster auf „Off" oder Allowlist für Aikido-User-Agent.
- Rate-Limit-Rules: Aikido-IPs ausnehmen.
- **Warum:** Sonst sieht Scanner nur Cloudflare-Challenges, keine echten App-Findings.
- **Risiko:** Während Fenster sind Bots auf der App – Scan-Fenster eng halten.

---

## 🟡 EMPFOHLEN (sollte vor Scan stehen)

### E1. Pentest-Daten-Markierung
- Convention: alle vom Scanner erzeugten Records bekommen Prefix `aikido_test_` (E-Mail, Namen, Tax-Filer-Bezeichnungen).
- Wo Scanner eigene Werte setzen kann: Signup-Form, Profile-Update, Ticket-Erstellung.
- Cleanup-SQL vorbereiten (siehe E5).
- **Warum:** Saubere Trennung Test ↔ echte Kunden, einfaches späteres Löschen.

### E2. Supabase Public-Tables & RLS Audit
- Bereits in Phase 4 erledigt (siehe `.lovable/plan.md`): anon hat null Zugriff, 18 Admin-Funktionen für authenticated revoked.
- Zusätzlich: `supabase--linter` direkt vor Scan nochmal laufen lassen, neue Findings dokumentieren.
- `verify_jwt=false` Functions – Liste der 17 Functions + Begründung in `SECURITY_AIKIDO_CHECKLIST.md` ergänzen (aktuell nur „validiert in-code").

### E3. Storage Buckets prüfen
- Alle Buckets durchgehen: ist `public=true` gesetzt? Wenn ja: prüfen ob Pfad-Policies greifen.
- Buckets: `tax-documents`, `chat-attachments`, `signatures`, `cover-letters`, `prior-year-uploads`, `newsletter-assets` (Liste verifizieren).
- Direkt: https://supabase.com/dashboard/project/gqbhilftduwxjszznnzy/storage/buckets

### E4. Cloudflare Security Headers + TLS
- TLS-Mode = Full (Strict) prüfen.
- Security Headers Worker (`cloudflare/security-headers-worker.js`) auf `app.ditax.ch/*` und Preview-Domain gemountet?
- HSTS, X-Content-Type-Options, Referrer-Policy aktiv.

### E5. Cleanup-Strategie nach Scan
- SQL-Skript vorbereiten:
  ```sql
  -- Beispiel, nicht ausführen ohne Review
  DELETE FROM auth.users WHERE email LIKE 'aikido_test_%' OR email LIKE '%pentest%';
  -- Cascade über profiles, tax_filers, tax_returns, etc.
  ```
- Stripe-Test-Customers via Dashboard löschen (Test-Mode-Daten sowieso separat).
- Edge-Function-Logs ab Scan-Start zur Review archivieren.

---

## 🟢 OPTIONAL (Nice-to-have)

### O1. Vollständiges Staging (`staging.ditax.ch`)
Eigener Subdomain + Supabase-Projekt + Stripe-Test-Konto + Resend-Test-Domain. ~1–2 Tage. Empfohlen nur falls regelmäßige Pentests geplant.

### O2. Feature-Flag `PENTEST_MODE` ins Repo
- Globales Secret `PENTEST_MODE=true|false`.
- In allen Side-Effect-Functions (Stripe, Mail, externe APIs) Early-Return wenn aktiv.
- Vorteil: ein Toggle statt mehrerer Key-Rotationen.

### O3. SIEM-Logging während Scan
- Edge-Function-Logs in externes Tool streamen (z.B. Logflare) damit Scan-Aktivität auditierbar.

---

## Ablauf (Vorschlag Scan-Fenster)

```text
T-7d   E2/E3 Audit + Cleanup-SQL vorbereiten
T-1d   K4 Backup, E1 Prefix-Convention dokumentieren
T-0    K1 Stripe-Test-Keys, K2 Mail-Flag, K3 Rate-Limits, K5 CF Allowlist
       → Aikido Scan starten
T+Xh   Scan fertig
T+1h   Keys/Flags zurückdrehen, CF-Rules zurück, Cleanup-SQL ausführen
T+1d   Findings triagieren (security--manage_security_finding)
```

---

## Technische Details (für Devs)

- **Stripe-Keys betroffen:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (Lovable Secrets); Frontend nutzt `VITE_*` falls vorhanden – prüfen.
- **Mail-Functions:** `send-newsletter`, `send-newsletter-test`, `missing-items-notification`, `missing-items-reminder`, `new-message-notification`, `unread-message-notifications`, `cleanup-inactive-users`, `cleanup-unverified-registrations`, `marketing-automation`.
- **Cron-Jobs pausieren:** `setup-email-cron` zugehörige `pg_cron`-Jobs via `SELECT cron.unschedule('jobname')`.
- **Aikido-IPs:** aus Aikido-Dashboard kopieren, in Cloudflare → Security → WAF → Tools → IP Access Rules.
- **Feature-Flag-Pattern:**
  ```ts
  if (Deno.env.get('PENTEST_MODE') === 'true') {
    console.log('[PENTEST_MODE] skipping side effect:', { fn: 'send-newsletter' });
    return new Response(JSON.stringify({ skipped: true }), { status: 200, headers: corsHeaders });
  }
  ```
- **Cleanup-Cascade:** profiles → tax_filers → tax_returns → form_data → documents → chat_messages → tickets. RLS-Bypass via `service_role` in Edge-Function `cleanup-pentest-data` (neu).

---

## Was ich auf Approval umsetzen würde

1. `PENTEST_MODE`-Flag in alle 9 Mail-Functions + `create-payment` / `create-payment-intent` einbauen.
2. Edge-Function `cleanup-pentest-data` (admin-only) für Prefix-basiertes Löschen.
3. `SECURITY_AIKIDO_CHECKLIST.md` um Scan-Fenster-Runbook erweitern (T-7d…T+1d).
4. Liste der 17 `verify_jwt=false` Functions mit Begründung in Checkliste ergänzen.
5. Cleanup-SQL-Template als `supabase/migrations/_PENTEST_CLEANUP_TEMPLATE.sql` (nicht auto-applied).

Nicht im Scope dieses Plans: echtes Staging-Setup, KMS-Migration, ClamAV.

---

## ✅ Pentest-Vorbereitung (umgesetzt)
- `supabase/functions/_shared/pentest-guard.ts` – `isPentestMode()` + `pentestSkipResponse()`.
- Guard eingebaut in 9 Side-Effect-Functions: `send-newsletter*`, `new-message-notification`, `missing-items-reminder`, `missing-items-notification`, `unread-message-notifications`, `marketing-automation`, `create-payment`, `create-payment-intent`.
- Edge Function `cleanup-pentest-data` (admin-only, JWT + `has_role`-Check) – löscht User mit Prefix `aikido_test_` oder Substring `pentest` via Auth-Admin-API.
- `PENTEST_CLEANUP_TEMPLATE.sql` (Root, NICHT in migrations/) – Audit + manueller Fallback.
- `SECURITY_AIKIDO_CHECKLIST.md` erweitert: §9 Scan-Runbook (T-7d…T+1d), §10 `verify_jwt=false`-Tabelle mit Begründungen.
- **Aktivierung:** Secret `PENTEST_MODE=true` setzen vor Scan, danach löschen.
