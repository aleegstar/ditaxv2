# Plan: Despia-Keyboard-Verhalten sauber auf `prevent-autoscroll` abstimmen

## Ziel
Das Keyboard in der Despia-App soll Eingabefelder nicht mehr verdecken. Dafür wird die App konsistent auf **eine** der beiden von Despia vorgesehenen Strategien ausgerichtet, statt aktuell gemischte Annahmen zu haben.

## Was ich anpassen werde

1. **Eine klare Keyboard-Strategie festziehen**
   - Die Despia-Doku zu `/native-features/prevent-autoscroll` sagt klar: `preventdefault://autoscroll?enabled=false` ist nur richtig, wenn die App das Keyboard-Verhalten selbst per JavaScript steuert.
   - Euer Code ist aktuell widersprüchlich:
     - `src/main.tsx` initialisiert globale Despia-Keyboard-Logik.
     - `src/lib/despiaKeyboard.ts` ist aktuell ein No-Op und behauptet native Auto-Anpassung.
     - `src/hooks/useKeyboardDetection.ts` misst aber weiterhin `visualViewport` und liefert echte Keyboard-Inset-Daten.
     - `src/components/chat/ChatComposer.tsx` kommentiert noch die alte Logik falsch.
   - Ich richte das jetzt auf **JS-gesteuerte Keyboard-Vermeidung mit aktiviertem `prevent-autoscroll=false`** aus, weil genau das zur zusätzlich gefundenen Doku passt.

2. **Despia-Initialisierung korrekt zurückbauen**
   - `src/lib/despiaKeyboard.ts` wieder so anpassen, dass in Despia beim App-Start tatsächlich `preventdefault://autoscroll?enabled=false` gesetzt wird.
   - Kommentare/Dokumentation im File korrigieren, damit kein falsches Architekturwissen mehr stehen bleibt.

3. **Chat wirklich keyboard-aware machen**
   - `src/pages/Chat.tsx` und `src/components/chat/ChatComposer.tsx` so anpassen, dass der Composer bzw. der Footer mit dem gemessenen `bottomInset` aus `useKeyboardDetection()` nach oben verschoben wird.
   - Dabei bleibt die bestehende Fixed-Frame-Struktur erhalten; ergänzt wird nur die echte JS-Positionierung für Despia.
   - Ich prüfe außerdem, ob zusätzlich der Message-Scroller unten Reserve braucht, damit letzte Nachrichten nicht unter Composer/Keyboard verschwinden.

4. **Inkonsistenzen in Kommentaren und Nebeneffekten bereinigen**
   - Veraltete Kommentare in `ChatComposer.tsx`, `despiaKeyboard.ts` und ggf. `main.tsx` bereinigen.
   - Prüfen, ob andere Konsumenten von `useKeyboardDetection()` (z. B. `useIntelligentNavbar`) weiter korrekt reagieren, wenn `prevent-autoscroll=false` global aktiv ist.

5. **Validierung**
   - Sicherstellen, dass das Verhalten in normalem Browser nicht regressiert.
   - Despia-spezifisch verifizieren: Fokus ins Textfeld, Keyboard öffnet, Composer bleibt sichtbar, Nachrichtenbereich bleibt nutzbar.

## Technische Details

**Zielbild laut Despia-Doku:**
- **Variante A:** native Fixed-Frame-Anpassung, **ohne** `prevent-autoscroll=false`
- **Variante B:** komplette JS-Steuerung, **mit** `prevent-autoscroll=false`

Der aktuelle Code liegt zwischen beiden Varianten. Ich stelle ihn auf **Variante B** um, weil:
- die neue Doku-Stelle das explizit so beschreibt,
- `useKeyboardDetection()` bereits vorhanden ist,
- und das eigentliche Problem genau danach klingt, dass der Footer zwar visuell fest ist, aber nicht aktiv mit dem Keyboard-Inset mitwandert.

```text
Despia App Start
  -> preventdefault://autoscroll?enabled=false
  -> visualViewport / inset messen
  -> Chat-Footer per bottomInset verschieben
  -> Scrollbereich behält sichtbaren Platz über Keyboard
```

## Betroffene Dateien
- `src/lib/despiaKeyboard.ts`
- `src/main.tsx`
- `src/hooks/useKeyboardDetection.ts` (falls kleine Bereinigung nötig)
- `src/pages/Chat.tsx`
- `src/components/chat/ChatComposer.tsx`

## Erwartetes Ergebnis
Beim Fokussieren des Chat-Eingabefelds in Despia bleibt der Composer sichtbar und sitzt direkt oberhalb des virtuellen Keyboards, statt darunter verdeckt zu werden.