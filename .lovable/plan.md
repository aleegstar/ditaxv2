

# Design-Konsistenz-Optimierung

## Problem

Es gibt zwei parallele Header-Implementierungen:
1. **`SubpageHeader`** — verwendet auf ~27 Seiten (Tracking, Zahlung, Hilfe, etc.)
2. **`ExpertFormContainer`** — hat einen eigenen inline Header für Einkommen/Abzüge/Vermögen-Formulare

Zusätzlich hat **ChatBotInterface** einen eigenen inline Header mit `style={{}}` statt Tailwind-Klassen.

Die Styles sind zwar mittlerweile ähnlich (gleicher Back-Button), aber der Code ist dupliziert und die Header-Höhen weichen ab (`h-14` vs `h-16`).

## Plan

### 1. ExpertFormContainer auf SubpageHeader umstellen
- Den eigenen `<header>` Block in `ExpertFormContainer` durch `<SubpageHeader>` ersetzen
- Header-Höhe wird einheitlich `h-16`
- Duplizierter Back-Button-Code entfällt
- `ChevronLeft`-Import kann aus ExpertFormContainer entfernt werden

### 2. ChatBotInterface auf SubpageHeader umstellen
- Den inline Header in `ChatBotInterface` durch `<SubpageHeader>` mit `titleElement` (Avatar + Name) und `rightAction` (More-Menu) ersetzen
- Inline `style={{}}` auf dem Back-Button wird durch die standardisierten Tailwind-Klassen aus SubpageHeader ersetzt

### 3. SubpageHeader Header-Höhe vereinheitlichen
- `h-16` in SubpageHeader auf `h-14` anpassen (oder umgekehrt) — eine einzige Höhe für alle Header
- ExpertFormContainer nutzt `h-14`, SubpageHeader `h-16` → auf `h-14` standardisieren

### 4. FormDashboardSkeleton anpassen
- Back-Button-Styles im Skeleton an den Standard angleichen (bg-muted/60, border)

### Betroffene Dateien
- `src/components/ui/expert-form-container.tsx` — Header durch SubpageHeader ersetzen
- `src/components/chat/ChatBotInterface.tsx` — Header durch SubpageHeader ersetzen
- `src/components/ui/subpage-header.tsx` — Höhe vereinheitlichen auf `h-14`
- `src/components/ui/form-dashboard-skeleton.tsx` — Back-Button-Style anpassen

