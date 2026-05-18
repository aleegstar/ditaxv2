
# Datenschutz beim Vorjahres-Import

## Heutiger Stand

Die Edge Function `scan-prior-year` lädt das PDF als Base64 zur **Lovable AI Gateway** und ruft `google/gemini-2.5-flash` (Vision) auf. Das heisst:

- Die komplette Steuererklärung (mit Namen, AHV, Adresse, Beträgen) verlässt unsere Infrastruktur.
- Sie geht an Google (US-Anbieter, EU-/CH-Datentransfer).
- Wir haben mit Google keinen direkten DPA – nur über Lovable.

Für Schweizer Steuerdaten (besonders schützenswert nach revDSG) ist das tatsächlich grenzwertig.

## Optionen im Vergleich

### A) Client-seitige Extraktion (PDF.js + Heuristik) — empfohlen als Basis

**Wie:** Das PDF wird im Browser mit `pdfjs-dist` in Text umgewandelt. Da kantonale Steuererklärungen (eTax-Ausdrucke) i.d.R. einen Text-Layer enthalten, klappt das ohne OCR. Anschliessend extrahieren wir mit Regex/Keywords (z.B. „Wertschriftenertrag", „Säule 3a", „Lohnausweis", „Liegenschaft") die Positionen.

- ✅ PDF **verlässt das Gerät nie**. DSG-Problem gelöst.
- ✅ Keine API-Kosten.
- ✅ Wir haben das Pattern schon (siehe `TesseractWasmOcrService` für Lohnausweis).
- ⚠️ Funktioniert nur sauber bei eTax-PDFs mit Text-Layer (≈ 90% der Fälle in CH).
- ⚠️ Gescannte/abfotografierte Steuererklärungen → kein Text → Fallback nötig.
- ⚠️ Etwas geringere Trefferquote bei ungewöhnlichen Formularvarianten (kantonsspezifisch).

### B) Client-seitiges OCR (Tesseract.js WASM) als Fallback

**Wie:** Wenn das PDF keinen Text-Layer hat, rendern wir die Seiten zu Bildern und lassen Tesseract.js (WASM, läuft im Browser) den Text extrahieren. Dann gleiche Regex-Pipeline wie A).

- ✅ Auch hier: **kein Upload zu Dritten**.
- ⚠️ Langsamer (5–15s pro Seite auf Mobile).
- ⚠️ Tesseract-Genauigkeit bei Steuerformularen mittel – Zahlen-Spalten teils unsauber.

### C) Pseudonymisierung vor AI-Aufruf

**Wie:** Wir extrahieren clientseitig den Text (A oder B), entfernen **Name, AHV, Adresse, Geburtsdatum, Konto-IBANs** mit Regex, und senden **nur den anonymisierten Text** an Gemini zur Strukturierung. Server bekommt also nie Identifikatoren.

- ✅ Beste KI-Qualität bei Strukturierung.
- ✅ Personendaten verlassen das Gerät nicht.
- ⚠️ Pseudonymisierungs-Regex muss gepflegt werden (False Negatives sind möglich).
- ⚠️ Inhaltliche Beträge gehen trotzdem an Google – datenschutzrechtlich aber unkritischer.

### D) Wechsel auf EU/CH-Anbieter

**Wie:** Statt Google Gemini Mistral (EU-resident, GDPR/DSG-konform mit DPA) oder Azure OpenAI in der Region **Switzerland North**. Beide bieten echte Datenresidenz in der EU/CH.

- ✅ Vertragliche und geografische Garantie.
- ⚠️ Erfordert eigenen API-Key & Vertrag (nicht über Lovable AI Gateway abrufbar).
- ⚠️ Kosten und Integration neu aufzubauen.
- ⚠️ Daten verlassen trotzdem unsere Infra, nur eben nicht das Land.

### E) Status quo + DPA-Härtung

**Wie:** Bei Google bleiben, aber mit Lovable klären, ob „Zero Data Retention" / „no training" garantiert ist, und das in der Datenschutzerklärung transparent machen.

- ✅ Kein Code-Aufwand.
- ⚠️ Reicht für besonders schützenswerte Daten in der CH realistisch **nicht** als alleinige Massnahme.

## Empfehlung

**Kombination A + B + C** in dieser Reihenfolge:

```
PDF hochladen
   │
   ▼
PDF.js Text-Layer  ──ja──▶ Regex/Heuristik (lokal)  ──reicht──▶ Fertig
   │ nein                       │ unklar
   ▼                            ▼
Tesseract.js OCR (lokal) ──▶ pseudonymisieren ──▶ Gemini (nur Text, ohne PII)
```

Das ist die einzige Variante, die **gleichzeitig** hohe Trefferquote, akzeptable Geschwindigkeit und echte Datensparsamkeit bietet. Bei den meisten Nutzern reicht Schritt 1 (rein lokal, 0 ms Netzwerk).

## Implementierungsschritte (wenn freigegeben)

1. Neuer Service `src/services/PriorYearLocalExtractor.ts`
   - `extractTextFromPdf(file)` mit `pdfjs-dist`
   - `extractItemsFromText(text)` mit kuratierten Regex-Mustern pro Kategorie (income/assets/deductions/contact)
2. `PriorYearUpload.tsx` ruft erst den lokalen Extractor, schreibt das Ergebnis direkt in `prior_year_checklist_items` (über RPC/insert mit RLS), Status sofort `ready`.
3. Edge Function `scan-prior-year` umbauen:
   - Akzeptiert **nur Text** + `taxFilerId`/`taxYear` (nicht mehr die PDF).
   - Wird nur noch aufgerufen, wenn lokale Extraktion < N Positionen liefert.
   - Pseudonymisierung serverseitig zur Sicherheit erneut prüfen.
4. PDF aus Storage löschen, sobald die Checkliste fertig ist (heute bleibt sie liegen).
5. Datenschutz-Hinweis im Upload-Sheet: „Dein PDF wird auf deinem Gerät analysiert."

## Technische Notizen

- `pdfjs-dist` ist bereits ein verbreiteter, kleiner Browser-Worker (≈ 400 kB gz).
- Tesseract.js lädt das Sprachmodell `deu+fra+ita` einmalig (≈ 12 MB), Caching via Service Worker.
- Pseudonymisierungs-Regex: AHV (`756\.\d{4}\.\d{4}\.\d{2}`), IBAN (`CH\d{2} ?\d{4}...`), PLZ+Ort, häufige Schweizer Vornamen+Nachnamen über Wortlisten.
- Storage-Bucket `prior-year-returns` kann optional ganz entfernt werden, wenn wir das PDF gar nicht mehr serverseitig brauchen.
