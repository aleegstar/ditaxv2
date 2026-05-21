## Ziel
Aktive Sidebar-Icons (UserSidebar) sollen die Farbe `#0F1B3D` (Marken-Navy) statt des aktuellen `text-blue-600` haben.

## Änderung
Datei: `src/components/layout/UserSidebar.tsx`

1. Zeile 52 — Icon-Farbe im aktiven Zustand:
   - Vorher: `isActive ? 'text-blue-600' : ''`
   - Nachher: Inline-Style `style={{ color: isActive ? '#0F1B3D' : undefined }}` (konsistent zu anderen Stellen wie Next-Step-Card, die `#0F1B3D` direkt nutzen).

2. Zeile 60 — Badge im aktiven Zustand bekommt ebenfalls den Navy-Hintergrund statt `bg-blue-600`, damit Icon und Badge farblich konsistent bleiben:
   - Vorher: `isActive ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'`
   - Nachher: Badge nutzt `text-white` + Inline-Style `backgroundColor: '#0F1B3D'` im aktiven Zustand.

Nicht betroffen: AdminSidebar, DocsSidebar (separate Komponenten, kein User-Wunsch).

## Frage
Soll die Badge ebenfalls in `#0F1B3D` umgefärbt werden (empfohlen für visuelle Konsistenz), oder nur das Icon?