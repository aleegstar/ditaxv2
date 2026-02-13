
# Fix: Steuerjahr wechselt beim Zurücknavigieren von der Dokumentencheckliste

## Problem
In `DocumentChecklist.tsx` fehlt bei der "Zurück"-Navigation der `year`-Parameter in der URL. Dadurch landet man auf `/form?section=deductions` ohne Jahresangabe. Die Index-Seite fällt dann auf `new Date().getFullYear()` (= 2026) zurück, statt das gewählte Jahr 2025 beizubehalten.

## Lösung
Eine einzeilige Korrektur in `src/components/DocumentChecklist.tsx`:

**Zeile 90 ändern von:**
```
const handleBack = () => { navigate('/form?section=deductions'); };
```
**zu:**
```
const handleBack = () => { navigate(`/form?section=deductions&year=${taxYear}`); };
```

Die Variable `taxYear` ist bereits über `useFormContext()` verfügbar (Zeile 37), es sind keine weiteren Änderungen nötig.

## Technische Details
- **Datei:** `src/components/DocumentChecklist.tsx`, Zeile 90
- **Ursache:** `handleBack` navigiert ohne `year`-Parameter, Index.tsx verwendet `new Date().getFullYear()` als Fallback
- **Umfang:** 1 Zeile in 1 Datei
