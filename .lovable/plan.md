
# Vault-gehärtetes AI-Rate-Limiting

## Ziel
Verhindern, dass User die Gemini-Quotas (Vorjahres-Scan, Lohnausweis, OCR) durch Account-Löschen + Reinstall + neuen Account umgehen. Wir verankern die Quota zusätzlich an einer **geräteweiten ID**, die Despia in iCloud KVS / Google Backup speichert und Reinstall + Account-Wechsel überlebt.

## Konzept

```text
   ┌──────────────┐                  ┌─────────────────────────┐
   │ Despia App   │                  │ Edge Function           │
   │ (iOS/Android)│   X-Device-Id    │ scan-prior-year-vertex  │
   │              │ ───────────────▶ │ extract-lohnausweis     │
   │ Vault:       │                  │ ocr-extract             │
   │  ditax_did   │                  │                         │
   └──────────────┘                  │ check user_id quota     │
                                     │ check device_id quota   │
                                     │ → blockiert wenn EINER  │
                                     │   der beiden voll ist   │
                                     └─────────────────────────┘
```

- Beim ersten App-Start nach Login wird `vault.get("ditax_did")` versucht. Fehlt sie → neue UUID generieren und `vault.set("ditax_did", uuid)`.
- Diese UUID wird bei JEDER AI-Edge-Function als Header `X-Device-Id` mitgeschickt.
- Server **hashed** sie (SHA-256 + Pepper aus Secret) und speichert nur `device_hash` → DSGVO-konform pseudonym.
- Limit-Check zählt PARALLEL `user_id`-Treffer UND `device_hash`-Treffer. Treffer auf einem der beiden ⇒ Block.

## Limits (unverändert in Höhe, härter im Scope)

| Endpoint            | Tag (user_id) | Tag (device) | Lifetime           |
|---------------------|---------------|--------------|--------------------|
| prior_year          | 5             | 5            | 3 pro (device, year) ZUSÄTZLICH zu 3 pro (filer, year) |
| lohnausweis         | 20            | 20           | –                  |
| ocr_extract         | 100           | 100          | –                  |

Web-User (kein Vault verfügbar) → Header fehlt → nur user_id-Quota greift (heutiger Stand, kein Regress).

## Umsetzung

### 1. Client – Vault-Helper
- **Neu** `src/lib/deviceVault.ts`:
  - `getOrCreateDeviceId(): Promise<string | null>` – nur in `isDespiaNative()` aktiv, sonst `null`.
  - Liest `readvault://?key=ditax_did`. Wenn leer: `crypto.randomUUID()` + `setvault://?key=ditax_did&value=…&locked=false`.
  - Cached im Modul + sessionStorage, damit nicht jeder Call die Vault anfasst.
- **Wrapper** `src/lib/aiFetch.ts`:
  - `invokeAi(name, body)` ruft `supabase.functions.invoke` mit zusätzlich `headers: { 'x-device-id': deviceId }` wenn vorhanden.
- **Refactor** der 3 Call-Sites:
  - `src/components/intake/PriorYearUpload.tsx` (Aufruf `scan-prior-year-vertex`)
  - `src/services/LohnausweisOcrService.ts` (Aufruf `extract-lohnausweis`)
  - `src/services/CloudOcrService.ts` bzw. wo `ocr-extract` invoked wird
  - Alle Stellen verwenden den Wrapper statt `supabase.functions.invoke` direkt.

### 2. Server – Hash + Quota erweitern
- **Erweitern** `supabase/functions/_shared/ai-rate-limit.ts`:
  - Neuer Param `deviceId?: string` (aus Header `x-device-id`, validiert UUID v4-Format, max 64 Zeichen).
  - Hash: `sha256(deviceId + Deno.env.get('DEVICE_ID_PEPPER'))` → `device_hash`.
  - Zwei zusätzliche SELECTs gegen `ai_usage_log` mit Filter `device_hash = …` für Tag & Lifetime.
  - Reason-Codes erweitert: `daily_limit_device`, `lifetime_limit_device`.
- **Migration**:
  ```sql
  ALTER TABLE public.ai_usage_log
    ADD COLUMN device_hash text;
  CREATE INDEX idx_ai_usage_log_device_endpoint_created
    ON public.ai_usage_log (device_hash, endpoint, created_at DESC)
    WHERE device_hash IS NOT NULL;
  CREATE INDEX idx_ai_usage_log_device_year_endpoint
    ON public.ai_usage_log (device_hash, tax_year, endpoint)
    WHERE device_hash IS NOT NULL;
  ```
- **Secret hinzufügen**: `DEVICE_ID_PEPPER` (zufälliger 32-Byte hex String) via `add_secret`.
- **3 Edge Functions** lesen den Header und übergeben ihn an `checkAndLogAiUsage`.

### 3. Fallback-Verhalten (gleiche Policy wie bisher)
- `daily_limit*` bei `prior_year` und `ocr_extract` → 429 mit `fallback: "local"`, Client schaltet auf lokales OCR.
- `lifetime_limit*` bei `prior_year` → 429 ohne Fallback, freundlicher Hinweis-Toast „max 3 Scans pro Steuerjahr".
- `daily_limit*` bei `lohnausweis` → 429 mit Toast (kein Auto-Fallback, lokal kann das nicht).

### 4. Admin-Sichtbarkeit
- `UserDetail.tsx` zeigt zusätzlich „Geräte verknüpft mit diesem Account: N" (distinct `device_hash` in `ai_usage_log`).
- Optional Phase 2 (nicht in diesem Plan): geräte-basiertes Aufheben durch Support.

## Was bewusst NICHT gemacht wird
- Kein Biometrie-Lock (`locked=true`) auf der Device-ID – würde bei jedem Scan FaceID prompten.
- Kein Vault-Sync für `user_id` selbst (Account-Identifikation läuft weiter über Supabase Auth).
- Keine Captcha- oder IP-Limits.
- Web-User bekommen keinen zusätzlichen Schutz (akzeptiertes Restrisiko).

## Datenschutz
- Vault enthält nur eine zufällige UUID, kein PII.
- Server speichert nur den gepfefferten Hash, daraus ist die UUID nicht rückrechenbar.
- Hinweis in Privacy-Policy ergänzen: „Zur Missbrauchsverhinderung speichern wir in der App eine pseudonyme Geräte-Kennung in der Plattform-Schlüsselablage (iCloud / Google Backup) und einen Hash davon auf unseren Servern."

## Risiken
- iCloud / Google Backup kann von Power-Usern manuell geleert werden → Quota-Reset möglich, aber Aufwand >> Nutzen für 3 Vorjahres-Scans.
- Familien-iCloud-Account (mehrere echte User auf einem iCloud) → kollidierende Device-ID, also striktere Quota für sie. Akzeptabel, kommt selten vor.

## Reihenfolge
1. Secret `DEVICE_ID_PEPPER` anlegen.
2. Migration (Spalte + Indizes).
3. `_shared/ai-rate-limit.ts` erweitern.
4. 3 Edge Functions Header-Forwarding.
5. Client `deviceVault.ts` + `aiFetch.ts` + 3 Call-Sites umstellen.
6. Privacy-Hinweis Text ergänzen.
