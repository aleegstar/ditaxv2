

## Plan: Race Condition beim Login mit mehreren Steuerpflichtigen beheben

### Problem
Wenn sich ein User mit mehreren Tax-Filern anmeldet, gibt es einen kurzen Moment, in dem `TaxFilerGate` die Route freigibt, obwohl die Filer-Daten noch nicht geladen sind:

1. Auth resolves: `userId=null, isLoading=false` (kein Session beim Start)
2. Reset-Effect setzt `taxFilers=[], isLoading=false`
3. User loggt sich ein → `userId` wird gesetzt
4. **Render passiert BEVOR der `loadTaxFilers`-Effect läuft** → Gate sieht `isLoading=false`, `hasMultipleFilers=false` (0 Filer) → lässt Dashboard durch
5. Effect läuft → `isLoading=true` → Filer laden → Redirect zu `/select-person`

In Schritt 4 wird kurz das leere Dashboard angezeigt.

### Lösung

**2 Dateien anpassen:**

**1. `src/contexts/TaxFilerContext.tsx`** — `dataFetched` Flag einführen
- Neuen State `dataFetched: boolean` (startet als `false`)
- Wird erst auf `true` gesetzt nachdem `loadTaxFilers` erfolgreich abgeschlossen hat
- Reset auf `false` bei Logout (wenn userId null wird)
- Diesen Wert über den Context exportieren

**2. `src/components/guards/TaxFilerGate.tsx`** — Gate wartet auf `dataFetched`
- Zusätzlich `dataFetched` aus dem Context lesen
- Loading-Spinner auch anzeigen wenn `!dataFetched && userId` (User ist eingeloggt, aber Daten noch nicht geladen)
- Bestehende Safety-Timeout-Logik greift weiterhin als Fallback

### Technische Details

```text
Vorher (Gate-Logik):
  isLoading=false → prüfe hasMultipleFilers → false → render children ❌

Nachher (Gate-Logik):
  isLoading=false BUT dataFetched=false AND userId exists → show spinner ✅
  dataFetched=true AND hasMultipleFilers=true → redirect /select-person ✅
```

Das `dataFetched` Flag verhindert, dass der Gate zwischen "Auth fertig" und "Filer geladen" die Route freigibt.

