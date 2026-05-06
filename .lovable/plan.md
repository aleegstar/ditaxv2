## Ziel

Navbar bleibt sichtbar, wenn das Dokumente- oder Chat-Overlay geöffnet ist. Overlays animieren von unten herein, hören aber oberhalb der Navbar auf, sodass die Navigation jederzeit erreichbar ist.

## Änderungen

### 1. `src/components/dashboard/HomeBottomNav.tsx`
- Z-Index der Navbar von `z-40` auf `z-[10010]` anheben, damit sie über dem Overlay-Layer (`z-[10000]` / `z-[9999]`) liegt.
- Active-State der Buttons: `Steuern`/`Dokumente`/`Chat` reagieren auf einen optionalen `active`-Prop, sodass beim geöffneten Overlay der entsprechende Button als aktive Pille angezeigt wird (visuelles Feedback während Übergang).
- Neuer Prop `activeTab?: 'home' | 'documents' | 'chat'`.

### 2. `src/components/documents/DocumentsOverlay.tsx`
- `hide-bottom-navbar`-Logik entfernen (keine Body-Klasse, keine Attribute mehr).
- Overlay-Container so anpassen, dass er Platz für die Navbar lässt:
  - Statt `fixed inset-0` → `fixed inset-x-0 top-0` mit `bottom: calc(env(safe-area-inset-bottom) + 84px)` (Navbar-Höhe + Padding) und `rounded-t-[28px]` plus weicher Schatten an der Oberkante für saubere Abgrenzung.
- Initial-Animation bleibt `y: '100%'` mit etwas weicherem Easing für flüssigen Übergang (bereits 0.35s `cubic-bezier(0.22,1,0.36,1)`).

### 3. `src/components/chat/OverlayChatBar.tsx`
- Backdrop (`z-[9998]`) und Chat-Container (`z-[9999]`) so anpassen, dass beide oberhalb der Navbar enden:
  - Container: `fixed inset-x-0 top-0` + `bottom: calc(env(safe-area-inset-bottom) + 84px)`.
  - Rounded-Top + Schatten passend zum Dokumente-Overlay für konsistentes Look & Feel.
- Eingabeleiste innerhalb des Chats bleibt am unteren Rand des Containers (über der Navbar, nicht dahinter).

### 4. `src/pages/UserTaxReturns.tsx`
- `activeTab` an `HomeBottomNav` durchreichen: `documentsOverlayOpen ? 'documents' : chatOpen ? 'chat' : 'home'`.
- Chat-Open-State über Custom-Event-Hook oder einfaches Lifting in der Page tracken (Listener für `open-overlay-chat` / `close-overlay-chat`).

## Ergebnis
- Navbar bleibt während aller Overlays sichtbar und klickbar.
- Aktiver Reiter wird visuell hervorgehoben.
- Übergänge bleiben flüssig (slide-up, gleiche Easing-Kurve in beiden Overlays).
