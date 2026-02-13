

## Fix: Endlos-Ladeschleife auf /form verhindern

### Problem

Nach dem Durchlaufen der Touren (Startseite + /form) friert die App manchmal ein, wenn man Kontaktangaben erfassen will. Ein weisser Bildschirm mit blauem Spinner wird angezeigt und laedt endlos.

### Ursache

Es gibt mehrere unabhaengige Lade-Gates zwischen App-Level und Formular-Ebene. Wenn eines davon steckenbleibt, sieht der User einen endlosen Spinner:

1. **TaxFilerGate** (App.tsx) - wartet auf TaxFilerContext.isLoading
2. **Index.tsx** - eigene Auth- und TaxFiler-Pruefungen mit 8s Safety-Timeout
3. **FormContext** - wartet auf sessionLoaded UND activeTaxFilerId UND !isTaxFilerLoading
4. **TaxYearDashboard** - wartet auf formDataLoaded

Das Hauptproblem: **FormContext hat keinen Safety-Timeout**. Wenn eine der Bedingungen nie erfuellt wird (z.B. durch Timing-Probleme bei Auth-State-Changes nach Tour-Abschluss), bleibt `formDataLoaded` fuer immer `false`.

Zusaetzlich: Die `updateUser`-Aufrufe beim Tour-Abschluss loesen Auth-State-Changes aus, die wiederum `loadTaxFilers` und `loadFormDataFromDatabase` re-triggern koennen - ein Timing-Problem auf mobilen Geraeten.

### Loesung

**1. Safety-Timeout in FormContext** (Datei: `src/contexts/form/FormContext.tsx`)

Einen 10-Sekunden-Timeout hinzufuegen, der `formDataLoaded = true` erzwingt, wenn die Daten nicht geladen werden konnten. Das verhindert, dass die UI endlos im Ladezustand haengenbleibt.

```text
// Neuer useEffect nach dem Initial-Load-Effect (nach Zeile ~1117):
useEffect(() => {
  if (formDataLoaded) return;
  
  const timer = setTimeout(() => {
    if (!formDataLoaded) {
      console.warn('Safety timeout: formDataLoaded forced to true after 10s');
      setFormDataLoaded(true);
    }
  }, 10000);
  
  return () => clearTimeout(timer);
}, [formDataLoaded]);
```

**2. Safety-Timeout in TaxFilerGate** (Datei: `src/components/guards/TaxFilerGate.tsx`)

Einen 8-Sekunden-Timeout hinzufuegen, damit die Gate nicht endlos blockiert:

```text
const [safetyTimeout, setSafetyTimeout] = useState(false);

useEffect(() => {
  if (!isLoading) return;
  const timer = setTimeout(() => setSafetyTimeout(true), 8000);
  return () => clearTimeout(timer);
}, [isLoading]);

// Ladebedingung aendern:
if (isLoading && !safetyTimeout) {
  return <LoadingSpinner fullScreen />;
}
```

**3. FormContext: Fallback wenn activeTaxFilerId fehlt** (Datei: `src/contexts/form/FormContext.tsx`)

Wenn nach 5 Sekunden kein `activeTaxFilerId` vorhanden ist aber die Session geladen wurde, Standarddaten setzen und `formDataLoaded = true`:

```text
// Im Initial-Load-Effect erweitern:
useEffect(() => {
  // Bestehende Logik...
  
  // Fallback: Wenn Session da ist aber kein TaxFiler nach 5s
  if (sessionLoaded && !activeTaxFilerId && !isTaxFilerLoading && !formDataLoaded) {
    console.warn('No activeTaxFilerId available, using defaults');
    setFormDataLoaded(true);
  }
}, [sessionLoaded, taxYear, activeTaxFilerId, formDataLoaded, loading, session, isTaxFilerLoading]);
```

### Betroffene Dateien
- `src/contexts/form/FormContext.tsx` - Safety-Timeout und Fallback fuer fehlenden TaxFiler
- `src/components/guards/TaxFilerGate.tsx` - Safety-Timeout hinzufuegen

