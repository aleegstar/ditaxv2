

# Plan: Behebung des doppelten Tour-Anzeige-Bugs

## Problem-Analyse

Wenn die Anleitung aus dem Menue manuell gestartet wird, erscheint sie mehrfach. Die Ursache ist eine **Race Condition** im `OnboardingTourContext`:

1. **Menue-Klick**: `forceTour()` wird aufgerufen
2. **forceTour()** setzt `tourCompleted = false` und startet dann die Tour mit `setShowTour(true)`
3. **Gleichzeitig**: Der `useEffect` (Zeile 178-238) erkennt, dass `tourCompleted` sich geaendert hat zu `false`
4. **Auto-Start Logik**: Dieser Effect startet die Tour ebenfalls mit `setShowTour(true)`
5. **Ergebnis**: Die Tour wird durch **zwei verschiedene Code-Pfade** gleichzeitig gestartet

```text
                  +------------------+
                  |  Menue-Klick     |
                  +--------+---------+
                           |
                           v
                  +--------+---------+
                  |   forceTour()    |
                  +--------+---------+
                           |
          +----------------+----------------+
          |                                 |
          v                                 v
+-------------------+             +-------------------+
| setTourCompleted  |             | startTour() ->    |
| (false)           |             | setShowTour(true) |
+--------+----------+             +-------------------+
         |
         v (triggert useEffect)
+-------------------+
| Auto-Start Effect |
| setShowTour(true) |
+-------------------+
         |
         v
+-------------------+
| DOPPELTE ANZEIGE  |
+-------------------+
```

---

## Loesung

Eine **Sperre (Lock)** einbauen, die verhindert, dass der automatische Start-Effect die Tour startet, wenn sie manuell gestartet wurde.

---

## Technische Umsetzung

### Schritt 1: Flag fuer manuelle Aktivierung hinzufuegen

In `OnboardingTourContext.tsx`:

- Neuen State `isManualStart` hinzufuegen
- Wenn `forceTour()` aufgerufen wird, dieses Flag auf `true` setzen
- Im Auto-Start `useEffect`: Pruefen, ob `isManualStart === true` - wenn ja, nicht automatisch starten
- Nach erfolgreichem Tour-Start das Flag zuruecksetzen

### Schritt 2: Aenderung in OnboardingTourContext.tsx

```typescript
// Neuer State
const [isManualStart, setIsManualStart] = useState(false);

// Im Auto-Start useEffect (Zeile 178):
useEffect(() => {
  const checkTourConditions = async () => {
    // NEUE PRUEFUNG: Abbrechen wenn manuell gestartet
    if (isManualStart) {
      debug.log('Tour: Manual start active, skipping auto-check');
      return;
    }
    // ... rest des codes
  };
  // ...
}, [isValid, userId, isLoading, location.pathname, tourCompleted, isManualStart]);

// In forceTour():
const forceTour = async () => {
  setIsManualStart(true); // NEU: Flag setzen BEVOR tourCompleted geaendert wird
  
  // ... bestehender Code ...
  
  // Am Ende von startTour():
  setIsReady(true);
  setShowTour(true);
  setIsManualStart(false); // Flag zuruecksetzen
};
```

---

## Erwartetes Ergebnis

| Vorher | Nachher |
|--------|---------|
| Tour erscheint 2-3x | Tour erscheint genau 1x |
| Race Condition | Saubere Sequenz |

---

## Betroffene Dateien

| Datei | Aenderung |
|-------|-----------|
| `src/contexts/OnboardingTourContext.tsx` | Neuer `isManualStart` State + Logik |

---

## Alternative Betrachtung

Eine weitere Ursache koennte sein, dass der User auf `/auth` navigiert wird, wenn er die Tour startet (laut Session-Replay). Falls dies der Fall ist, muesste auch geprueft werden, ob der Navigation-Flow korrekt ist. Die primaere Ursache ist jedoch die Race Condition.

