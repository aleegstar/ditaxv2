
# Fix: tax_filer_id wird nicht an den Upload weitergegeben

## Das Problem (bewiesen durch Netzwerk-Logs)

Die Netzwerk-Requests zeigen das Problem glasklar:

```text
INSERT uploaded_documents: "tax_filer_id": null     <-- Upload speichert NULL
GET uploaded_documents:    tax_filer_id=eq.becd4bd4  <-- Reload sucht nach becd4bd4
```

Das Dokument wird erfolgreich in die Datenbank geschrieben, aber mit `tax_filer_id = null`. Die anschliessende Abfrage filtert nach `tax_filer_id = becd4bd4-...` und findet das neue Dokument daher nicht. Deshalb wird die Checkliste nicht aktualisiert -- das Dokument ist "unsichtbar".

## Ursache

Obwohl `activeTaxFilerId` im letzten Fix als Prop an `DocumentUploadSheet` weitergegeben wird, kommt es dort als `undefined` an. Das liegt daran, dass `useTaxFiler()` in `DocumentChecklist.tsx` den Wert aus dem Context holt, aber der Wert zum Zeitpunkt des Renderns noch nicht gesetzt sein kann (Race Condition beim Context-Mount).

Zusaetzlich gibt es ein zweites Problem: Die `taxFilerId`-Prop wird in `DocumentUploadSheet` nur in `performUpload` verwendet, aber `performUpload` ist ein `useCallback` mit einer Closure die den **initialen** Wert von `taxFilerId` einfaengt. Wenn sich `taxFilerId` spaeter aendert (z.B. weil der Context erst spaeter initialisiert), hat `performUpload` immer noch `null`.

## Loesung

Zwei einfache Fixes:

### 1. `DocumentUploadSheet.tsx` -- taxFilerId ueber useRef aktuell halten

Statt den Prop direkt im `useCallback` zu verwenden, wird ein `useRef` genutzt, der immer den aktuellsten Wert hat:

```typescript
const taxFilerIdRef = useRef(taxFilerId);
useEffect(() => { taxFilerIdRef.current = taxFilerId; }, [taxFilerId]);

// In performUpload:
const activeTaxFilerId = taxFilerIdRef.current || null;
```

### 2. `DocumentChecklist.tsx` -- Fallback auf sessionStorage

Falls `activeTaxFilerId` aus dem Context undefined/null ist, wird ein Fallback auf `sessionStorage` verwendet (dort speichert der TaxFilerContext den Wert):

```typescript
const { activeTaxFilerId } = useTaxFiler();
const effectiveTaxFilerId = activeTaxFilerId
  || sessionStorage.getItem('ditax_selected_tax_filer')
  || null;
```

## Aenderungen

| Datei | Aenderung |
|-------|-----------|
| `src/components/documents/DocumentUploadSheet.tsx` | `taxFilerId` in useRef speichern, useRef in performUpload verwenden |
| `src/components/DocumentChecklist.tsx` | Fallback auf sessionStorage fuer taxFilerId |

## Warum das funktioniert

```text
VORHER:
  1. DocumentChecklist rendert, activeTaxFilerId = undefined (Context laedt)
  2. DocumentUploadSheet bekommt taxFilerId = undefined
  3. performUpload Closure fängt undefined ein
  4. Upload: tax_filer_id = null
  5. Reload sucht nach becd4bd4 -> findet das neue Dokument NICHT

NACHHER:
  1. DocumentChecklist rendert, activeTaxFilerId = becd4bd4 (oder Fallback aus sessionStorage)
  2. DocumentUploadSheet bekommt taxFilerId = becd4bd4
  3. taxFilerIdRef.current = becd4bd4 (immer aktuell)
  4. Upload: tax_filer_id = becd4bd4
  5. Reload sucht nach becd4bd4 -> findet das neue Dokument
```
