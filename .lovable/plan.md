
# Problem: Tour startet zu spät (800ms + bis zu 3s zusätzlich)

## Ursachen im Detail

### Ursache 1: Fixer 800ms Delay vor jeder Prüfung
In `OnboardingTourContext.tsx` Zeile 284:
```typescript
const timer = setTimeout(checkTourConditions, 800);
```
Dieser Delay ist immer aktiv — unabhängig davon, ob alle Daten schon bereit sind.

### Ursache 2: `waitForElements` bis zu 3 Sekunden
Die Schleife prüft bis zu 15 Mal mit 200ms Pause = **3 Sekunden** Wartezeit im Worst Case. Für den normalen Start ist das viel zu aggressiv.

### Ursache 3: `tourCompleted` braucht separaten Supabase-Call
Die Tour wartet bis `tourCompleted !== null` (Zeile 237). Das setzt einen eigenen `getUser()` Call voraus, der erst nach Auth getriggert wird — aber async, also verzögert.

### Kombinierter Worst-Case-Ablauf:
```
Auth: isLoading → false           (~0ms)
checkTourCompletionStatus()       (+200-500ms, async Supabase)
tourCompleted state update        (+React render cycle)
setTimeout 800ms                  (+800ms fixer Delay)
waitForElements: 15x 200ms        (bis zu +3000ms)
───────────────────────────────────────────────
TOTAL: bis zu 4+ Sekunden Wartezeit
```

## Lösung: Drei Optimierungen

### Fix 1: 800ms → 0ms (sofortiger Start)
Den `setTimeout` auf **0ms** reduzieren. Die Tour soll sofort prüfen, sobald alle Conditions erfüllt sind — nicht künstlich verzögert.

```typescript
// VORHER
const timer = setTimeout(checkTourConditions, 800);

// NACHHER  
const timer = setTimeout(checkTourConditions, 0);
```

### Fix 2: `waitForElements` aggressiver und kürzer
Max Attempts von 15 auf **8** reduzieren, Interval von 200ms auf **150ms**. Das gibt maximal 1.2 Sekunden statt 3 Sekunden — ausreichend für langsames DOM-Rendering.

```typescript
// VORHER
const maxAttempts = isManualStartMode ? 4 : 15;
// ...
await new Promise(resolve => setTimeout(resolve, 200));

// NACHHER
const maxAttempts = isManualStartMode ? 3 : 8;
// ...
await new Promise(resolve => setTimeout(resolve, 150));
```

### Fix 3: `tourCompleted` parallel zur Auth laden
Derzeit wird `checkTourCompletionStatus()` sequenziell **nach** Auth gestartet. Der Call soll direkt beim Mount ausgeführt werden (nicht erst wenn `isValid` true ist), sobald irgendeine Session vorhanden ist — der Wert wird dann gesetzt wenn er kommt.

Der `loadTourStatus` Effect soll sofort starten (ohne auf `isLoading=false` zu warten), aber trotzdem nur wenn `isValid` da ist:

```typescript
// VORHER: wartet auf isLoading=false
useEffect(() => {
  const loadTourStatus = async () => {
    if (!isValid || !userId || isLoading) return;
    ...
  };
  loadTourStatus();
}, [isValid, userId, isLoading]);

// NACHHER: startet sobald isValid & userId bekannt
useEffect(() => {
  const loadTourStatus = async () => {
    if (!isValid || !userId) return;
    // isLoading check entfernt — der Call darf parallel laufen
    ...
  };
  loadTourStatus();
}, [isValid, userId]); // isLoading aus deps entfernt
```

## Ergebnis

```
VORHER:
Auth fertig → +800ms → tourCompleted loaded → Tour prüft → waitForElements (bis 3s)
= bis zu 4+ Sekunden

NACHHER:
Auth fertig → tourCompleted parallel → Tour prüft sofort → waitForElements (max 1.2s)
= unter 1 Sekunde in den meisten Fällen
```

## Geänderte Datei

### `src/contexts/OnboardingTourContext.tsx`
1. Zeile 88: `maxAttempts` für auto-start: `15 → 8`
2. Zeile 145: Sleep-Interval: `200ms → 150ms`
3. Zeile 166: `isLoading` Bedingung aus `loadTourStatus` entfernen
4. Zeile 176: `isLoading` aus den useEffect-Dependencies entfernen
5. Zeile 284: `setTimeout` Delay: `800ms → 0ms`

Die Änderung ist minimal (5 Zeilen) und beseitigt alle unnötigen Wartezeiten ohne die bestehende Sicherheitslogik zu beeinflussen.
