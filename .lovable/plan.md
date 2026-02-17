

# Admin-Bereich im Lovable/Origin UI Design

## Was ist das "Lovable Design"?

Das Lovable-Design basiert auf Origin UI -- einer minimalistischen, cleanen Komponentenbibliothek. Merkmale:
- Inputs: h-9, `rounded-lg`, dezenter Border (`border-input`), Focus-Ring (`ring-[3px] ring-ring/20`), weisser Hintergrund
- Buttons: saubere Varianten, `rounded-xl`, subtile Shadows
- Cards: weisser Hintergrund, `rounded-lg`, `border border-input`, kein Glassmorphism
- Typografie: klare Hierarchie, `text-foreground`, `text-muted-foreground`

## Aktueller Zustand im Admin-Bereich

Der Admin-Bereich nutzt aktuell eine Mischung aus:
- Glassmorphism-Karten (`rgba(255,255,255,0.43)`, `backdrop-blur`, inline `borderRadius: '20px'`)
- Inline-Styles statt Tailwind-Klassen fuer Rundungen
- Eigene Farbdefinitionen (`text-black`, `text-black/70`) statt Design-Tokens
- Inputs mit Custom-Styles (`bg-white/20`, inline `borderRadius: '12px'`)

## Geplante Aenderungen

### 1. AdminWelcomeHeader (`src/components/admin/AdminWelcomeHeader.tsx`)
- Glassmorphism-Card ersetzen durch cleane Card mit `bg-white border border-border rounded-xl`
- Inline-Styles entfernen
- Farben auf Design-Tokens umstellen (`text-foreground`, `text-muted-foreground`)
- Refresh-Button: Standard `variant="outline"` mit `rounded-lg`

### 2. AdminDashboard (`src/components/admin/AdminDashboard.tsx`)
- Stat-Cards: `rounded-xl` statt `rounded-2xl`, `border border-border` statt `border-gray-100`
- Icon-Container: `bg-muted` statt `bg-gray-50`
- Farben: `text-foreground` statt `text-gray-900`

### 3. TicketManagement (`src/components/admin/TicketManagement.tsx`)
- Filter-Card: Glassmorphism entfernen, `bg-card border border-border rounded-xl`
- Inputs: Standard Origin UI Input (default Variant) ohne inline borderRadius
- Select-Trigger: Standard-Styling ohne inline Styles
- Ticket-Cards: `bg-card border border-border rounded-xl` statt Glassmorphism
- Alle inline `style={{borderRadius}}` entfernen

### 4. TaxReturnCreation (`src/components/admin/TaxReturnCreation.tsx`)
- Gleiche Bereinigung: Glassmorphism raus, cleane Cards rein
- Standard-Buttons und -Inputs nutzen

### 5. UpdatePaymentStatusForm (`src/components/admin/UpdatePaymentStatusForm.tsx`)
- Card: `rounded-xl` hinzufuegen, bereits relativ sauber
- Labels und Inputs pruefen

### 6. MissingDocuments (`src/pages/admin/MissingDocuments.tsx`)
- Glassmorphism-Elemente durch cleane Origin UI Cards ersetzen

### 7. Weitere Admin-Seiten
- `DefinitiveTaxBills.tsx`, `DeletionFeedback.tsx`, `SignedTaxReturns.tsx`, `UserFeedback.tsx`
- Gleiches Pattern: Glassmorphism raus, Origin UI Design rein

### 8. StatsWidget (`src/components/ui/stats-widget.tsx`)
- `rounded-xl` statt `rounded-2xl`
- `border border-border` statt `border-gray-100`
- Farben auf Design-Tokens

### 9. UserCard (`src/components/ui/user-card.tsx`)
- `rounded-xl` statt `rounded-[24px]`
- Inline-Styles durch Tailwind-Klassen ersetzen
- Cleaner Shadow statt `rgba(0,0,0,0.15) 0px 0px 22px`

## Design-Prinzipien (konsistent umgesetzt)

| Eigenschaft | Vorher | Nachher |
|-------------|--------|---------|
| Card-Radius | 20px-24px (inline) | rounded-xl (Tailwind) |
| Card-Hintergrund | rgba(255,255,255,0.43) + blur | bg-card / bg-white |
| Card-Border | border-white | border border-border |
| Input-Style | Inline borderRadius, custom bg | Default Input variant |
| Farben | text-black, text-gray-900 | text-foreground |
| Schatten | shadow-lg, custom rgba | shadow-sm |
| Button-Radius | Inline 12px | rounded-lg (Standard) |

## Zusammenfassung der Dateien

| Datei | Aenderung |
|-------|-----------|
| `src/components/admin/AdminWelcomeHeader.tsx` | Glassmorphism entfernen, Origin UI Card |
| `src/components/admin/AdminDashboard.tsx` | Cards auf Origin UI umstellen |
| `src/components/admin/TicketManagement.tsx` | Filter + Ticket-Cards bereinigen |
| `src/components/admin/TaxReturnCreation.tsx` | Cards bereinigen |
| `src/components/admin/UpdatePaymentStatusForm.tsx` | Card-Styling anpassen |
| `src/pages/admin/MissingDocuments.tsx` | Glassmorphism entfernen |
| `src/pages/admin/DefinitiveTaxBills.tsx` | Design vereinheitlichen |
| `src/pages/admin/DeletionFeedback.tsx` | Design vereinheitlichen |
| `src/pages/admin/SignedTaxReturns.tsx` | Design vereinheitlichen |
| `src/pages/admin/UserFeedback.tsx` | Design vereinheitlichen |
| `src/components/ui/stats-widget.tsx` | Radius + Farben anpassen |
| `src/components/ui/user-card.tsx` | Inline-Styles durch Tailwind ersetzen |

