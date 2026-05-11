## Newsletter: Zeilenumbrüche & Absätze korrekt rendern

### Problem
Der Admin gibt im Textfeld `Inhalt` reinen Text mit echten Zeilenumbrüchen und Leerzeilen ein (siehe Aktionswochen-Text). Aktuell wird dieser String 1:1 als HTML ins Template eingesetzt – HTML ignoriert aber `\n`, deshalb erscheint alles als ein einziger Fliesstext-Block.

### Lösung
Im Shared-Wrapper `supabase/functions/_shared/newsletter-template.ts` den eingehenden `bodyHtml` vor dem Einsetzen normalisieren:

1. **Erkennen, ob es bereits HTML ist**: Heuristik – enthält der Input ein Block-Tag (`<p`, `<div`, `<br`, `<h1`–`<h6`, `<ul`, `<ol`, `<table`)? Wenn ja → unverändert einsetzen (Power-User-HTML weiterhin erlaubt).
2. **Sonst als Plain-Text behandeln**:
   - HTML-Sonderzeichen escapen (`&`, `<`, `>`).
   - Auf Leerzeilen (`\n\s*\n`) splitten → jedes Stück wird ein `<p>`-Absatz.
   - Innerhalb eines Absatzes verbleibende einfache `\n` → `<br />`.
   - URLs (http/https) automatisch als anklickbare `<a>` mit Brand-Blau `#1D64FF` rendern (kleiner Bonus, kein Aufwand).
3. Die Absätze bekommen konsistente Bottom-Spacings (z.B. `margin:0 0 16px 0`) im OTP-Stil; der letzte Absatz hat `margin-bottom:0`.

Damit wird der eingefügte Aktionstext automatisch zu sauberen Absätzen mit Abständen, ohne dass der Admin HTML schreiben muss.

### Geänderte Dateien
- `supabase/functions/_shared/newsletter-template.ts` – neue Hilfsfunktion `renderBody(bodyHtml)` + Aufruf im Template. Keine Änderungen an den Edge-Function-Entrypoints.

### Verifikation
- Test-Mail mit dem exakten Aktionswochen-Text aus dem Chat senden → Erwartung: gleiche Absatz-Struktur wie im Wunsch-Layout (Hallo / Pauschalpreis-Absatz / „Und das Beste:" / Express / Liste mit ✅ je auf eigener Zeile / ⏳-Hinweis / Liebe Grüsse / Dein Ditax-Team).
- Gegentest mit bereits formatiertem HTML (z.B. `<p>Foo</p>`) → bleibt unverändert, kein Doppel-Wrapping.

### Nicht Teil dieses Plans
- Kein WYSIWYG-Editor im Admin.
- Kein Markdown-Parsing (nur Plain-Text-Newlines + Auto-Links).
