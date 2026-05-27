
# Aikido Pentest – Vorbereitung Ditax

Ziel: Automatisierten Aikido-Scan (SAST + Surface) bestehen, ohne Critical/High Findings. Reihenfolge nach Risiko & Aufwand.

---

## Phase 1 – Quick Wins (sofort umsetzbar)

### 1.1 CSP härten (`index.html`)
- `'unsafe-eval'` aus `script-src` entfernen (steht im Widerspruch zur bestehenden Memory `csp-hardening`).
- `'unsafe-inline'` durch Nonce/Hash ersetzen wo möglich; falls Vite-Build es benötigt, mind. dokumentieren.
- `connect-src`: `https://api.openai.com` entfernen falls nicht mehr genutzt (Vertex AI ist Standard laut Memory).
- `report-uri /functions/v1/csp-report` ergänzen (Edge Function existiert bereits).

### 1.2 Cloudflare Security Headers Worker aktivieren
- Prüfen ob `cloudflare/security-headers-worker.js` an `app.ditax.ch` gemountet ist.
- HSTS (`max-age=31536000; includeSubDomains; preload`), `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, `COOP/CORP` serverseitig garantieren (Meta-Tag = nur Defense-in-Depth).
- TLS auf min. 1.2 (besser 1.3) im Cloudflare-Dashboard.
- CAA-Record + DNSSEC für `ditax.ch`.

### 1.3 Dependency-Scan
- `code--dependency_scan` ausführen, alle High/Critical fixen (außer dokumentierte `flatted`-Ausnahme).

---

## Phase 2 – Mail-Härtung

### 2.1 DNS / Reputation
- **SPF**: nur Resend autorisieren (`v=spf1 include:_spf.resend.com -all`).
- **DKIM**: Resend-Selector verifiziert.
- **DMARC**: `v=DMARC1; p=quarantine; rua=mailto:dmarc@ditax.ch; pct=100; adkim=s; aspf=s` → später auf `p=reject`.
- **MX/BIMI** optional.

### 2.2 Edge Functions
- Alle Mail-Funktionen auditieren: `send-newsletter`, `send-newsletter-test`, `unread-message-notifications`, `new-message-notification`, `missing-items-notification`, `missing-items-reminder`, `marketing-automation`, `newsletter-unsubscribe`, `newsletter-track-click`.
- **Rate-Limit** (per IP + per user) auf testbare Funktionen wie `send-newsletter-test`.
- **PII**: `console.log` mit E-Mail/Token entfernen oder maskieren.
- **`newsletter-track-click`**: Open-Redirect verhindern – nur Whitelist erlaubter Ziel-Domains.
- **`newsletter-unsubscribe`**: Token muss signiert (HMAC) + single-use + zeitlich begrenzt sein.
- Resend API-Key vor Pentest rotieren.

---

## Phase 3 – Stripe-Härtung

### 3.1 Webhook
- `stripe-webhook` nutzt bereits `constructEventAsync` ✓ – Signatur-Pfad mit ungültiger Signatur Unit-testen.
- Idempotenz auf Event-ID prüfen (kein Double-Processing).

### 3.2 Payment-Erstellung
- `create-payment` / `create-payment-intent`: Betrag **immer** serverseitig aus DB/Config (`promoWeek.ts`, `pricing-calculation-structure`) berechnen – nie aus Client-Body übernehmen.
- Promo-Codes (`validate-promo-code`, `apply-referral-code`, `admin-promo-codes`): Rate-Limit gegen Brute-Force, Logging von Versuchen.
- `payment-redirect`: nur Stripe-Domains als Redirect-Ziele zulassen.

### 3.3 Admin-Endpunkte
- `admin-promo-codes`, `admin-operations`, `get-stripe-revenue`, `get-invoices`: `has_role(auth.uid(),'admin')` server-validiert (nicht nur Frontend-Guard).
- Stripe Secret Key rotieren vor Test.

---

## Phase 4 – Supabase RLS & Edge Function Audit

### 4.1 Linter
- `supabase--linter` ausführen, alle Warn/Error beheben oder in Security-Memory mit Begründung dokumentieren.

### 4.2 `verify_jwt = false` Audit
17 Functions stehen aktuell auf `verify_jwt = false`. Jede einzeln klassifizieren:
- **Berechtigt öffentlich** (Webhooks, OAuth-Callbacks, Cron): `stripe-webhook`, `cleanup-inactive-users`, `csp-report`, `auth-start`, `auth-ios-bridge`, `auth-apple-callback`, `payment-redirect`, `newsletter-unsubscribe`, `newsletter-track-click`, `cleanup-unverified-registrations`, `cleanup-signed-tax-year-documents`.
- **Prüfen ob `verify_jwt = true` möglich**: `sign-tax-return`, `ocr-extract`, `ocr-model`, `docs-chatbot`, `extract-lohnausweis`.
- Bei öffentlichen Funktionen: Rate-Limit + Input-Validation (Zod) + Origin-Check verpflichtend.

### 4.3 RLS-Spotcheck (kritische Tabellen)
- `user_roles`, `tax_filers`, `documents`, `messages`, `payments`, `admin_access_logs`, `user_encryption_keys` – Policies manuell durchgehen.
- Storage-Buckets: pfadbasierte Policies (`auth.uid()::text = (storage.foldername(name))[1]`).
- Service-Role-Key nirgends im Frontend (grep).

### 4.4 Auth-Hardening
- Leaked-Password-Schutz in Supabase Dashboard aktiv (Memory `platform-configuration-constraints`).
- MFA-Optionen geprüft.
- Session-Timeout (20min) testen.

---

## Phase 5 – Aikido-spezifische Vorbereitung

- Aikido-Connector im Workspace verbinden (UI), Scan starten.
- Erste Findings triagieren: echte Bugs fixen, False Positives via `manage_security_finding` → `ignore` mit Begründung, `update_memory` aktualisieren.
- Secrets-Scan: Repository auf hartcodierte Keys grep (`AKIA`, `sk_live`, `re_live`, `eyJ` außer publishable anon key).

---

## Ausführungsreihenfolge (heute)

```text
1. Dependency-Scan + CSP-Fix + Cloudflare-Headers-Check  (Phase 1)
2. DMARC/SPF/DKIM verifizieren + Edge-Function-Audit Mail (Phase 2)
3. Stripe-Server-Preisenforcement + Webhook-Test          (Phase 3)
4. verify_jwt-Audit + supabase--linter                    (Phase 4)
5. Aikido-Scan starten, Findings durchgehen               (Phase 5)
```

## Out of Scope (separat)
- Manueller Pentest (Business-Logic, Auth-Flows tief)
- KMS-Migration (siehe `SECURITY_IMPLEMENTATION.md`)
- Malware-Scanning ClamAV
- Eigene verschlüsselte Backups

## Technische Details / Risiken
- CSP-Änderungen können Drittanbieter-Skripte brechen → vor Deploy in Preview testen.
- `verify_jwt = true` schaltet zuvor anonym aufrufbare Functions ab – Frontend-Aufrufer prüfen.
- DMARC `p=reject` erst nach 2–4 Wochen `p=quarantine`-Monitoring.
- Stripe-Key-Rotation: Webhook-Secret separat, Live- vs Test-Mode unterscheiden.
