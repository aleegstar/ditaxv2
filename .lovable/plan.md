# Aikido Pentest – Vorbereitung Ditax

Status nach erstem Durchlauf (27.05.2026).

---

## ✅ Phase 1 – Quick Wins (erledigt)
- CSP gehärtet (`index.html`): `unsafe-eval` raus, `api.openai.com` raus, `report-uri` ergänzt.
- Dependency-Scan: keine High/Critical.
- Hardcoded-Secrets-Scan: keine `sk_live`/`re_live` im Repo.
- `newsletter-unsubscribe`: `escapeHtml()` Helper + XSS-Hardening.

## ✅ Phase 2 – Mail-Härtung (Code erledigt, DNS manuell)
- `newsletter-track-click`: HMAC-Signatur + Redirect-Whitelist verifiziert.
- `newsletter-unsubscribe`: HMAC-Signatur + Output-Escape.
- DNS (SPF/DKIM/DMARC) → siehe `SECURITY_AIKIDO_CHECKLIST.md`.

## ✅ Phase 3 – Stripe-Härtung (Code erledigt)
- `create-payment`: serverseitiger Mindestpreis-Floor (CHF 150 / 250 inkl. Express) ausserhalb der Aktionswoche.
- `create-payment-intent`: identischer Floor + Promo-Code-Discount serverseitig.
- Webhook (`stripe-webhook`): nutzt `constructEventAsync`, Idempotenz via `claim_stripe_event()`.
- Stripe Secret Key Rotation → manuell vor Aikido-Scan.

## ✅ Phase 4 – Supabase RLS & Edge Function Audit
- **`verify_jwt = false` bleibt** für 17 Functions: alle validieren in-code (`getClaims`/`getUser`). Konform mit Signing-Keys-System.
- **Migration `lock_down_anon_and_admin_functions`**: `REVOKE ALL ... FROM anon` auf alle Tabellen + Funktionen + Default Privileges. 18 Admin-only SECURITY-DEFINER-Funktionen für `authenticated` gesperrt.
- Linter-Warnungen reduziert von 257 → 206 (verbleibende = `authenticated` GraphQL-Exposure, schützt durch RLS, akzeptiert + dokumentiert).
- Service-Role-Key: nirgends im Frontend (grep).

## ⏳ Phase 5 – Aikido-spezifisch
- Aikido-Connector im Workspace verbinden.
- Erster Scan triagieren, False Positives via `manage_security_finding` ignorieren mit Begründung.
- Security-Memory aktualisieren (`security--update_memory`).

## 📋 Manuelle Schritte
Siehe `SECURITY_AIKIDO_CHECKLIST.md` (Leaked-Password-Schutz, DNS, Cloudflare WAF/Headers/Rate-Limit, pg-Extensions, Secrets-Rotation).

## Out of Scope
- Manueller Pentest (Business-Logic).
- KMS-Migration (siehe `SECURITY_IMPLEMENTATION.md`).
- ClamAV.
- Eigene verschlüsselte Backups.

## Akzeptierte Warnungen
- `0027 Authenticated GraphQL Exposure` (~180): Tabellen sind für `authenticated` per `GRANT SELECT` zugänglich, aber durch RLS auf eigene Rows beschränkt. GraphQL-Schema-Discovery ohne Datenleak ist akzeptiert.
- `0029 SECURITY DEFINER Executable`: verbleibende Funktionen (z.B. `has_role`, `validate_user_session`, Trigger) sind absichtlich für `authenticated` ausführbar.
