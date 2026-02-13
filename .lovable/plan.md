
## Fix: Endlos-Ladeschleife beim Navigieren zu Kontaktangaben

### Ursache (neu identifiziert)

Die bisherigen Safety-Timeouts (10s in FormContext, 8s in TaxFilerGate) greifen nicht, weil das Problem woanders liegt: in der **`checkImportNeeded`-Logik in Index.tsx**.

Der Ablauf nach Tour-Abschluss:

```text
Tour abgeschlossen
  --> supabase.auth.updateUser() 
  --> onAuthStateChange (USER_UPDATED)
  --> FormContext: setSession(newSession)
  --> hasDataForPreviousYear wird neu erstellt (haengt von session ab)
  --> checkImportNeeded-Effect re-triggered (haengt von hasDataForPreviousYear ab)
  --> setCheckingImport(true) --> LoadingSpinner angezeigt
  --> Supabase-Abfrage startet
  --> Weiterer Auth-Event (TOKEN_REFRESHED) kommt
  --> session aendert sich erneut
  --> hasDataForPreviousYear erneut neu erstellt
  --> checkImportNeeded-Effect re-triggered WAEHREND die vorherige Abfrage noch laeuft
  --> setCheckingImport(true) --> Spinner bleibt
  --> Endlosschleife wenn Auth-Events kaskadieren
```

Zusaetzlich: `updateFormProgress` erstellt bei JEDEM Aufruf ein neues Objekt, auch wenn der Wert sich nicht aendert. Da `formProgress` auch eine Dependency von `checkImportNeeded` ist, kann das zusaetzliche Retriggers verursachen.

### Loesung (3 Aenderungen)

**1. `hasDataForPreviousYear` stabilisieren** (FormContext.tsx)

Session ueber einen Ref nutzen statt als Dependency, damit sich die Callback-Referenz nicht bei jedem Auth-Event aendert.

**2. `updateFormProgress` optimieren** (FormContext.tsx)

Nur neues Objekt erstellen wenn sich der Wert tatsaechlich aendert. Verhindert unnoetige Re-Renders in der gesamten App.

```text
// Vorher:
setFormProgress(prev => ({
  ...prev,
  [section]: completed
}));

// Nachher:
setFormProgress(prev => {
  if (prev[section] === completed) return prev;
  return { ...prev, [section]: completed };
});
```

**3. `checkImportNeeded` absichern** (Index.tsx)

- Cancelled-Flag hinzufuegen damit veraltete async-Aufrufe ignoriert werden
- Safety-Timeout (5s) fuer `checkingImport` hinzufuegen als letzte Absicherung

```text
useEffect(() => {
  let cancelled = false;

  const checkImportNeeded = async () => {
    // ... bestehende Early-Returns ...
    
    setCheckingImport(true);
    try {
      const hasData = await hasDataForPreviousYear(sectionKey);
      if (!cancelled) setShowImportWizard(hasData);
    } catch (error) {
      if (!cancelled) setShowImportWizard(false);
    } finally {
      if (!cancelled) setCheckingImport(false);
    }
  };
  
  checkImportNeeded();
  
  // Safety timeout
  const timer = setTimeout(() => {
    if (!cancelled) setCheckingImport(false);
  }, 5000);
  
  return () => { cancelled = true; clearTimeout(timer); };
}, [section, formProgress, hasDataForPreviousYear]);
```

### Betroffene Dateien

- `src/contexts/form/FormContext.tsx` - `hasDataForPreviousYear` mit sessionRef stabilisieren + `updateFormProgress` optimieren
- `src/pages/Index.tsx` - `checkImportNeeded` mit Cancel-Logic und Safety-Timeout absichern
