

## Automatischer Logout nach 20 Minuten Inaktivitaet

### Aktueller Stand
- Der Idle-Timer ist bereits implementiert, steht aber auf **30 Minuten**
- Es gibt eine `IdleWarningDialog`-Komponente, die aber **nirgends eingebunden** ist
- Der User wird ohne Vorwarnung ausgeloggt

### Aenderungen

**1. Timeout auf 20 Minuten aendern**
- In `src/hooks/use-auth-validation.ts`: `timeout: 30 * 60 * 1000` wird zu `timeout: 20 * 60 * 1000`

**2. Warnung 2 Minuten vor Logout anzeigen**
- In `use-auth-validation.ts`: Den `onWarning`-Callback und `warningTime` an `useIdleTimer` uebergeben, sodass ab Minute 18 ein Countdown-Dialog erscheint
- `showWarning` wird auf `true` gesetzt, wenn die Warnung ausgeloest wird

**3. IdleWarningDialog einbinden**
- In der Hauptlayout-Komponente (z.B. `App.tsx` oder dem Layout, das geschuetzte Routen umschliesst) wird `IdleWarningDialog` mit den Werten aus `idleState` gerendert
- Der User kann ueber den Button "Session verlaengern" den Timer zuruecksetzen

### Technische Details

| Datei | Aenderung |
|-------|-----------|
| `src/hooks/use-auth-validation.ts` | Timeout 30min auf 20min, `onWarning` + `warningTime: 18 * 60 * 1000` hinzufuegen, `showWarning` korrekt setzen |
| Layout-Komponente (zu ermitteln) | `IdleWarningDialog` importieren und rendern |

