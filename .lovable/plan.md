## Ziel

Auf Desktop (≥ md) keine Bottom-Navbar mehr, stattdessen eine permanente Sidebar links im Stil des Screenshots. Die Sidebar ist weiss, der Bereich ringsum (Padding um den Content) ebenfalls weiss. Der eigentliche Content liegt darin in einer Karte mit unserem Haupt-Hintergrund (`bg-background` / Rosé-Gradient) und abgerundeten Ecken. Auf Mobile bleibt alles wie heute (HomeBottomNav + MobileMenuSheet).

## Layout-Skizze (Desktop)

```text
┌──────────────────────────── weisser Rahmen (body) ─────────────────────────┐
│  ┌─Sidebar─┐   ┌──────────────────── Content-Karte ────────────────────┐  │
│  │ Logo    │   │  rounded-3xl, bg-background (Rosé-Gradient)          │  │
│  │ Steuern │   │                                                       │  │
│  │ Dokum.  │   │   <Outlet / page content>                             │  │
│  │ Chat    │   │                                                       │  │
│  │ ─────   │   │                                                       │  │
│  │ Profil  │   │                                                       │  │
│  │ Hilfe   │   │                                                       │  │
│  │ …       │   │                                                       │  │
│  │ Avatar  │   │                                                       │  │
│  └─────────┘   └───────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────┘
```

## Plan

1. Neue Komponente `src/components/layout/UserSidebar.tsx`
   - Permanente Desktop-Sidebar (`hidden md:flex`), Breite ~240 px, `bg-white`.
   - Logo oben (`/ditax-logo-new.svg`).
   - Hauptnavigation: Steuern (`/`), Dokumente (`/documents`), Chat (`/chat`) — aktive Route hervorgehoben (Pille, primary blau wie heutige BottomNav-Farbe `#1656FF`).
   - Sekundärnavigation (aus heutigem `MobileMenuSheet` übernommen): Profil, Hilfe, Rechnungen, Freunde einladen, Datenschutz-Einstellungen, Logout etc.
   - Footer mit Avatar + Name + Dropdown (analog `AdminSidebar`).
   - Notifications-Glocke + ungelesene Chat-Badge.

2. Neue Layout-Komponente `src/components/layout/AppShell.tsx`
   - Wrappt `AuthenticatedApp`-Routen.
   - Auf Desktop: Flex-Container mit weissem Body (`bg-white`), `UserSidebar` links, rechts der Content in einer Karte: `flex-1 m-4 rounded-3xl bg-background overflow-auto`. Der bestehende globale Rosé-Gradient bleibt aktiv und scheint durch `bg-background` der Karte.
   - Auf Mobile: Kein Frame, kein UserSidebar — Kinder werden direkt gerendert (heutiges Verhalten unverändert).

3. `src/App.tsx`
   - `AuthenticatedApp` rendert `<AppShell><Routes>…</Routes></AppShell>` statt der Routes direkt.
   - `GlobalMobileMenuSheet` und `HomeBottomNav` bleiben erhalten, werden aber nur auf Mobile sichtbar (siehe 4).

4. `src/components/dashboard/HomeBottomNav.tsx`
   - Outer `<nav>` bekommt `md:hidden`, damit die BottomNav auf Desktop verschwindet.

5. `src/pages/UserTaxReturns.tsx`, `src/pages/Documents.tsx`
   - Top-Header mit Hamburger/Avatar nur auf Mobile zeigen (`md:hidden`), da auf Desktop die Sidebar diese Funktionen abdeckt. Inhaltliche Logik unverändert.
   - Padding/Container so anpassen, dass der Content innerhalb der neuen Karte vernünftig sitzt (max-width entfällt nicht, nur äusseres `min-h-screen` wird auf Desktop neutralisiert).

6. Design-Tokens
   - Keine Hardcoded-Farben — Sidebar nutzt `bg-white` (existiert als Token) bzw. `bg-card`. Aktivzustand nutzt `bg-primary/10 text-primary`. Karte rechts: `bg-background rounded-3xl`.

## Nicht im Scope

- Mobile Bottom-Nav-Aussehen (bleibt wie zuletzt definiert).
- Admin-Bereich (`/admin/*`) — hat bereits eigene `AdminSidebar`.
- Auth-/Public-Seiten — laufen ausserhalb von `AuthenticatedApp`.

Bitte bestätigen, dann setze ich es um.