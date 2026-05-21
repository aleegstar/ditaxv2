
## Ziel

Despias neue **on-device Vision OCR** (iOS Vision Kit + Android ML Kit, in jeder Despia-App ab heute kostenlos enthalten) als zusätzliche OCR-Quelle für die Dokumenten-Checkliste nutzen. Läuft komplett offline auf dem Gerät, sendet keine Bilddaten – passt perfekt zu unseren Schweizer Datenschutz-Anforderungen und reduziert Vertex-AI-Kosten, wenn die Klassifikation bereits lokal gelingt.

## Was Despia jetzt liefert

- Aufruf: `despia('vision://ocr?id=<id>&src=<encodeURIComponent(url|dataURI|base64)>')`
- Ergebnis: Event auf `window.onVisionEvent` (`status: 'queued' | 'success' | 'error' | 'dismissed'`), bei `success` mit `evt.text` (normalisiert) und `evt.lines[]`.
- Quellen: HTTPS-URL, `data:`-URI, `@imagepicker`, `@filepicker`, `@documentscanner`.
- Optionaler `lang`-Hint (BCP-47, kommagetrennt) – standardmässig Auto-Detect.

## Wo es eingebaut wird

Bestehender Code in `src/services/NativeOcrService.ts` hat bereits einen Despia-Pfad, der aber auf eine alte/nicht existierende API (`window.despia.ocr.recognizeText`) zielt – diese ist nie aktiv. Wir ersetzen diesen Pfad durch die echte `vision://ocr`-Integration. Aufrufer in `DocumentValidator.ts` (`detectKeywordsWithNativeOcr`) bleiben unverändert – gleiche Schnittstelle (`detectTextFromFile(file): Promise<string[]>`, `matchKeywords(...)`).

## Umsetzung (klein gehalten, Quick-Win)

1. **`src/lib/despia.ts`**
   - Neue Helper-Funktion `despiaVisionOcr(file: File, opts?: { lang?: string; timeoutMs?: number }): Promise<{ text: string; lines: string[] }>`.
   - Initialisiert genau einmal einen globalen Dispatcher: `window.onVisionEvent` wird als Multiplexer registriert, der Events anhand der `id` an die jeweilige Promise weiterleitet (UUID per Request).
   - Bestehende `onVisionEvent`-Handler dürfen nicht überschrieben werden → wir wrappen einen evtl. vorhandenen Handler.
   - Erstellt `data:`-URI via `FileReader.readAsDataURL`, kodiert mit `encodeURIComponent` und ruft `despia(`vision://ocr?id=${id}&src=${src}${lang ? `&lang=${lang}` : ''}`)`.
   - Timeout (Default 15 s) → reject; bei `error`-Event → reject mit `evt.error.code`; bei `success` → resolve.
   - Sprache-Hint: `de-CH,de-DE,en-US,fr-CH,it-CH` als Standard-Hint für Schweizer Steuerdokumente.

2. **`src/services/NativeOcrService.ts`**
   - In `initialize()`: Despia-Zweig prüft jetzt nur noch `isDespiaEnvironment()` und markiert `useDespia = true` (kein Check auf `window.despia.ocr.recognizeText` mehr).
   - `detectTextWithDespia(file)` ersetzen: nutzt `despiaVisionOcr(file)`, splittet `text` an `\n`, filtert leere Zeilen → `string[]`. Errors werden gefangen, leeres Array zurück (verhält sich wie bisher).
   - Keine Änderung am öffentlichen Interface, an Privacy-Logik (nur Match-Counts werden weitergegeben) oder an `matchKeywords`.

3. **PDFs**
   - Despia OCR akzeptiert keine PDFs direkt. Für die Checklist-Klassifikation: bestehende PDF→Image-Konvertierung in `DocumentValidator` (Tesseract-Pfad) unverändert lassen – Despia OCR greift nur bei Bild-Uploads (JPG/PNG/HEIC). Falls Despia-Native iOS bereits in HEIC liefert, wird das nativ unterstützt.

