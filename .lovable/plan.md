

# Plan: Profilbilder für TaxFilers auf der Select-Person Seite

## Überblick

Die Personenkarten auf `/select-person` zeigen aktuell nur ein generisches User-Icon. Das Ziel ist, das individuelle Profilbild jedes TaxFilers anzuzeigen.

---

## Schritt 1: Datenbank-Migration

Die `tax_filers` Tabelle hat aktuell keine `avatar_url` Spalte.

```sql
ALTER TABLE tax_filers 
ADD COLUMN avatar_url TEXT DEFAULT NULL;
```

---

## Schritt 2: TypeScript-Interface erweitern

**Datei:** `src/contexts/TaxFilerContext.tsx`

```text
export interface TaxFiler {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  relationship: 'self' | 'child' | 'spouse' | 'parent' | 'other';
  ahv_number: string | null;
  is_primary: boolean;
  avatar_url: string | null;  // NEU
  created_at: string;
  updated_at: string;
}
```

---

## Schritt 3: SelectPerson.tsx mit Avatar-Komponente

**Datei:** `src/pages/SelectPerson.tsx`

Das generische User-Icon wird durch die Avatar-Komponente ersetzt:

```text
// Import hinzufügen
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// Avatar-Bereich ersetzen (Zeile 81-83)
<Avatar className="w-16 h-16 ring-1 ring-primary/10">
  <AvatarImage 
    src={filer.avatar_url || '/lovable-uploads/default-avatar.png'} 
    alt={`${filer.first_name} ${filer.last_name}`}
    className="object-cover"
    onError={(e) => {
      e.currentTarget.src = '/lovable-uploads/default-avatar.png';
    }}
  />
  <AvatarFallback className="bg-gradient-to-br from-primary/15 to-primary/5 text-primary text-lg font-medium">
    {filer.first_name.charAt(0)}{filer.last_name.charAt(0)}
  </AvatarFallback>
</Avatar>
```

**Fallback-Strategie:**
1. Zeigt `filer.avatar_url` wenn vorhanden
2. Bei Ladefehler: Fallback zu `/lovable-uploads/default-avatar.png`
3. Bei keinem Bild: Zeigt Initialen (z.B. "SG" für Sandro Graber)

---

## Ergebnis

| Vorher | Nachher |
|--------|---------|
| Generisches User-Icon für alle | Individuelles Profilbild pro Person |
| Keine Personalisierung | Initialen als Fallback (z.B. "LG" für Leano Graber) |

---

## Hinweis: Avatar-Upload für TaxFilers

Die Avatar-Spalte wird zunächst leer sein. Ein separater Avatar-Upload-Flow für TaxFilers (ähnlich wie `ProfileAvatarUpload`) könnte später auf der `/tax-filers` Bearbeitungsseite hinzugefügt werden.

