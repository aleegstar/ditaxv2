

## Problem

Der "Fortsetzen"-Button auf Zeile 476 ist ein hardcodierter `<button>` mit eigenen Inline-Styles — er nutzt **nicht** die globale `Button`-Komponente. Zudem gibt es kleine Unterschiede zwischen dem hardcodierten Button und dem globalen Design:

| Eigenschaft | Globaler Button (`button.tsx`) | Hardcodierter Button (Zeile 476) |
|---|---|---|
| Font-Grösse | `text-base` | `text-sm` |
| Höhe | `h-11` (fest) | keine feste Höhe, `py-3` |
| Padding | `px-5 py-2.5` | `px-6 py-3` |
| Hover | `hover:brightness-[1.04]` | `hover:scale-[1.02]` |

## Plan

### 1. Globales Button-Design anpassen (`src/components/ui/button.tsx`)

Die default-Variante und default-Grösse aktualisieren, damit sie dem Screenshot-Button entsprechen:

- **Default size**: `h-11 px-5 py-2.5` → `px-6 py-3` (keine feste Höhe, grösseres Padding)
- **Font**: `text-base` → `text-sm` in der Basis-Klasse
- **Hover**: `hover:brightness-[1.04]` beibehalten, zusätzlich `hover:scale-[1.02]` hinzufügen

### 2. Hardcodierten Button ersetzen (`src/pages/UserTaxReturns.tsx`)

Zeile 476: Den `<button>` durch die globale `<Button>`-Komponente ersetzen, damit die Exklusivitäts-Richtlinie eingehalten wird.

