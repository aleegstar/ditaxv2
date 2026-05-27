## Ziel
Den Chat in der Despia-App so umbauen, dass der Input oberhalb der Tastatur bleibt und der Aufbau der offiziellen Despia-Empfehlung entspricht.

## Wahrscheinliche Ursache
Die aktuelle Chat-Lösung verlässt sich in Despia auf eigene `visualViewport`-/`innerHeight`-Berechnung und rendert den Composer zusätzlich per Portal als `fixed`-Overlay an `document.body`.
Das passt nicht sauber zu Despias empfohlenem Fixed-Frame-Layout.

Aus dem aktuellen Stand:
- `src/hooks/useKeyboardDetection.ts` nutzt in Despia bewusst **nur** `visualViewport`/`layoutInset` und setzt den Fallback auf `0`.
- `src/components/chat/ChatComposer.tsx` positioniert den Input per `translate3d(...)` als globales Fixed-Element.
- `src/pages/Chat.tsx` arbeitet mit manuellem `composerReserve` statt mit einem echten Footer-Frame.
- Despia empfiehlt dagegen eine feste App-Struktur mit `app-root` + scrollbarem Content + echtem Footer; diese Struktur soll bei Keyboard-Anzeige automatisch mitgehen.

## Umsetzung
1. **Chat-Layout auf Despia-Frame-Struktur umstellen**
   - `src/pages/Chat.tsx` auf echten 3-Zonen-Aufbau umbauen:
     - fixer Root-Frame
     - Header (`flex-shrink-0`)
     - Nachrichtenbereich (`flex-1 overflow-y-auto`)
     - Composer als echter Footer statt Portal-Overlay
   - Safe-Area unten direkt per CSS-Variablen von Despia einrechnen.

2. **Portal-/Transform-Positionierung im Composer entfernen**
   - `src/components/chat/ChatComposer.tsx` so vereinfachen, dass der Composer normal im Layoutfluss des Footers lebt.
   - Keine manuelle `viewportBottom`- oder `composerTop`-Berechnung mehr für die eigentliche Platzierung.
   - Textarea-Autogrow, File-Upload und Escalation-UI bleiben erhalten.

3. **Keyboard-Hook auf Doku-konforme Rolle reduzieren**
   - `src/hooks/useKeyboardDetection.ts` nur noch für optionale Zustände/Finetuning verwenden, nicht mehr als primäre Positionierungsquelle.
   - Falls nach dem Umbau in Despia noch Sonderfälle bleiben, baue ich einen kleinen Despia-spezifischen Fallback ein, aber erst nach dem strukturellen Fix.

4. **Safe-Area-/Root-Container prüfen und angleichen**
   - Sicherstellen, dass Chat und ggf. globale Container nicht gegen das Despia-Muster arbeiten (`min-h-screen`/`100vh`-Annahmen, zusätzliche Wrapper, Body-Fixes).
   - Bestehende Despia-Safe-Area-Variablen weiterverwenden, aber ohne doppelte oder widersprüchliche Offsets.

5. **Validierung nach Umbau**
   - Verhalten gegen die Despia-Doku abgleichen.
   - Prüfen, dass Web/Chrome Android nicht regressiert.
   - Gezielt auf Despia-Fall achten: Fokus ins Textfeld, Tastatur auf, Input sichtbar, Nachrichtenbereich weiterhin scrollbar.

## Technische Referenz aus der Doku
- **`/native-features/prevent-autoscroll`**: `preventdefault://autoscroll?enabled=false` gibt der Web-App die volle Kontrolle; die native Ebene verschiebt dann den WebView nicht mehr.
- **`/best-practices/frontend/structure`**: Despia empfiehlt ein **fixed frame structure** mit Root-Frame, scrollbarem Content und Footer; diese Struktur soll sich bei Keyboard-Anzeige korrekt verhalten.
- **`/native-features/safe-areas`**: feste/sticky Elemente sollen die von Despia injizierten CSS-Variablen `--safe-area-*` direkt nutzen.

## Erwartetes Ergebnis
Nach dem Umbau sitzt der Chat-Input in Despia nicht mehr als separat berechnetes Overlay über dem Screen, sondern als echter Footer im empfohlenen Layout. Dadurch soll er oberhalb der Tastatur bleiben, statt von ihr überdeckt zu werden.