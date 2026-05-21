## Ziel

Missbrauch der teuren Vertex-AI-Endpunkte verhindern, ohne ehrliche Vielnutzer auszubremsen. Lokales OCR (Despia Vision / Tesseract) bleibt unbegrenzt.

## Limits (server-enforced, nicht im Client)

| Endpunkt | Limit | Begründung |
|---|---|---|
| `scan-prior-year-vertex` | **3 Scans pro `tax_filer_id` + `tax_year` (lifetime)** + zusätzlich max. 5/Tag pro User | Vorjahres-PDF ist der teuerste Call. 3 Versuche pro Steuerjahr/Person reichen für „Ersetzen" auch bei Fehlversuchen. |
| `extract-lohnausweis` | **20 / Tag pro User** | Realistisch: Ehepaar mit mehreren Jobs ≈ 4–8 Lohnausweise. 20 ist grosszügig. |
| `ocr-extract` (Checklisten-Keywords) | **100 / Tag pro User** | Checklisten-Klassifikation läuft pro Upload. Multi-Filer-Haushalte können 50+ Docs hochladen. |

Alle Werte als Konstanten in `supabase/functions/_shared/rate-limits.ts` – einfach anpassbar.

## Verhalten bei Überschreitung

**Fallback statt Block.** Wenn das Tageslimit erreicht ist, gibt die Edge Function `429` mit `{ error: "rate_limited", fallback: "local" }` zurück. Der Client erkennt das und:

- `PriorYearUpload`: zeigt Toast „Tageslimit für KI-Analyse erreicht – wir nutzen lokale Erkennung" und ruft den existierenden lokalen Pfad (`extractScanFromPdf` / `ocrPdfLocally`) auf.
- `DocumentValidator` (Checklisten-OCR): fällt automatisch auf Despia Vision OCR bzw. Tesseract zurück (Logik existiert bereits).
- Lohnausweis-Extraktion: kein Auto-Fallback (Strukturierung braucht KI). Hier erscheint Toast „KI-Analyse heute nicht mehr verfügbar – bitte morgen erneut versuchen oder Felder manuell ausfüllen."

Beim **Lifetime-Limit** für Vorjahres-Scans (3x pro Filer/Jahr verbraucht) erscheint Hinweis „Du hast die 3 Analysen für dieses Steuerjahr aufgebraucht. Bitte fülle die Checkliste manuell aus oder kontaktiere den Support." – kein automatischer lokaler Fallback, weil sonst die Lifetime-Bremse umgangen würde.

## Technische Umsetzung

### 1. Neue Tabelle `ai_usage_log`

```text
id, user_id, tax_filer_id (nullable), tax_year (nullable),
endpoint ('prior_year' | 'lohnausweis' | 'ocr_extract'),
created_at, success bool
```
RLS: User sieht nur eigene Zeilen (SELECT), INSERT nur via service_role aus Edge Functions.

Index: `(user_id, endpoint, created_at)` für schnelle Tages-Counts; `(tax_filer_id, tax_year, endpoint)` für Lifetime-Count.

### 2. Shared Helper `supabase/functions/_shared/ai-rate-limit.ts`

```text
checkAndLogAiUsage({ userId, endpoint, taxFilerId?, taxYear? })
  → { allowed: true } | { allowed: false, reason, fallback }
```
- Verwendet `service_role`-Client (RLS bypass).
- Zählt mit einer einzigen SQL-Query (`COUNT(*) FILTER ...`) Tages- und Lifetime-Treffer.
- Loggt erfolgreichen Call vor der Vertex-Anfrage (pessimistisch), markiert bei Failure als `success=false` (zählt trotzdem gegen Tageslimit, um Retry-Storms zu verhindern).

### 3. Integration in die 3 Edge Functions

In `scan-prior-year-vertex/index.ts`, `extract-lohnausweis/index.ts`, `ocr-extract/index.ts` jeweils direkt nach der Auth-Prüfung den Helper aufrufen. Bei `allowed: false` → `429` mit JSON-Body.

### 4. Client-Anpassungen

- `src/components/intake/PriorYearUpload.tsx`: bei `429`+`fallback==='local'` → automatisch lokalen Pfad ausführen, Toast informativ.
- `src/services/LohnausweisOcrService.ts`: bei `429` → freundlicher Fehler-Toast, kein Fallback.
- `src/services/DocumentValidator.ts` / `CloudOcrService.ts`: bei `429` → bereits vorhandener lokaler OCR-Pfad (Despia/Tesseract).

### 5. Admin-Sichtbarkeit (optional, Phase 2)

Neue Admin-Seite oder Erweiterung von `UserDetail.tsx`: zeigt AI-Usage der letzten 30 Tage pro User. Erlaubt Admin per Knopfdruck einen Tag-Reset (DELETE rows < heute). **Nicht in dieser Iteration enthalten** – nur die Tabelle ist bereits dafür vorbereitet.

## Nicht im Scope

- Bezahltes Credit-System (kann später auf der `ai_usage_log`-Tabelle aufgebaut werden).
- Limit für lokales OCR (bleibt absichtlich unlimitiert).
- IP-basiertes Limit (User-basiert reicht, da Auth erzwungen).

## Migration & Rollout

1. Migration: Tabelle + RLS + Indizes.
2. Shared Helper + 3 Edge-Function-Integrationen.
3. Client-Fallback-Handling.
4. Konstanten so wählen, dass auch der grösste reale Use-Case (Ehepaar, 2 Kinder, 3 Liegenschaften) komfortabel unter dem Limit bleibt – aktuelle Werte oben sind dafür ausgelegt.

Nach Approval setze ich das in einem Rutsch um.