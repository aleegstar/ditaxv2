

# Zugang zu "Personen verwalten" hinzufügen

## Problem

Wenn ein neuer User im Onboarding bei Schritt 4 ("Steuererklärung für andere?") auf **"Später einrichten"** klickt, gibt es aktuell **keinen sichtbaren Einstiegspunkt**, um später zur `/tax-filers` Seite zu gelangen.

Die einzige aktuelle Möglichkeit:
- `TaxFilerSelector` hat einen "Verwalten" Button - aber dieser ist oft nicht sichtbar bei nur einer Person

---

## Lösung

Zwei Einstiegspunkte hinzufügen:

### 1. Mobile Sidebar Navigation

In der `MobileMenuSheet` (Hamburger-Menü) einen neuen Eintrag hinzufügen:

```text
Navigation
├── Steuern          → /
├── Dokumente        → /documents
├── Chat             → /chat
├── Freunde einladen → /invite-friends
└── Personen verwalten (NEU) → /tax-filers
```

**Icon:** `Users` (von lucide-react)

### 2. Profil-Seite

Neuen Abschnitt "Personen" auf der Profil-Seite hinzufügen (nach Login History, vor Logout):

```text
┌──────────────────────────────────────┐
│ 👥 Personen                          │
│ Verwalten Sie Familienmitglieder...  │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ 👥  Personen verwalten       >   │ │
│ │     Steuererklärungen für andere │ │
│ └──────────────────────────────────┘ │
└──────────────────────────────────────┘
```

---

## Dateien

| Datei | Änderung |
|-------|----------|
| `src/components/ui/modern-mobile-menu.tsx` | Neuer Navigations-Eintrag "Personen verwalten" |
| `src/pages/Profile.tsx` | Neuer Abschnitt "Personen" mit Link zu `/tax-filers` |
| `src/i18n/translations.ts` | Neue Übersetzungsschlüssel |

---

## Technische Details

### modern-mobile-menu.tsx (Zeile ~108-124)

```typescript
const navigationItems = [
  { label: t.menu.taxes, icon: CustomHomeIcon, route: '/' },
  { label: t.menu.documents, icon: CustomFolderIcon, route: '/documents' },
  { label: t.menu.chat, icon: CustomSendIcon, route: '/chat' },
  { label: t.menu.inviteFriends, icon: Gift, route: '/invite-friends' },
  // NEU:
  { label: t.menu.managePeople, icon: Users, route: '/tax-filers' },
];
```

### Profile.tsx (nach Login History Section)

```tsx
{/* Personen Section - NEU */}
<section className="space-y-4">
  <div className="space-y-1">
    <h2 className="text-base font-semibold flex items-center gap-2">
      <Users className="w-5 h-5 text-muted-foreground" />
      {t.profile.managePeople}
    </h2>
    <p className="text-sm text-muted-foreground">
      {t.profile.managePeopleDescription}
    </p>
  </div>

  <Link to="/tax-filers" className="...">
    <Users className="w-6 h-6 text-primary" />
    <div>
      <span>Personen verwalten</span>
      <span>Steuererklärungen für Familienmitglieder</span>
    </div>
    <ChevronRight />
  </Link>
</section>
```

### translations.ts

```typescript
// Deutsch
menu: {
  managePeople: 'Personen verwalten',
},
profile: {
  managePeople: 'Personen',
  managePeopleDescription: 'Verwalten Sie Personen, für die Sie Steuererklärungen erstellen.',
  managePeopleCard: 'Personen verwalten',
  managePeopleCardDescription: 'Steuererklärungen für Familienmitglieder',
}

// Englisch
menu: {
  managePeople: 'Manage people',
},
profile: {
  managePeople: 'People',
  managePeopleDescription: 'Manage people for whom you create tax returns.',
  managePeopleCard: 'Manage people',
  managePeopleCardDescription: 'Tax returns for family members',
}
```

---

## Zusammenfassung

Nach dieser Änderung kann ein User die `/tax-filers` Seite finden über:

1. **Mobile Sidebar** → "Personen verwalten" (direkt in der Navigation)
2. **Profil-Seite** → Abschnitt "Personen" (logischer Ort für Account-bezogene Einstellungen)

Beide Wege sind intuitiv und gut sichtbar.

