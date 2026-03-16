

## Problem
Der Gradient ist auf `body` in `index.css` korrekt gesetzt. Aber viele Seiten-Container haben `bg-background` als Klasse, was `hsl(0, 0%, 100%)` = **reines Weiss** rendert und den Gradient verdeckt.

## Lösung
`bg-background` von den **Seiten-Root-Containern** entfernen, damit der Body-Gradient durchscheint. Kleine Komponenten (Inputs, Cards, Dialoge) behalten `bg-background` — die brauchen einen soliden Hintergrund.

## Betroffene Dateien

| Datei | Änderung |
|---|---|
| `src/pages/Invoices.tsx` | `bg-background` entfernen vom Root-Container |
| `src/pages/Feedback.tsx` | `bg-background` entfernen (2x Root-Container) |
| `src/pages/SelectPerson.tsx` | `bg-background` entfernen |
| `src/pages/InviteFriends.tsx` | `bg-background` entfernen |
| `src/pages/AppleAuth.tsx` | `bg-background` entfernen |
| `src/pages/GoogleAuth.tsx` | `bg-background` entfernen |
| `src/pages/WebAuthnAuth.tsx` | `bg-background` entfernen |
| `src/components/ui/expert-form-container.tsx` | `bg-background` entfernen vom Root + Footer |
| `src/pages/admin/MissingDocuments.tsx` | `bg-background` entfernen |

Zusätzlich alle weiteren Seiten prüfen, die `min-h-screen bg-background` nutzen.

**Nicht ändern**: Inputs, Cards, Dialoge, kleine UI-Elemente — die brauchen weiterhin einen soliden weissen Hintergrund.

## Ergebnis
Jede Seite zeigt den globalen Blau-Lavendel-Gradient als Hintergrund, statt ihn mit Weiss zu überdecken.

