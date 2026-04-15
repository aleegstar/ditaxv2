

## Problem

Das DocumentsOverlay lädt aktuell die komplette `/documents`-Seite via `React.lazy()`. Das fühlt sich an wie eine eingebettete View (mit eigenem Header, Navigation, Routing-Abhängigkeiten), nicht wie ein natives Overlay-Element wie der Chat.

## Lösung

Das DocumentsOverlay wird zu einem eigenständigen Element umgebaut – genau wie `OverlayChatBar`. Statt `LazyDocuments` zu laden, wird die Dokumenten-Logik (`DocumentsContent`) direkt im Overlay gerendert, ohne `SubpageHeader`, ohne Routing, ohne `useNavigate`.

## Technischer Plan

### 1. DocumentsOverlay komplett neu aufbauen (eigenständig)

**`src/components/documents/DocumentsOverlay.tsx`** wird umgeschrieben:

- Entfernt den `React.lazy(() => import('@/pages/Documents'))` Import
- Importiert stattdessen direkt die relevanten Hooks und Komponenten:
  - `useFormContext`, `FormProvider`, `useTaxFiler`, `useSidebar`
  - `supabase` für Dokumenten-Abfrage
  - `EncryptedDocumentService` für verschlüsselte Thumbnails
  - `DocumentActionSheet`, `UploadActionSheet`
  - `DocumentThumbnail` (wird aus Documents.tsx exportiert)
- Baut ein eigenes Top-Bar mit Close-Button (wie beim Chat: weißer runder Button)
- Enthält eigene Dokument-Lade-Logik, Such-/Sortier-Funktionen und Upload-Buttons
- Kein `SubpageHeader`, kein `useNavigate`, kein `useSearchParams`
- Gleicher dunkler Gradient-Hintergrund wie der Chat-Overlay
- Scroll-Area für Dokumente direkt im Overlay (kein `bg-background` Container)

### 2. DocumentThumbnail exportieren

**`src/pages/Documents.tsx`**:
- `DocumentThumbnail` als named export verfügbar machen, damit das Overlay es wiederverwenden kann
- Alternativ in eigene Datei `src/components/documents/DocumentThumbnail.tsx` extrahieren

### 3. Dokument-Darstellung im Overlay anpassen

- Dokumente werden in einem dunklen Theme dargestellt (passend zum Gradient-Hintergrund)
- Karten bekommen `bg-white/10` statt `bg-transparent` mit weißem Border
- Text in `text-white` statt `text-zinc-900`
- Such-Input im dunklen Stil (wie Chat-Input)
- Upload-Button unten als schwebender Button im Overlay

### 4. Documents.tsx aufräumen

- Die `isInOverlay`-Checks und `documentsOverlayOpen`-Abhängigkeiten aus `Documents.tsx` entfernen, da die Seite nicht mehr im Overlay geladen wird

## Ergebnis

Das DocumentsOverlay wird ein komplett eigenständiges UI-Element – wie der Chat – das sich flüssig öffnet, eigene Daten lädt und keine Seiten-Navigation auslöst.

