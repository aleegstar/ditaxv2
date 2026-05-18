# Scan-Fallback für Vorjahres-PDFs ohne Text-Layer

## Problem
Das hochgeladene `Steuererklärung_2014_ID_4963.pdf` ist ein reiner Bild-Scan (kein Text-Layer, `pdftotext` liefert 0 Zeichen). Aktuell stoppt `PriorYearUpload.tsx` mit der Meldung "Bitte gib die Positionen manuell ein". Das passiert in der Praxis bei vielen älteren Steuererklärungen (eingescannte Papierversionen, Foto-PDFs aus Despia).

Wir wollen den Datenschutz-Vorteil ("PDF verlässt das Gerät nicht") behalten, dem User aber trotzdem eine automatische Checkliste anbieten.

## Lösung (Stufenmodell, alles client-seitig)

```
PDF
 ├─ Stufe 1: pdfjs Text-Layer  ── reicht? ─► Checkliste (lokal)
 │                              └─ nein
 ├─ Stufe 2: pdfjs render → Tesseract.js OCR im Browser
 │            (deu+fra+ita, max. 6 Seiten, ~10–30 s)
 │            ── Text reicht? ─► Checkliste (lokal-OCR)
 │            └─ nein
 ├─ Stufe 3: pseudonymisierter Text an Edge Function (Gemini-Struktur)
 │            (nur wenn Stufe 1 oder 2 Text geliefert hat)
 └─ Stufe 4: echter Scan komplett unleserlich
              → freundlicher Hinweis + Button "Manuell ausfüllen"
```

Tesseract läuft im Web-Worker. Wir nutzen die bereits im Projekt vorhandenen Bausteine (`TesseractWasmOcrService`, `public/ocr/tesseract-worker.js`) und reduzieren die Seitenzahl (typische CH-Steuererklärung: Deckblatt + 4–6 Formularseiten reichen).

## Änderungen

1. **`src/services/PriorYearLocalExtractor.ts`**
   - Neue Funktion `ocrPdfLocally(file, { maxPages = 6, languages = "deu+fra+ita", onProgress })` 
     - rendert jede Seite via `pdfjs` auf ein `OffscreenCanvas` (Faktor 2 für Lesbarkeit)
     - lässt Tesseract.js (CDN, gleiche Quelle wie `LohnausweisOcrService`) den Text extrahieren
     - gibt kombinierten Text zurück
   - `hasUsableTextLayer` bleibt unverändert.

2. **`src/components/intake/PriorYearUpload.tsx`**
   - Statt sofort `toast.error` zu zeigen, wenn kein Text-Layer da ist:
     - State `phase: "idle" | "parsing" | "ocr" | "structuring"` mit Progress-Anzeige.
     - Button-Label: "Analysiere lokal …", "Erkenne Text (OCR) …", "Strukturiere …".
   - Wenn OCR-Text wieder zu dünn ist (< 400 Zeichen brauchbar): Hinweis-Card mit Button "Trotzdem manuell ausfüllen", der den `guided`-Modus öffnet.
   - Privacy-Hinweis erweitern: "Auch die Texterkennung (OCR) läuft komplett auf deinem Gerät."

3. **Keine Änderung** an `supabase/functions/scan-prior-year` nötig – die Function erwartet weiterhin nur pseudonymisierten Text.

## Technische Notes
- Tesseract-Worker-Bundle ist ~12 MB (einmalig gecacht). Wir laden es lazy erst wenn Stufe 2 nötig ist.
- Mobile Performance: max. 6 Seiten × ~3–5 s = vertretbar, mit klarem Progress-UI.
- Speichersicher: `canvas.toDataURL` ersetzen durch `canvas.transferToImageBitmap`/Blob, Bitmap nach Verarbeitung freigeben.
- Fehlertoleranz: Wenn Tesseract crasht (RAM auf Low-End-Geräten), sauber zu "manuell ausfüllen" zurückfallen, kein Upload.