4. **Keine Auswirkungen auf**
   - Vertex-AI-Pfade (`ocr-extract`, `extract-lohnausweis`, `scan-prior-year-vertex`) – bleiben Fallback/Master für strukturierte JSON-Extraktion. Despia-OCR liefert nur Roh-Text fürs Keyword-Matching der Checklist.
   - Encryption / RLS / tax_filer-Isolation – Bilddaten verlassen nie das Gerät; Roh-Text wird sofort verworfen.

## Technische Details

```ts
// src/lib/despia.ts (neu)
type VisionEvent = { type: 'ocr'; id: string; status: 'queued'|'success'|'error'|'dismissed'; text?: string; lines?: any[]; error?: { code: string; message?: string } };

const pending = new Map<string, { resolve: (v: any) => void; reject: (e: any) => void; timer: number }>();
let installed = false;

function ensureDispatcher() {
  if (installed) return;
  const prev = (window as any).onVisionEvent;
  (window as any).onVisionEvent = (evt: VisionEvent) => {
    try { prev?.(evt); } catch {}
    const p = pending.get(evt.id);
    if (!p) return;
    if (evt.status === 'success') { clearTimeout(p.timer); pending.delete(evt.id); p.resolve({ text: evt.text ?? '', lines: (evt.lines ?? []).map((l:any)=>l?.text ?? '').filter(Boolean) }); }
    else if (evt.status === 'error' || evt.status === 'dismissed') { clearTimeout(p.timer); pending.delete(evt.id); p.reject(new Error(evt.error?.code ?? evt.status)); }
  };
  installed = true;
}

export async function despiaVisionOcr(file: File, opts: { lang?: string; timeoutMs?: number } = {}) {
  if (!isDespiaNative()) throw new Error('not_despia');
  ensureDispatcher();
  const dataUrl = await new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = () => rej(r.error); r.readAsDataURL(file); });
  const id = crypto.randomUUID();
  const lang = opts.lang ?? 'de-CH,de-DE,en-US,fr-CH,it-CH';
  return new Promise<{text:string; lines:string[]}>((resolve, reject) => {
    const timer = window.setTimeout(() => { pending.delete(id); reject(new Error('timeout')); }, opts.timeoutMs ?? 15000);
    pending.set(id, { resolve, reject, timer });
    despia(`vision://ocr?id=${id}&src=${encodeURIComponent(dataUrl)}&lang=${encodeURIComponent(lang)}`);
  });
}
```

In `NativeOcrService.detectTextWithDespia`:
```ts
const { text } = await despiaVisionOcr(file);
return text.split('\n').map(s => s.trim()).filter(Boolean);
```

## Was wir bewusst NICHT machen (jetzt)

- Keine Nutzung von `@documentscanner` / `@imagepicker`-Tokens – wir wollen die bestehenden Upload-Flows nicht ändern.
- Keine Kombination mit Despia Intelligence (Gemma 3 on-device) für JSON-Extraktion – das wäre ein zweiter, grösserer Schritt. Vertex-AI bleibt Master für strukturierte Felder.
- Kein UI-Hinweis "OCR läuft lokal" – verhält sich genauso wie der bisherige Native-OCR-Pfad (silent).

## Test / Validation

- Web/Desktop: `isDespiaNative()` false → kein Pfad-Wechsel, bestehendes Verhalten (Tesseract WASM / Vertex).
- Despia iOS/Android nach nächstem Native-Build: Upload eines JPG-Lohnausweises → Console-Log `[NativeOCR] Despia: Detected N text blocks`, Keywords matchen → Checklist-Item wird vorgeschlagen.
- Timeout-Pfad: bei Funkloch reject → Fallback auf nachgelagerten Vertex-Call funktioniert wie heute.

## Geänderte Dateien

- `src/lib/despia.ts` (Erweiterung um `despiaVisionOcr`)
- `src/services/NativeOcrService.ts` (Despia-Branch ersetzt)
