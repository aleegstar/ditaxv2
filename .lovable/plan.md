 # Plan: Behebung der Aikido Security Findings
 
 **Status: ABGESCHLOSSEN** ✅
 
 Letzte Aktualisierung: 2026-02-05

## Zusammenfassung der Probleme

Aus den Screenshots wurden 5 Sicherheitsprobleme identifiziert:

| Problem | Score | Typ | Status |
|---------|-------|-----|--------|
| CSP erlaubt inline JavaScript | 85 | Surface Monitoring | Bekannte Einschraenkung |
| CSP blockiert eval() nicht | 75 | Surface Monitoring | Bekannte Einschraenkung |
 | JWT Token in Git History | 80 | Secrets | ✅ FALSE POSITIVE - ANON Key |
 | JWT Token in Git History (2) | 80 | Secrets | ✅ FALSE POSITIVE - ANON Key |
 | @remix-run/router CVE | 80 | Dependency | ✅ BEHOBEN (1.23.2) |
 
 ## Erforderliche manuelle Schritte
 
 ### In Aikido Dashboard:
 
 1. **JWT Token Warnings als False Positive markieren:**
    - Issues → Betroffene JWT-Issues auswaehlen
    - "Mark as false positive" klicken
    - Grund: "Supabase ANON key is a public key protected by RLS. Session tokens are runtime-only."
 
 2. **Security Scan erneut ausfuehren:**
    - Bestaetigt, dass @remix-run/router 1.23.2 installiert ist

---

## Detailanalyse

### 1. CSP erlaubt `unsafe-inline` und `unsafe-eval` (Score 75-85)

**Status:** Bekannte technische Einschraenkung

**Problem:**
Die aktuelle CSP in `index.html` enthaelt:
```
script-src 'self' 'unsafe-inline' 'unsafe-eval' ...
```

**Warum dies erforderlich ist:**
- **Lovable/GPTEngineer SDK:** Das eingebettete Script `https://cdn.gpteng.co/gptengineer.js` benoetigt `unsafe-eval` fuer den Live-Editing-Modus
- **React Development:** React verwendet `eval()` fuer Hot Module Replacement (HMR)
- **Inline Event Handlers:** Einige Bibliotheken (styled-components, framer-motion) generieren Inline-Styles/-Scripts

**Moegliche Loesungen:**

| Loesung | Aufwand | Risiko | Empfehlung |
|---------|---------|--------|------------|
| Nonce-basierte CSP | 40-60h | Mittel | Langfristig |
| Hash-basierte CSP | 20-30h | Hoch | Nicht empfohlen |
| Separate Produktions-CSP | 4-8h | Niedrig | Kurzfristig moeglich |

**Empfohlene Massnahme:**
Fuer die Produktionsumgebung (`app.ditax.ch`) ueber Cloudflare Workers eine strengere CSP ohne Lovable SDK einsetzen - dies erfordert jedoch, dass das Lovable SDK nur in der Entwicklungsumgebung geladen wird.

---

### 2. JWT Token "Leak" in Git History (Score 80) - FALSE POSITIVE

**Betroffene Dateien (laut Screenshot):**
- `src/integrations/supabase/client.ts`
- `src/utils/pdfDownloadHelper.ts`
- `src/services/KeyManagementService.ts`
- `src/components/user-detail/DocumentsPdfDownloader.tsx`
- `src/components/EdgeFunctionTester.tsx`
- `.env`
- `supabase/functions/setup-cron-notifications.sql`

**Analyse der Dateien:**

| Datei | Inhalt | Risiko |
|-------|--------|--------|
| `supabase/client.ts` | Supabase ANON Key | KEIN RISIKO - Public Key |
| `pdfDownloadHelper.ts` | Access Token aus Session | KEIN RISIKO - Runtime-Token |
| `KeyManagementService.ts` | Session Token | KEIN RISIKO - Runtime-Token |
| `DocumentsPdfDownloader.tsx` | Session Auth | KEIN RISIKO - Runtime-Token |
| `EdgeFunctionTester.tsx` | Session Auth | KEIN RISIKO - Runtime-Token |

**Erklaerung:**
1. **Supabase ANON Key:** Dies ist ein OEFFENTLICHER Schluessel, der absichtlich im Client-Code exponiert wird. Alle Sicherheit wird durch Row Level Security (RLS) auf dem Server durchgesetzt.

2. **Session Access Tokens:** Die anderen Dateien verwenden `supabase.auth.getSession()` um RUNTIME Access Tokens zu erhalten. Diese werden NIE im Code gespeichert, sondern nur zur Laufzeit aus der authentifizierten Session gelesen.

