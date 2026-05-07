## Problem

Beim Öffnen einer abgeschlossenen Sektion (Einkommen / Abzüge / Vermögen) sieht man kurz das Ja/Nein-Formular, bevor die Zusammenfassung erscheint. Ursache: `MultiStepYesNoForm` initialisiert `viewState.showSummary` immer mit `false`. Erst nach dem ersten Render entscheidet ein `useEffect`, ob die Sektion abgeschlossen ist, und schaltet dann auf die Zusammenfassung um. Dasselbe Flackern tritt beim Zurücknavigieren auf, sobald die Komponente neu gemountet wird.

## Lösung

`MultiStepYesNoForm.tsx` so anpassen, dass der Anfangszustand bereits korrekt gesetzt wird, bevor irgendetwas gerendert wird:

1. **Lazy-Initialisierung von `useReducer` und `useState`** anhand von `formProgress[section]`:
   - Wenn die Sektion bereits abgeschlossen ist (`formProgress[section] === true`), startet `viewState` direkt mit `showSummary: true` und `formState.currentQuestionIndex` mit `questions.length - 1`.
   - Sonst wie bisher (Position aus `questionProgress[section]` oder `0`).

2. **Render-Gate, bis FormContext bereit ist**: Solange `formData`/`formProgress` noch geladen werden (`isDataLoading` / `formDataLoaded` aus `FormContext`), nichts rendern (oder konsistenten leeren Zustand). Damit wird verhindert, dass das Ja/Nein-UI angezeigt wird, bevor wir wissen, ob die Sektion abgeschlossen ist.

3. **Initial-Check-`useEffect` aufräumen**: Den bisherigen Effect, der `dispatchViewState({ type: 'SET_SUMMARY', show: true })` zeitversetzt aufruft, entfernen — er ist durch die Lazy-Initialisierung obsolet und Quelle des doppelten Renderns.

4. **Daten-Lade-Effect frühzeitig synchron befüllen**: `answers` und `repeaterData` ebenfalls per Lazy-Init in `useState` setzen, damit die Zusammenfassung beim allerersten Render bereits Inhalte hat (kein zweites Render mit leerer Liste).

5. **Zurück-Verhalten** bleibt wie zuletzt eingebaut: Aus der Zusammenfassung führt der Header-Back direkt zu `/personal-info?year=…` — kein Wechsel zurück in den Q&A-Modus, also auch kein Flicker beim Zurückgehen.

## Betroffene Datei

- `src/components/forms/multistep/MultiStepYesNoForm.tsx`

## Technische Details

- `useReducer(formViewReducer, undefined, () => ({ showRepeater: false, showSummary: !!formProgress[section], isEditing: false, editingQuestionId: null }))`
- `useState<MultiStepFormState>(() => { … sectionData ableiten, currentQuestionIndex setzen … })`
- `if (isDataLoading || !formDataLoaded) return null;` direkt nach den Hook-Aufrufen
- Initial-Check-Effect (Zeilen ~199–231) entfernen oder auf reines Logging reduzieren

## Akzeptanzkriterien

- Klick auf eine abgeschlossene Sektion zeigt sofort die Zusammenfassung, kein Aufblitzen der Ja/Nein-Frage.
- Zurück aus der Zusammenfassung navigiert direkt nach `/personal-info` ohne Zwischenflash.
- Nicht abgeschlossene Sektionen verhalten sich unverändert (Q&A startet an gespeicherter Position).