

# Plan: Admin-Notizen pro Tax Filer

## Problem

Admin-Notizen werden aktuell in `profiles.admin_notes` gespeichert - ein Feld pro Benutzer-Account. Bei Familien mit mehreren Tax Filern (z.B. Sandro + Leano) gibt es nur ein gemeinsames Notiz-Feld statt separater Notizen pro Person.

## Aktuelle Situation

| Aspekt | Aktuell |
|--------|---------|
| Speicherort | `profiles.admin_notes` |
| Scope | 1 Notiz pro Account |
| Problem | Notizen für Leano überschreiben Notizen für Sandro |

## Lösung

### Schritt 1: Datenbank - Neues Feld in tax_filers

```sql
ALTER TABLE tax_filers 
ADD COLUMN admin_notes TEXT DEFAULT '';
```

Das ermöglicht separate Notizen pro Tax Filer.

### Schritt 2: AdminNotesCard.tsx - Props erweitern

```tsx
interface AdminNotesCardProps {
  userId: string;
  initialNotes: string;
  taxFilerId?: string | null;  // NEU: Optional für Rückwärtskompatibilität
}
```

Speicherlogik anpassen:
- Wenn `taxFilerId` vorhanden: in `tax_filers.admin_notes` speichern
- Fallback: in `profiles.admin_notes` speichern (Rückwärtskompatibilität)

### Schritt 3: UserDetail.tsx - Notizen pro Tax Filer laden

Neue Logik zum Laden der Notizen basierend auf `selectedTaxFilerId`:

```tsx
// Wenn ein Tax Filer ausgewählt ist, dessen Notizen laden
const currentNotes = useMemo(() => {
  if (selectedTaxFilerId) {
    const filer = taxFilers.find(f => f.id === selectedTaxFilerId);
    return filer?.admin_notes || '';
  }
  return user?.admin_notes || '';
}, [selectedTaxFilerId, taxFilers, user]);
```

### Schritt 4: UserTabs.tsx - taxFilerId an AdminNotesCard übergeben

```tsx
<AdminNotesCard 
  userId={userId} 
  initialNotes={initialNotes} 
  taxFilerId={selectedTaxFilerId}  // NEU
/>
```

## Betroffene Dateien

| Datei | Änderung |
|-------|----------|
| **Datenbank** | `admin_notes` Spalte zu `tax_filers` hinzufügen |
| `src/components/user-detail/AdminNotesCard.tsx` | Props erweitern, Speicherlogik für Tax Filer |
| `src/pages/UserDetail.tsx` | Notizen basierend auf selectedTaxFilerId laden, taxFilers mit admin_notes fetchen |
| `src/components/user-detail/UserTabs.tsx` | `taxFilerId` Prop an AdminNotesCard übergeben |

## Technische Details

### Speicherlogik in AdminNotesCard

```tsx
const saveAdminNotes = async () => {
  setSavingNotes(true);
  try {
    let error;
    
    if (taxFilerId) {
      // Speichere in tax_filers für spezifischen Tax Filer
      const result = await supabase
        .from('tax_filers')
        .update({ admin_notes: adminNotes })
        .eq('id', taxFilerId);
      error = result.error;
    } else {
      // Fallback: Speichere in profiles (alte Logik)
      const result = await supabase
        .from('profiles')
        .update({ admin_notes: adminNotes })
        .eq('id', userId);
      error = result.error;
    }
    
    // ... rest der Fehlerbehandlung
  }
};
```

### Tax Filers mit admin_notes laden

In `UserDetail.tsx` muss das Laden der Tax Filers erweitert werden:

```tsx
const { data: filersData } = await supabase
  .from('tax_filers')
  .select('id, first_name, last_name, is_primary, relationship, admin_notes')  // admin_notes hinzugefügt
  .eq('user_id', userId)
  .order('is_primary', { ascending: false });
```

## Erwartetes Ergebnis

1. Admin wählt Sandro aus dem Dropdown
2. Sandro's spezifische Admin-Notizen werden angezeigt
3. Admin wechselt zu Leano
4. Leano's separate Admin-Notizen werden angezeigt
5. Änderungen werden für jeden Tax Filer unabhängig gespeichert

## Datenmodell nach Änderung

```text
profiles
├── admin_notes (bestehend, für Accounts ohne Multi-Filer)

tax_filers  
├── admin_notes (NEU, pro Tax Filer)
```