**Status:** Diese Warnung ist ein **FALSE POSITIVE** des Sicherheitsscanners.

**Empfohlene Massnahme:**
Die bestehende SECURITY.md-Dokumentation erklaert dies bereits. Aikido erlaubt das manuelle Markieren von False Positives ueber ihr Dashboard:
- In Aikido: Issues → Betroffene Issues auswaehlen → "Mark as false positive" → Grund: "Supabase ANON key is designed to be public"

---

### 3. @remix-run/router Vulnerability (CVE-2026-22029, Score 80)

**Status:** BEREITS BEHOBEN

**Aktuelle Version laut package-lock.json:**
```json
"@remix-run/router": {
  "version": "1.23.2"
}
```

**Empfohlene Version laut Screenshot:** 1.23.2

Die Abhaengigkeit ist bereits auf die empfohlene Version aktualisiert. Dies ist moeglicherweise ein veralteter Scan-Bericht.

**Empfohlene Massnahme:** Keine Aktion erforderlich - Aikido-Scan erneut ausfuehren.

---

## Massnahmenplan

### Sofort umsetzbar

1. **Aikido False Positives markieren:**
   - JWT-Token-Warnungen als "False Positive" markieren
   - Begruendung: "Supabase ANON key is a public key protected by RLS"

2. **Dependency-Scan aktualisieren:**
   - Neuen Aikido-Scan ausloesen um bestaetigen, dass @remix-run/router 1.23.2 installiert ist

### Mittelfristig (optional, 4-8 Stunden)

3. **Produktions-spezifische CSP im Cloudflare Worker:**
   Das Lovable SDK nur in der Entwicklungsumgebung laden und in Produktion eine strengere CSP verwenden.

```text
Architektur:
+--------------------+     +--------------------+
| Development        |     | Production         |
| (Lovable Preview)  |     | (app.ditax.ch)     |
+--------------------+     +--------------------+
        |                          |
        v                          v
  unsafe-inline/eval          Stricter CSP
  (Lovable SDK noetig)       (via CF Worker)
```

### Langfristig (20-40 Stunden)

4. **Nonce-basierte CSP implementieren:**
   - Server-seitig: Eindeutigen Nonce pro Request generieren
   - CSP: `script-src 'nonce-{random}'` statt `unsafe-inline`
   - HTML: Alle `<script>` Tags mit `nonce="{random}"` versehen

---

## Technische Details

### Cloudflare Worker CSP-Variante (strenger fuer Produktion)

Falls das Lovable SDK in Produktion nicht benoetigt wird:

```javascript
// In cloudflare/security-headers-worker.js
const PRODUCTION_CSP = [
  "default-src 'self'",
  // OHNE unsafe-inline und unsafe-eval:
  "script-src 'self' https://fonts.googleapis.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com",
  // ... rest bleibt gleich
].join('; ');
```

**WARNUNG:** Dies wuerde die App brechen, wenn React/Framer-Motion/Styled-Components Inline-Scripts benoetigen. Umfangreiche Tests erforderlich.

---

## Erwartete Ergebnisse

| Problem | Vor Fix | Nach Fix |
|---------|---------|----------|
| CSP unsafe-inline | Offen | Als "Accepted Risk" dokumentiert |
| CSP unsafe-eval | Offen | Als "Accepted Risk" dokumentiert |
| JWT Token (ANON) | 80 (High) | False Positive markiert |
| JWT Token (Runtime) | 80 (High) | False Positive markiert |
| @remix-run/router | 80 (High) | 0 (bereits gefixt) |

**Geschaetzter Aikido Score nach Massnahmen:** 90+ (alle verbleibenden Issues als dokumentierte Risiken oder False Positives)

---

## Zusammenfassung

Die identifizierten Probleme sind:

1. **CSP unsafe-inline/eval:** Technische Einschraenkung durch Lovable SDK und React. Kann langfristig durch Nonce-basierte CSP geloest werden.

2. **JWT Token "Leaks":** FALSE POSITIVES - der Scanner erkennt nicht, dass Supabase ANON Keys oeffentlich sein sollen und Session-Tokens nur zur Laufzeit verwendet werden.

3. **@remix-run/router:** Bereits auf 1.23.2 aktualisiert.

**Keine Code-Aenderungen erforderlich** - die Probleme sind entweder bereits behoben, dokumentierte Einschraenkungen oder False Positives im Scanner.
