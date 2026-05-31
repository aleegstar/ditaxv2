## Ziel

Despia Local-Server-Support einbauen, damit die nativen Despia-Apps (iOS/Android) jedes neue Web-Build automatisch erkennen, vollständig cachen und atomar als OTA-Update ausrollen können – ohne App-Store-Release.

Konkret heißt das: Bei jedem `npm run build` wird im `dist/`-Output zusätzlich `dist/despia/local.json` erzeugt. Dieses Manifest listet `entry`, `deployed_at` und alle gebauten Assets. Die Despia-Runtime fragt diese Datei ab, vergleicht `deployed_at` und lädt geänderte Assets nach.

## Schritte

1. **Dependency hinzufügen**
   - `@despia/local` als devDependency installieren.

2. **Vite-Plugin einbinden** (`vite.config.ts`)
   - Import: `import { despiaLocalPlugin } from '@despia/local/vite';`
   - In `plugins`-Array hinzufügen mit Defaults:
     ```ts
     despiaLocalPlugin({ outDir: 'dist', entryHtml: 'index.html' })
     ```
   - Reihenfolge: nach `react()` und `viteStaticCopy(...)`, damit alle kopierten OCR-Assets im Manifest landen.
   - Nur im Build-Modus relevant; das Plugin hängt sich an den `closeBundle`-Hook, dev server bleibt unverändert.

3. **Version-Guard (optional, empfohlen)**
   - `despia-version-guard` zusätzlich installieren.
   - Genutzt für Features, die eine bestimmte Despia-Runtime-Version voraussetzen (z. B. neue native Bridge-Calls in `src/lib/despia.ts`, Passkey/Easy-OAuth-Flows, Status-Bar-APIs).
   - Wrappen per `<VersionGuard min_version="…">…</VersionGuard>` an genau diesen Stellen – Web bleibt unbeeinflusst, nur die native App rendert konditional.
   - In diesem Plan noch keine konkreten Komponenten umstellen; das passiert auf Zuruf, sobald wir wissen, welche minimale Runtime jedes Feature braucht.

4. **Verifikation**
   - `npm run build` lokal anstoßen (durch den Build im Harness automatisch).
   - Prüfen, dass `dist/despia/local.json` existiert, `entry: "/index.html"`, `deployed_at` als ms-String und alphabetisch sortierte `assets[]` inkl. `tesseract-*`-OCR-Dateien aus `viteStaticCopy`.
   - Sicherstellen, dass das File via Despia an `https://app.ditax.ch/despia/local.json` ausgeliefert wird (Vite kopiert es automatisch nach `dist/despia/`, dadurch wird es vom statischen Hoster mitveröffentlicht).

## Was sich NICHT ändert

- Keine Änderungen an `capacitor.config.ts`, an Auth-/RLS-Flows, an Edge Functions oder am Routing.
- Kein neuer Code in `src/lib/despia.ts` außer den optionalen `VersionGuard`-Imports.
- Kein zusätzlicher Service-Worker und kein Caching-Layer im Web – das Manifest wird ausschließlich von der nativen Despia-Runtime konsumiert.

## Technische Details

- `outDir` muss exakt mit Vites Build-Output übereinstimmen (`dist`).
- `entryHtml` bleibt `index.html` (unsere `index.html` ist die SPA-Shell).
- Das Manifest darf nicht umbenannt oder umgezogen werden – Despia erwartet es fix unter `/despia/local.json` relativ zum Web-Root.
- `_headers` / `public/_redirects` brauchen keine Anpassung; statische Auslieferung deckt das ab.
- CSP: Manifest wird vom Despia-Native-Layer (gleicher Origin) gefetched, daher kein CSP-Update nötig.

## Offene Frage

Soll ich im selben Zug `despia-version-guard` schon installieren und an typischen nativen Touchpoints (`isDespiaNative()`-Pfade, Passkey-Buttons) vorbereiten, oder erstmal nur das Manifest-Plugin und Version-Guard später gezielt pro Feature einziehen?
