# Plan: Despia Virtual-Keyboard korrekt anwenden

## Ziel
Den Chat so anpassen, dass der Input in der Despia-App beim Öffnen der Tastatur nicht mehr verdeckt wird und die Umsetzung sauber der Despia-Dokumentation zur Virtual-Keyboard-Adaption entspricht.

## Was ich ändern werde

1. **Keyboard-Strategie bereinigen**
   - Die aktuelle Umsetzung mischt zwei gegensätzliche Ansätze:
     - `preventdefault://autoscroll?enabled=false` gibt der Web-App die volle Keyboard-Kontrolle.
     - Der Chat nutzt inzwischen aber **kein aktives JS-Positioning mehr**, sondern verlässt sich auf das Despia-Fixed-Frame-Layout.
   - Ich stelle das auf **eine konsistente Strategie** um: entweder echte JS-Kontrolle mit Viewport-Inset-Handling oder reines Despia-Fixed-Frame-Verhalten ohne widersprüchliche globale Deaktivierung.

2. **Chat-Root exakt an Despia-Foundation-Pattern angleichen**
   - Root-Frame bleibt `position: fixed; inset: 0; display: flex; flex-direction: column; overflow: hidden`.
   - Header und Footer bleiben `flex-shrink-0`.
   - Der Nachrichtenbereich bleibt der einzige Scroll-Container mit `flex: 1` und `overflow-y: auto`.
   - Falls nötig, ergänze ich die von Despia empfohlene Safe-Area-Trennung noch sauberer, statt Safe-Areas nur indirekt über Padding einzurechnen.

3. **Globale Container/Wrappers auf Konflikte entschärfen**
   - Ich prüfe und korrigiere Wrapper wie `AppShell`, `min-h-screen`, `h-screen`, `overflow-y-auto`, damit der Chat nicht in einem zusätzlichen Layout-Kontext steckt, der das Keyboard-Verhalten in Despia stört.
   - Fokus: keine konkurrierenden Höhe-/Overflow-Annahmen oberhalb des Chat-Frames.

4. **Safe-Area- und Footer-Abstand doc-konform machen**
   - Footer/Composer werden konsequent an `--safe-area-bottom` gekoppelt.
   - Ich gleiche die Werte mit Despias Safe-Area-Empfehlungen ab, damit der Footer nicht optisch korrekt wirkt, aber technisch trotzdem im falschen Viewport-Kontext sitzt.

5. **Alte Keyboard-Hilfslogik entschlacken**
   - Nicht mehr benötigte oder widersprüchliche Logik in `useKeyboardDetection` / `despiaKeyboard` reduziere ich auf das, was für den finalen Ansatz wirklich gebraucht wird.
   - Ziel: keine halbaktive Keyboard-Erkennung, die nichts mehr positioniert, aber weiterhin globale Seiteneffekte auslöst.

6. **Validierung gegen Despia-Szenario**
   - Ich prüfe danach gezielt diesen Ablauf:
     - Chat in Despia öffnen
     - Input fokussieren
     - Keyboard erscheint
     - Composer bleibt sichtbar
     - Nachrichtenbereich bleibt scrollbar
     - Chrome/normaler Browser regressiert nicht

## Relevante Abweichung, die ich gefunden habe

- Laut Despia-Doku passt sich die App bei **korrekter Fixed-Frame-Struktur automatisch** an die virtuelle Tastatur an.
- Gleichzeitig sagt die Doku zu `preventdefault://autoscroll`, dass dies nur sinnvoll ist, wenn **die Web-App die Keyboard-Vermeidung selbst in JavaScript übernimmt**.
- Im aktuellen Code ist genau hier sehr wahrscheinlich der Widerspruch:
  - `src/main.tsx` initialisiert global `preventdefault://autoscroll?enabled=false`
  - `src/lib/despiaKeyboard.ts` dokumentiert noch explizit ein JS-gesteuertes Composer-Positioning
  - `src/components/chat/ChatComposer.tsx` nutzt dieses JS-Positioning aber inzwischen nicht mehr
  - `src/pages/Chat.tsx` verlässt sich bereits auf Footer-im-Layout

## Technische Details

**Betroffene Dateien**
- `src/main.tsx`
- `src/lib/despiaKeyboard.ts`
- `src/pages/Chat.tsx`
- `src/components/chat/ChatComposer.tsx`
- ggf. `src/components/layout/AppShell.tsx`
- ggf. `src/hooks/useKeyboardDetection.ts`

**Doc-Basis**
- `/best-practices/frontend/structure#virtual-keyboard-adaptation`
- `/native-features/prevent-autoscroll`
- `/native-features/safe-areas`

Wenn du freigibst, setze ich den Fix jetzt gezielt nach diesem Plan um.