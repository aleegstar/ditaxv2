# Post-Pentest Cleanup & Wiederherstellung Live-Betrieb

Aikido-Scan ist abgeschlossen. Jetzt müssen wir den Schutzmodus deaktivieren, Testdaten entfernen und alle externen Integrationen zurück auf Live schalten.

## 1) PENTEST_MODE deaktivieren (kritisch — zuerst)

Solange `PENTEST_MODE=true` ist, blockt der Shared Guard alle Side-Effects (Stripe Charges, Resend Mails, Vertex AI, OCR, Newsletter). Live-Betrieb ist damit unmöglich.

- Supabase Edge Function Secrets → `PENTEST_MODE` auf `false` setzen (oder Secret löschen)
- Verifikation: kurzer Smoke-Call gegen `create-payment` (Testbetrag) → darf NICHT mehr `{ skipped: true }` zurückgeben

## 2) Aikido-Testdaten löschen

Cleanup über die dedizierte Edge Function statt manuellem SQL:

- Schritt A — **Dry-Run** zur Sichtkontrolle:
  `POST /functions/v1/cleanup-pentest-data` mit Body `{ "dry_run": true }`
  → liefert Liste aller `aikido_*@ditax.test` und `*pentest*` User
- Schritt B — Nach Bestätigung der Liste: gleicher Call ohne `dry_run`
  → löscht via `auth.admin.deleteUser` (cascadiert über FKs: `profiles`, `tax_filers`, `tax_returns`, `user_roles`, `user_consents`, …)
- Schritt C — Storage-Restbestände prüfen (Pfade beginnen mit den gelöschten user_ids in den Buckets `tax-documents`, `chat_attachments`, ggf. `avatars`)
- Schritt D — Audit-Query: `SELECT COUNT(*) FROM auth.users WHERE email ILIKE 'aikido_%' OR email ILIKE '%pentest%'` muss 0 sein

## 3) Stripe zurück auf Live

- Stripe Secrets in Supabase auf Live-Keys umstellen:
  - `STRIPE_SECRET_KEY` → `sk_live_…`
  - `STRIPE_WEBHOOK_SECRET` → Live-Webhook Signing Secret (aus dem Live-Endpoint im Stripe Dashboard)
- Test-Webhook-Endpoint im Stripe Dashboard deaktivieren/löschen, Live-Endpoint `/functions/v1/stripe-webhook` als aktiv bestätigen
- Smoke-Test: 1 echte Test-Zahlung über die App (kleiner Betrag) → Webhook trifft ein, `tax_returns.payment_status` aktualisiert

## 4) Weitere Infrastruktur re-aktivieren

Diese Punkte hatten wir vor dem Scan pausiert/gelockert:

- **Cloudflare WAF / Bot Fight Mode** wieder einschalten, Aikido-IP-Allowlist und Rate-Limit-Ausnahmen entfernen
- **pg_cron Mail-Jobs** wieder aktivieren (Newsletter, Missing-Items-Reminder, Unread-Message-Notifications, Marketing-Automation)
- **DB-Backup** vom Scan-Tag als „Pre-Pentest Snapshot" markieren/aufbewahren (Retention-Compliance)

## 5) Security-Memory & Doku updaten

- `@security-memory`: Pentest-Lauf mit Datum + Findings-Zusammenfassung dokumentieren
- `SECURITY_AIKIDO_CHECKLIST.md`: Cleanup-Sektion als „erledigt am 29.05.2026" markieren
- Bei Bedarf neue Findings aus Aikido als TODOs anlegen

## Reihenfolge & Verantwortung

```text
1. PENTEST_MODE=false           (Lovable/Supabase Secret)   ← MUSS zuerst
2. Cleanup dry_run → review     (Agent via curl)
3. Cleanup real run             (Agent via curl)
4. Stripe Live Keys + Webhook   (User in Supabase + Stripe Dashboard)
5. Cloudflare WAF + pg_cron     (User)
6. Smoke-Tests + Memory-Update  (Agent)
```

## Was ich für dich brauche, bevor wir starten

1. Bestätigung, dass ich `cleanup-pentest-data` (dry-run zuerst) aufrufen darf
2. Stripe-Umschaltung machst du selbst im Supabase Secrets Dashboard, oder soll ich dich via `update_secret`-Dialog für `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` führen?
3. `PENTEST_MODE` ebenfalls: selbst im Dashboard auf `false` setzen, oder via `update_secret`-Dialog?

Sobald du auf „Plan umsetzen" klickst, starte ich mit Schritt 1–3 und 6; Schritte 4–5 erfordern deinen Eingriff in den jeweiligen Provider-Konsolen.
