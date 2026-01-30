

# Plan: Missing Items nach Tax Filer filtern

## Problem

Wenn Admin "Fehlende Unterlagen/Angaben" für einen spezifischen Tax Filer (z.B. Leano) anfordert, werden diese nicht dem Tax Filer zugeordnet. Aktuell werden Missing Items nur nach `user_id` gefiltert, nicht nach `tax_filer_id`.

## Aktuelle Situation

| Aspekt | Status |
|--------|--------|
| `missing_item_requests.tax_filer_id` | Existiert NICHT |
| Filterung Admin-Seite | Nur nach `user_id` |
| Filterung User-Seite | Nur nach `user_id` |
| Tax Return Auswahl | Nur nach `tax_year`, nicht nach `tax_filer_id` |

## Betroffene Stellen

### 1. Falscher Tax Return wird ausgewählt (UserDetail.tsx)
```tsx
// Zeile 550 & 775: Filtert nur nach tax_year, ignoriert selectedTaxFilerId
const currentTaxReturn = taxReturns.find(tr => tr.tax_year === selectedYear);
taxReturnId={taxReturns.find(tr => tr.tax_year === selectedYear)?.id}
```

### 2. Missing Item Requests haben kein tax_filer_id Feld
Die Tabelle `missing_item_requests` hat kein `tax_filer_id` Feld.

### 3. User-seitige Anzeige filtert nicht nach Tax Filer
In `useMissingItemRequests.ts` und `usePendingMissingItemsCount.ts` wird nur nach `user_id` gefiltert.

## Lösung

### Schritt 1: Datenbank - tax_filer_id zur Tabelle hinzufügen

```sql
ALTER TABLE missing_item_requests 
ADD COLUMN tax_filer_id UUID REFERENCES tax_filers(id);
```

### Schritt 2: CreateMissingItemRequestDialog - tax_filer_id übergeben

Props erweitern:
```tsx
interface CreateMissingItemRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  taxReturnId?: string;
  taxFilerId?: string | null;  // NEU
  userName?: string;
  taxYear?: string;
  onSuccess?: () => void;
}
```

Beim Erstellen speichern:
```tsx
const requestsToInsert = items.map(item => ({
  user_id: item.user_id,
  tax_return_id: item.tax_return_id,
  tax_filer_id: taxFilerId || null,  // NEU
  admin_id: user.id,
  // ...
}));
```

### Schritt 3: UserDetail.tsx - Korrekten Tax Return finden

```tsx
// Zeile 550: Tax Return nach year UND tax_filer_id filtern
const currentTaxReturn = taxReturns.find(
  tr => tr.tax_year === selectedYear && tr.tax_filer_id === selectedTaxFilerId
);

// Zeile 775: Dialog mit korrektem taxReturnId und taxFilerId aufrufen
<CreateMissingItemRequestDialog
  open={missingItemDialogOpen}
  onOpenChange={setMissingItemDialogOpen}
  userId={user.id}
  taxReturnId={taxReturns.find(
    tr => tr.tax_year === selectedYear && tr.tax_filer_id === selectedTaxFilerId
  )?.id}
  taxFilerId={selectedTaxFilerId}  // NEU
  // ...
/>
```

### Schritt 4: useMissingItemRequests Hook - tax_filer_id Parameter

```tsx
export const useMissingItemRequests = (userId?: string, taxReturnId?: string, taxFilerId?: string | null) => {
  // ...
  
  let query = supabase
    .from('missing_item_requests')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (taxFilerId) {
    query = query.eq('tax_filer_id', taxFilerId);
  }
  
  // ...
};
```

### Schritt 5: CreateMissingItemRequestInput Interface erweitern

```tsx
export interface CreateMissingItemRequestInput {
  user_id: string;
  tax_return_id: string;
  tax_filer_id?: string | null;  // NEU
  request_type: 'document' | 'information';
  title: string;
  description?: string;
}
```

### Schritt 6: User-seitige Hooks mit activeTaxFilerId

Die User-Hooks (`usePendingMissingItems`, `usePendingMissingItemsCount`) müssen ebenfalls nach `tax_filer_id` filtern:

```tsx
// In usePendingMissingItemsCount.ts
export const usePendingMissingItemsCount = (userId?: string, taxFilerId?: string | null) => {
  // ...
  let query = supabase
    .from('missing_item_requests')
    .select('id, request_type')
    .eq('user_id', userId)
    .in('status', ['pending', 'rejected']);

  if (taxFilerId) {
    query = query.eq('tax_filer_id', taxFilerId);
  }
  // ...
};
```

### Schritt 7: MissingItemsPanel mit activeTaxFilerId

```tsx
// In ChatBotInterface.tsx - activeTaxFilerId an MissingItemsPanel übergeben
<MissingItemsPanel 
  userId={userId} 
  taxFilerId={activeTaxFilerId}  // NEU
  onSubmitted={loadChatHistory} 
/>
```

## Betroffene Dateien

| Datei | Änderung |
|-------|----------|
| **Datenbank** | `tax_filer_id` Spalte zu `missing_item_requests` hinzufügen |
| `src/hooks/useMissingItemRequests.ts` | Interface erweitern, createRequests mit tax_filer_id, Filterung |
| `src/hooks/usePendingMissingItemsCount.ts` | tax_filer_id Parameter und Filterung |
| `src/components/admin/CreateMissingItemRequestDialog.tsx` | Props erweitern, tax_filer_id beim Insert |
| `src/pages/UserDetail.tsx` | Tax Return nach tax_filer_id filtern, taxFilerId an Dialog |
| `src/components/chat/MissingItemsPanel.tsx` | taxFilerId Prop hinzufügen |
| `src/components/chat/ChatBotInterface.tsx` | activeTaxFilerId an MissingItemsPanel |

## Datenmodell nach Änderung

```text
missing_item_requests
├── user_id (bestehend)
├── tax_return_id (bestehend)
├── tax_filer_id (NEU) ──────> tax_filers.id
```

## Erwartetes Ergebnis

1. Admin wählt "Leano" im Tax Filer Dropdown
2. Admin klickt "Unterlagen/Angaben anfordern"
3. Missing Item Request wird mit Leano's `tax_filer_id` gespeichert
4. User sieht nur Leano's Missing Items wenn Leano ausgewählt ist
5. Sandro's Missing Items bleiben separat

