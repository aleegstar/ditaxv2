# Quick Wins: Vertex AI Gemini Kostenoptimierung

Ziel: Sofort 40–60 % Kosten sparen, ohne neue Komplexität. Keine Änderungen an PDF-Preprocessing, lokalem Fallback oder Monitoring.

## 1. Model-Tiering in `_shared/vertex-ai.ts`

Konstanten exportieren, Default unverändert:

```ts
export const MODEL_FLASH_LITE = "gemini-2.5-flash-lite"; // nur reine Text-/OCR-Extraktion
export const MODEL_FLASH      = "gemini-2.5-flash";       // Default
const DEFAULT_MODEL           = MODEL_FLASH;              // bleibt unverändert
```

Region bleibt `europe-west6`. Falls Flash-Lite dort nicht verfügbar ist, fällt der Caller automatisch zurück auf Flash (try/catch um den Call mit `VertexAiError` Code-Check auf 404 → Retry mit `MODEL_FLASH`).

## 2. Einheitliche strukturierte JSON-Responses erzwingen

Neuer Helper im `_shared/vertex-ai.ts`:

```ts
export async function generateJson<T>(parts, opts: GenerateOptions & { responseSchema: unknown }): Promise<T>
```

- Setzt zwingend `responseMimeType: "application/json"`.
- Wirft `VertexAiError("vertex_invalid_json", ...)` wenn Parse fehlschlägt.
- Wird in `extract-lohnausweis` und `scan-prior-year-vertex` benutzt.
- `ocr-extract` bekommt ein minimales Schema `{ text: string }` statt freiem Plain-Text → konsistent + planbare Tokens.

## 3. Prompt- & Schema-Slimming

- **Lohnausweis-Prompt**: von ~12 Zeilen auf 5 kompakte Bullets. Schema bleibt (Felder werden gebraucht), aber Reihenfolge unverändert.
- **scan-prior-year**: System-Prompt um ~40 % kürzen (Beispiele konsolidieren, redundante Erklärungen raus). Schema bleibt funktional gleich, aber `required: ["label"]` auf Item-Ebene reicht – keine Änderung nötig.
- **ocr-extract**: einzeilige Instruction.

## 4. `maxOutputTokens` reduzieren

| Function | Vorher | Nachher |
|---|---|---|
| `ocr-extract` | 4096 | **1536** |
| `extract-lohnausweis` | 2048 | **1536** |
| `scan-prior-year-vertex` | 4096 | **2048** |

Realistische Obergrenzen basierend auf Schema-Größe.

## 5. Modell-Zuordnung

| Function | Modell |
|---|---|
| `ocr-extract` | **`MODEL_FLASH_LITE`** (mit Auto-Fallback auf Flash bei 404) |
| `extract-lohnausweis` | `MODEL_FLASH` (Default, Präzision wichtig) |
| `scan-prior-year-vertex` | `MODEL_FLASH` (Default) |

## 6. Response-Cache (Supabase Tabelle)

Migration `ai_extraction_cache`:

| Spalte | Typ | Zweck |
|---|---|---|
| `id` | uuid PK | |
| `cache_key` | text UNIQUE | SHA-256(file_bytes) + `:` + function_name + `:` + model |
| `function_name` | text | z. B. `extract-lohnausweis` |
| `model` | text | z. B. `gemini-2.5-flash` |
| `file_hash` | text | SHA-256 hex |
| `payload` | jsonb | extrahiertes JSON-Resultat |
| `tax_filer_id` | uuid NULL | Isolation, NULL für OCR |
| `user_id` | uuid NOT NULL | Owner |
| `created_at` | timestamptz default now() | |
| `last_used_at` | timestamptz default now() | |

- RLS: User darf nur eigene Zeilen lesen/schreiben (`auth.uid() = user_id`).
- Index auf `cache_key`.
- Kein TTL-Job nötig (Quick Win) – Cleanup später.

Cache-Logik in jeder Function:

```ts
const fileHash = sha256Hex(fileBytes);
const cacheKey = `${fileHash}:${FUNCTION_NAME}:${MODEL}`;
// 1. SELECT payload FROM ai_extraction_cache WHERE cache_key=$1 AND user_id=$2
// 2. Hit → update last_used_at, return cached payload
// 3. Miss → Vertex-Call → INSERT
```

SHA-256 via `crypto.subtle.digest("SHA-256", bytes)` (Web Crypto, in Deno verfügbar).

## Dateien, die geändert werden

- `supabase/functions/_shared/vertex-ai.ts` — Model-Konstanten, `generateJson` Helper.
- `supabase/functions/_shared/ai-cache.ts` *(neu)* — `sha256Hex`, `getCached`, `setCached`.
- `supabase/functions/ocr-extract/index.ts` — Flash-Lite, Cache, JSON-Schema, maxOutputTokens 1536, Prompt slimming.
- `supabase/functions/extract-lohnausweis/index.ts` — Cache, Prompt slimming, maxOutputTokens 1536, `generateJson`.
- `supabase/functions/scan-prior-year-vertex/index.ts` — Cache, Prompt slimming, maxOutputTokens 2048, `generateJson`.
- DB-Migration: Tabelle `ai_extraction_cache` + RLS.

## Was bewusst NICHT gemacht wird

- Kein PDF-Preprocessing / Seiten-Filter.
- Kein lokaler Fallback-Vorrang.
- Kein `ai_usage_log` / Monitoring-Widget.
- Keine Pro-Modell-Integration.

## Risiken

- Flash-Lite-Verfügbarkeit in `europe-west6`: Auto-Fallback auf Flash absichert.
- Cache-Hit für OCR ist eher selten (unterschiedliche Scans desselben Belegs), aber Lohnausweis/Vorjahres-PDF profitieren stark bei Re-Uploads.
- `maxOutputTokens` Reduktion: Schema-Größe wurde geprüft, Werte sind sicher.

Soll ich so umsetzen?
