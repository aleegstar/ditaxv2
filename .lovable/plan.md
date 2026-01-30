

# Plan: Bug-Fix - Falsches Steuerjahr beim Dokument-Upload

## Problem

Beim Hochladen von Dokumenten über die `/documents`-Seite wird das aktuelle Systemjahr (2026) statt des in der URL angegebenen Jahres (z.B. 2024) verwendet.

## Ursache

In `src/pages/Documents.tsx` (Zeile 718-719):
```tsx
const currentYear = new Date().getFullYear();  // = 2026
const [selectedYear, setSelectedYear] = useState<string>(currentYear.toString());
```

Der URL-Parameter `?year=2024` wird komplett ignoriert! Das Steuerjahr wird immer auf das aktuelle Systemjahr gesetzt.

## Auswirkung

| Aktion | Erwartetes Ergebnis | Tatsächliches Ergebnis |
|--------|---------------------|------------------------|
| User öffnet `/documents?year=2024` | `selectedYear = "2024"` | `selectedYear = "2026"` |
| User lädt Dokument hoch | `tax_year = "2024"` | `tax_year = "2026"` |
| User erwartet Dokument bei 2024 | Sichtbar | Nicht sichtbar |

## Lösung

### Schritt 1: URL-Parameter auslesen und als Default verwenden

```tsx
// In src/pages/Documents.tsx, Documents Komponente
const Documents: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { hasMultipleFilers, selectionConfirmed } = useTaxFiler();
  
  // NEU: URL-Parameter hat Priorität
  const yearFromUrl = searchParams.get('year');
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<string>(
    yearFromUrl || currentYear.toString()
  );
  
  // ... rest bleibt gleich
```

### Schritt 2: URL synchron halten bei Jahreswechsel

```tsx
// Year-Change Handler aktualisiert auch die URL
const handleYearChange = (newYear: string) => {
  setSelectedYear(newYear);
  navigate(`/documents?year=${newYear}`, { replace: true });
};
```

## Betroffene Dateien

| Datei | Änderung |
|-------|----------|
| `src/pages/Documents.tsx` | URL-Parameter für `selectedYear` Initial-Wert verwenden |

## Technische Details

| Aspekt | Vorher | Nachher |
|--------|--------|---------|
| Default-Jahr | `new Date().getFullYear()` | `searchParams.get('year') \|\| new Date().getFullYear()` |
| URL-Sync | Keine | URL wird bei Jahreswechsel aktualisiert |

## Erwartetes Ergebnis

1. User navigiert zu `/documents?year=2024`
2. `selectedYear` wird auf "2024" gesetzt
3. User lädt Dokument hoch
4. Dokument wird mit `tax_year = "2024"` gespeichert
5. Dokument erscheint korrekt bei Steuerjahr 2024

## Vorhandene Dokumente korrigieren

Die bereits falsch hochgeladenen Dokumente (Leano's Dokumente mit `tax_year = 2026`) müssen manuell korrigiert werden:

```sql
UPDATE uploaded_documents 
SET tax_year = '2024' 
WHERE tax_filer_id = 'a1454d06-xxxx-xxxx-xxxx-xxxxxxxxxxxx' 
AND tax_year = '2026';
```

