

## Admin Sidebar und Layout im UI8 Core Stil

Das Ziel ist, die Admin-Sidebar und das Layout an den minimalistischen Stil von UI8 Core anzupassen -- weisser, sauberer Hintergrund, flache Navigation ohne farbige Pills, dezente Hover-Effekte und ein cleanes Layout ohne den grauen Hintergrund.

### Was sich aendert

**1. Sidebar (`AdminSidebar.tsx`)**
- Hintergrund wird reinweiss statt `bg-sidebar`
- Rechter Rand als dezenter Separator (`border-r border-border`)
- Logo-Bereich: nur Logo, ohne "Admin Panel" Text -- cleaner wie bei UI8
- Nav-Items: kein farbiger Pill/rounded-full mehr. Stattdessen dezente `rounded-lg` Items mit leichtem Hintergrund bei Active-State (z.B. `bg-muted font-semibold text-foreground`) und subtiler Hover (`hover:bg-muted/50`)
- Icons etwas kleiner und in Grauton (`text-muted-foreground`), bei Active schwarz
- Gruppen-Header: ohne ChevronRight, nur als einfache Textlabel in Uppercase wie bei UI8 (Products, Customers etc.) -- oder alternativ mit Chevron beibehalten fuer Collapse-Funktion
- User-Profil unten: dezenter, ohne Ring am Avatar

**2. Layout (`Admin.tsx`)**
- Der graue Hintergrund (`rgb(244 244 244)`) und der weisse `rounded-3xl` Container werden entfernt
- Stattdessen: weisser Hintergrund ueberall, Content direkt im `main` ohne extra Card-Wrapper
- Kein `shadow-sm` und kein `rounded-3xl` auf dem Content-Bereich
- Padding bleibt fuer Spacing

### Technische Aenderungen

**Datei: `src/components/admin/AdminSidebar.tsx`**
- `NavItem`: Styling von `rounded-full bg-primary text-white shadow-md` zu `rounded-lg bg-muted text-foreground font-semibold` (active) und `hover:bg-muted/50` (inactive)
- `NavGroup`: Chevron-Toggle beibehalten aber Styling vereinfachen
- Sidebar-Container: `bg-sidebar` durch `bg-white border-r border-border` ersetzen
- Logo-Bereich: "Admin Panel" Text entfernen, nur Logo anzeigen
- User-Bereich: `ring-2 ring-border` vom Avatar entfernen, subtileren Style

**Datei: `src/pages/Admin.tsx`**
- Aeusserer Container: `style={{ backgroundColor: 'rgb(244 244 244 ...)' }}` entfernen, stattdessen `bg-background`
- Inner Container: `bg-white rounded-3xl shadow-sm` entfernen, nur padding beibehalten
- Das ergibt ein flaches, weisses Layout wie bei UI8 Core

### Vorher / Nachher

- **Vorher**: Grauer Hintergrund, weisse Card mit Schatten, farbige Sidebar-Pills
- **Nachher**: Weisser Hintergrund durchgehend, flache Navigation mit dezenten Highlights, cleaner minimalistischer Look

