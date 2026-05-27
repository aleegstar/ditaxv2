## Aikido-Pentest-Vorbereitung

Ziel: keine echten Stripe-Charges, keine teuren Gemini/Vertex-Calls, keine echten Mails, klare Testidentitäten für Rollen- und Isolationstests.

---

### Status-Check (was bereits hart ist)

- `PENTEST_MODE`-Killswitch aktiv in 9 Mail-/Stripe-Functions (`create-payment`, `create-payment-intent`, alle `*-newsletter`, `*-notification`, `*-reminder`, `marketing-automation`).
- AI-Rate-Limits aktiv (`prior_year`: 5/Tag + 3 lifetime/Filer+Device; `lohnausweis`: 20/Tag; `ocr_extract`: 100/Tag) inkl. Device-ID-Härtung.
- RLS strikt auf `tax_filer_id` und `auth.uid()`.
- 48 inaktive Konten gelöscht, nur 3 aktive verbleibend.

### Lücken, die wir schliessen müssen

1. **`PENTEST_MODE` fehlt in den 4 AI-Functions** (`ocr-extract`, `extract-lohnausweis`, `scan-prior-year`, `scan-prior-year-vertex`). Selbst mit Rate-Limit kann der Scanner pro Testaccount 100 OCR-Calls × Anzahl Aikido-User auslösen → potenziell 1000+ Vertex-Calls/Tag.
2. **Stripe ist noch im Live-Mode.** Secret `STRIPE_SECRET_KEY` und Frontend-Publishable-Key müssen temporär auf `sk_test_*` / `pk_test_*` umgestellt werden. Webhook-Endpoint im Stripe-Dashboard zusätzlich auf Test-Mode-Endpoint registrieren.
3. **Aikido-Testaccounts fehlen.**
4. **Rollenmodell-Mismatch:** Aikido spricht von Admin/Manager/Viewer — unser Enum kennt nur `admin`, `moderator`, `user`. Wir mappen 1:1 (Admin=admin, Manager=moderator, Viewer=user) und dokumentieren das.

---

### Phase 1 — Kosten-Killswitch für AI (kritisch)

`PENTEST_MODE`-Guard in den vier Vertex-Functions einbauen. Bei aktivem Flag: sofortiger `200 OK` mit Stub-Antwort, **kein** Vertex-Aufruf, **kein** Rate-Limit-Verbrauch. Damit ist die monetäre Obergrenze während des Scans = 0 CHF für AI, unabhängig davon, wie oft Aikido die Endpoints triggert.

Betroffene Files:
- `supabase/functions/ocr-extract/index.ts`
- `supabase/functions/extract-lohnausweis/index.ts`
- `supabase/functions/scan-prior-year/index.ts`
- `supabase/functions/scan-prior-year-vertex/index.ts`

Stub-Antwort pro Endpoint: leeres Felder-Objekt + `pentest_mode: true` Marker, damit Frontend nicht crasht.

### Phase 2 — Stripe Test-Mode (kritisch)

Manueller Secret-Swap (kann nur der User in Lovable-Settings machen):
- `STRIPE_SECRET_KEY` → `sk_test_*` Wert aus Stripe-Dashboard
- `STRIPE_WEBHOOK_SECRET` → Test-Mode-Webhook-Secret
- Frontend-Publishable-Key (`VITE_STRIPE_PUBLISHABLE_KEY` falls vorhanden) → `pk_test_*`

Code-Änderung: keine — `create-payment` erkennt Test-Mode automatisch (`stripeSecretKey.startsWith('sk_test_')`). Zusätzlich Belt-and-Suspenders: bei `PENTEST_MODE=true` greift bereits der bestehende Pentest-Guard und gibt simuliertes 200 zurück, ohne Stripe überhaupt zu kontaktieren.

