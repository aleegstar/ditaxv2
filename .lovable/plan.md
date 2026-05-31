# Mobile-Webapp: Tastatur überdeckt Inputs in PWA / Standalone

## Diagnose

- `index.html` setzt bereits `viewport-fit=cover, interactive-widget=resizes-content` — gut für Chrome, aber iOS Safari (PWA/Standalone) ignoriert `interactive-widget` und resized das Layout-Viewport bei Tastatur nicht.
- `src/App.css` und `src/index.css` setzen `min-height: 100vh` auf `#root` bzw. `body`. `100vh` ist auf iOS die Höhe **ohne** Tastatur-Berücksichtigung → Inputs am Seitenende verschwinden hinter der Tastatur.
- `src/components/layout/AppShell.tsx` nutzt `md:h-screen md:overflow-hidden` (Desktop ok) und `min-h-screen` mobil.
- `src/pages/Auth.tsx` baut auf `min-h-screen` + `flex` und scrollt nicht — Inputs unten werden verdeckt.
- `src/pages/Chat.tsx` ist die einzige Seite mit eigener Tastatur-Behandlung; reicht aber nicht für PWA, weil der Composer-Footer im Layout-Viewport bleibt.
- Despia-Doku ([Structure](https://setup.despia.com/best-practices/frontend/structure), [Prevent Autoscroll](https://setup.despia.com/native-features/prevent-autoscroll)) empfiehlt eine **Root-Frame-Architektur** (`position: fixed; top/left/right/bottom:0; display:flex; flex-direction:column; overflow:hidden`) statt `100vh`. Innerhalb läuft Content-Bereich mit `flex:1; overflow-y:auto`. PWA-Fallback: `env(safe-area-inset-*)`.
- Despia-Native lässt die WebView Inputs automatisch hochschieben (Autoscroll bleibt `enabled=true`, wie zuletzt gefixt). PWA/Browser hat das nicht → wir brauchen `visualViewport`-basiertes JS-Avoidance + `scrollIntoView` beim Fokus.

## Änderungen

### 1. `src/App.css` und `src/index.css` — dvh statt vh
- Ersetze `min-height: 100vh` auf `#root` (App.css Zeile 4) und auf `body` (index.css Zeile 260) durch `min-height: 100dvh`.
- Zusätzlich `html, body { min-height: 100dvh; }` und keine `height: 100vh` mehr in globalen Styles.

### 2. Globale CSS-Variable für Keyboard-Inset (`src/index.css`)
- Neue CSS-Var `--keyboard-inset: 0px` auf `:root`. Wird vom neuen JS-Hook (siehe 5.) bei Tastatur live gesetzt.
- Utility-Klasse `.kb-safe-bottom { padding-bottom: calc(var(--keyboard-inset) + env(safe-area-inset-bottom, 0px)); }` für fixe Footer/Bottom-Nav.

### 3. AppShell auf Despia-Frame-Architektur umstellen (`src/components/layout/AppShell.tsx`)
- Mobiler Wrapper (Zeile 24): `min-h-screen` → `min-h-[100dvh] flex flex-col` (keine festen Höhen, scrollt natürlich).
- Desktop-Branch (`md:h-screen md:overflow-hidden`) **unverändert** lassen → keine Desktop-Regression.

### 4. Fixed-Footer / Bottom-Nav prüfen und mit Keyboard-Inset versehen
- Suche nach Komponenten mit `fixed bottom-0` / Bottom-Nav / `ChatComposer`-ähnlichen Footern. Diese erhalten `style={{ paddingBottom: 'calc(var(--keyboard-inset) + env(safe-area-inset-bottom, 0px))' }}` **oder** werden während Tastatur via `translateY(calc(-1 * var(--keyboard-inset)))` angehoben.
- Konkret betroffen: `src/components/layout/MobileBottomNav.tsx` (falls vorhanden), `src/components/chat/ChatComposer.tsx` (padding-bottom-Berechnung erweitern um `--keyboard-inset`).

### 5. Neuer globaler Hook + Mount (`src/hooks/useVisualViewportInset.ts`, in `src/main.tsx` oder `App.tsx` einmalig)
- Liest `window.visualViewport.height/offsetTop` mit `requestAnimationFrame`-Throttling.
- Berechnet `bottomInset = max(0, window.innerHeight - (vv.height + vv.offsetTop))`.
- Schreibt das Ergebnis in `document.documentElement.style.setProperty('--keyboard-inset', bottomInset + 'px')`.
- In Despia-Native: Hook bleibt aktiv, aber `bottomInset` bleibt 0 (native Autoscroll macht den Job, `visualViewport` meldet nichts) → keine Doppellogik nötig.
- Cleanup auf `visualViewport.removeEventListener('resize'|'scroll')`.

### 6. Auto-`scrollIntoView` beim Input-Fokus (`src/hooks/useFocusScrollIntoView.ts`, einmalig gemountet)
- Globaler `focusin`-Listener prüft, ob `event.target` ein editierbares Element ist (`INPUT`, `TEXTAREA`, `[contenteditable]`).
- Nach ~150 ms (damit `visualViewport` Zeit hat zu resizen) ruft `target.scrollIntoView({ block: 'center', behavior: 'smooth' })` — aber nur, wenn `bottomInset > 0` (also Tastatur offen) und Element nicht bereits im sichtbaren Bereich liegt.
- Wird in Despia-Native früh aus dem Listener heraus skippt (`isDespiaNative()` → return), weil dort die native Autoscroll-Logik greift.

### 7. Auth-Seite scrollbar machen (`src/pages/Auth.tsx`)
- Zeile 504: `min-h-screen flex flex-col items-center justify-center` ist auf Mobile bei offener Tastatur ein Problem (Inhalt zentriert, statt zu scrollen).
- Ergänzung Mobile: `overflow-y-auto`, `justify-start` mobil (Desktop bleibt `sm:justify-center`). Der äußere `overflow-hidden` (Zeile 490) wird auf Mobile entfernt: `overflow-hidden` → `sm:overflow-hidden`.

### 8. Welcome-Flow / weitere Form-Seiten kurz prüfen
- `src/components/welcome/WelcomeFlow.tsx`, `src/pages/PersonalInfo.tsx`, `src/pages/CreateTicket.tsx`, `src/pages/Tickets.tsx`, `src/pages/Feedback.tsx`, `src/components/forms/MultiStepContactForm.tsx`, `MultiStepYesNoForm.tsx`, `SubmissionForm.tsx`: wo `min-h-screen` ohne `overflow-y-auto` auf einem Flex-Wrapper sitzt, denselben Fix (`overflow-y-auto`, `justify-start` mobil, dvh statt vh) anwenden. Keine Designänderungen.

### 9. Despia-Verhalten unangetastet lassen
- `src/lib/despiaKeyboard.ts` bleibt wie zuletzt (sendet `autoscroll?enabled=true`). Hook aus Punkt 5/6 sind PWA-/Browser-only-wirksam: in Despia liefert `visualViewport` keine Keyboard-Höhe → `--keyboard-inset` bleibt 0, `scrollIntoView` greift nicht.

## Akzeptanzkriterien-Mapping

1. **Tastatur überdeckt keine Inputs**: `visualViewport`-Inset + `scrollIntoView` (PWA/Browser) + native Despia-Autoscroll (App).
2. **Layout springt nicht**: `dvh` + `flex-col` + globaler `--keyboard-inset` (kontinuierlich) statt diskreter Sprünge.
3. **Browser + installierte Web-App**: `dvh` (modern) + `visualViewport` (PWA-fähig) decken beide ab.
4. **Keine Desktop-Regression**: Desktop-Branches (`md:*`, `sm:*`) und Desktop-Layouts in AppShell/Auth bleiben strukturell unverändert; neue Hooks sind no-op ohne Tastatur.

## Dateien (geplant)

- `src/App.css`, `src/index.css` — vh → dvh, `--keyboard-inset`, `.kb-safe-bottom`.
- `src/components/layout/AppShell.tsx` — Mobile-Wrapper auf `min-h-[100dvh] flex flex-col`.
- `src/components/chat/ChatComposer.tsx` — padding-bottom-Formel um `--keyboard-inset` erweitern.
- `src/pages/Auth.tsx` — mobile `overflow-y-auto` / `justify-start`.
- `src/hooks/useVisualViewportInset.ts` (neu).
- `src/hooks/useFocusScrollIntoView.ts` (neu).
- `src/App.tsx` — beide Hooks einmalig im Root mounten.
- Kleinere Anpassungen in den unter Punkt 8 genannten Form-Seiten.
