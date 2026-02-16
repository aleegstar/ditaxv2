

# Security Fixes fuer aikido.dev Findings

## Uebersicht der 4 Findings

### 1. CSP `unsafe-inline` und `unsafe-eval` (Score 85 + 75) -- NICHT FIXBAR

**Grund:** Lovable's Hosting-Plattform und Build-System (Vite) benoetigen `unsafe-inline` und `unsafe-eval` fuer:
- Hot Module Replacement (HMR) waehrend der Entwicklung
- Vite's CSS-Injection-Mechanismus
- GPT Engineer SDK (`cdn.gpteng.co`)

**Aktion:** Diese Findings koennen nur durch Migration zu einem eigenen Hosting (mit Cloudflare Workers) oder durch Nonce-basiertes CSP geloest werden. Das ist im `SECURITY.md` bereits als Roadmap-Item dokumentiert. Keine Code-Aenderung moeglich.

---

### 2. "Exposed JWT Token" in 8 Dateien (Score 80) -- FALSE POSITIVE

Die Scanner finden den Supabase ANON Key in:
- `src/integrations/supabase/client.ts` (direkt)
- `.env` (direkt)
- `src/utils/pdfDownloadHelper.ts`, `src/services/KeyManagementService.ts`, `src/components/user-detail/DocumentsPdfDownloader.tsx`, `src/components/EdgeFunctionTester.tsx`, `src/utils/coverLetterDownloadHelper.ts` (indirekt via Import)
- `supabase/functions/setup-cron-notifications.sql` (geloeschte Datei)

**Grund:** Der ANON Key ist ein **oeffentlicher** Schluessel (wie ein Firebase API Key). Er ist durch RLS geschuetzt. Dies ist bereits in `SECURITY.md` dokumentiert.

**Aktion:** Keine Code-Aenderung noetig. In aikido.dev als "accepted risk" / false positive markieren.

---

### 3. XSS via `window.location.href` in PaymentSection.tsx (Score 75) -- FIXBAR

**Problem:** Zeile 234 setzt `window.location.href = data.url` ohne Validierung. Ein kompromittierter Edge Function Response koennte eine `javascript:` oder boeswillige URL liefern.

**Fix:** URL-Validierung vor dem Redirect hinzufuegen:

```typescript
// Vor dem Redirect: URL validieren
const paymentUrl = data.url;
try {
  const parsed = new URL(paymentUrl);
  const allowedHosts = ['checkout.stripe.com', 'pay.stripe.com'];
  if (!allowedHosts.some(host => parsed.hostname.endsWith(host))) {
    throw new Error('Unbekannte Zahlungs-URL');
  }
  if (parsed.protocol !== 'https:') {
    throw new Error('Unsichere Zahlungs-URL');
  }
  window.location.href = paymentUrl;
} catch (validationError) {
  throw new Error('Ungueltige Zahlungs-URL erhalten');
}
```

**Dateien:**
- `src/components/PaymentSection.tsx` -- URL-Validierung vor `window.location.href` (Zeile 234)

---

## Zusammenfassung

| Finding | Score | Status | Aktion |
|---------|-------|--------|--------|
| CSP unsafe-inline | 85 | Nicht fixbar | Cloudflare Worker / Hosting-Migration noetig |
| CSP unsafe-eval | 75 | Nicht fixbar | Cloudflare Worker / Hosting-Migration noetig |
| JWT Token "Leak" | 80 | False Positive | In aikido.dev als akzeptiert markieren |
| XSS window.location.href | 75 | **Fixbar** | URL-Validierung hinzufuegen |

**1 Datei wird geaendert:** `src/components/PaymentSection.tsx`