Im Stripe-Dashboard:
- Webhook-Endpoint für Test-Mode auf dieselbe URL registrieren (https://gqbhilftduwxjszznnzy.supabase.co/functions/v1/stripe-webhook)
- Events: `payment_intent.succeeded`, `checkout.session.completed`

### Phase 3 — Aikido-Testaccounts (kritisch)

6 Konten mit klarem Prefix `aikido_` für späteres Bulk-Cleanup. Passwörter generieren wir zufällig und liefern sie im Output.

**Mandant A (Tenant A) — Steuerjahr 2024:**
- `aikido_admin_a@ditax.test` → Rolle `admin`
- `aikido_manager_a@ditax.test` → Rolle `moderator`
- `aikido_viewer_a@ditax.test` → Rolle `user`, mit eigenem `tax_filer` + 1 dummy `tax_return` (2024)

**Mandant B (Tenant B) — Steuerjahr 2024:**
- `aikido_admin_b@ditax.test` → Rolle `admin`
- `aikido_manager_b@ditax.test` → Rolle `moderator`
- `aikido_viewer_b@ditax.test` → Rolle `user`, mit eigenem `tax_filer` + 1 dummy `tax_return` (2024)

Damit kann Aikido testen:
- Privilege-Escalation (Viewer → Admin via Endpoint-Manipulation)
- Cross-Tenant-Leak (Viewer A liest Daten von Viewer B)
- RLS-Bypass über REST/Edge-Functions

Erstellung via Edge Function `seed-aikido-users` (admin-only, JWT + `has_role` Check), die `auth.admin.createUser` + `user_roles` + `tax_filers` + `tax_returns` in einer Transaktion anlegt. Liefert JSON mit den 6 E-Mails + initialen Passwörtern zurück, das du an Aikido weitergeben kannst.

### Phase 4 — Cleanup-Vorbereitung (empfohlen)

Bestehende `cleanup-pentest-data` Edge Function erweitern, damit sie zusätzlich zum `aikido_test_*`-Prefix auch `aikido_*@ditax.test` matcht. Nach dem Scan: ein Aufruf löscht alle 6 Testaccounts inkl. ihrer FK-Kaskaden.

### Phase 5 — Aktivierungs-Checkliste (am Scan-Tag)

Klar getrennt von Code-Änderungen, damit du den Killswitch innerhalb von 2 Minuten an/aus schalten kannst:

1. Secret `PENTEST_MODE=true` setzen
2. `STRIPE_SECRET_KEY` & `STRIPE_WEBHOOK_SECRET` auf Test-Werte updaten
3. `seed-aikido-users` aufrufen → 6 Credentials an Aikido geben
4. Cloudflare: Aikido-IPs in WAF auf Allow (höchste Priorität), Bot Fight Mode Off
5. Scan starten
6. Nach Scan: `cleanup-pentest-data` aufrufen, Secrets zurück auf Live, `PENTEST_MODE` löschen oder auf `false`

---

### Technische Details

**Risiken / Breaking Changes während des Scan-Fensters:**
- Echte Kunden können nicht zahlen (Stripe Test-Mode). → Fenster eng halten, idealerweise nachts.
- Echte Mails werden nicht versendet (existierender Guard). → Magic-Link-Logins von echten Kunden während des Fensters scheitern.
- AI-OCR liefert leere Stub-Ergebnisse → echte Kunden, die in dem Fenster Dokumente hochladen, bekommen "Konnte nichts erkennen" Fehler.

**Nicht im Plan-Scope (bewusst):**
- Echtes Staging-Environment (zu viel Arbeit für <24h Scan)
- Cloudflare-Config (manuell durch User)
- Supabase Auth Rate-Limits (manuell im Dashboard)

**Files, die erstellt/geändert werden:**
- `supabase/functions/_shared/pentest-guard.ts` — bereits vorhanden, keine Änderung
- `supabase/functions/ocr-extract/index.ts` — Guard einbauen
- `supabase/functions/extract-lohnausweis/index.ts` — Guard einbauen
- `supabase/functions/scan-prior-year/index.ts` — Guard einbauen
- `supabase/functions/scan-prior-year-vertex/index.ts` — Guard einbauen
- `supabase/functions/seed-aikido-users/index.ts` — neu
- `supabase/functions/cleanup-pentest-data/index.ts` — Prefix-Pattern erweitern
- `SECURITY_AIKIDO_CHECKLIST.md` — Aktivierungs-Checkliste + Rollen-Mapping ergänzen
- `mem://security/pentest-mode-killswitch.md` — AI-Functions zur Killswitch-Liste hinzufügen
