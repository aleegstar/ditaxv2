

## Plan: Bottom Navbar → Inline Overlay Chat mit Liquid Glass Design

### Konzept

Die bestehende Bottom-Navigation (3 Buttons + FAB) wird ersetzt durch ein **Chat-Eingabefeld im "Liquid Glass"-Stil**, das am unteren Bildschirmrand schwebt. Beim Antippen des Eingabefelds:

1. Ein **dunkler Overlay** (backdrop) faded sanft ein
2. Das Eingabefeld **gleitet leicht nach oben** und wird aktiv
3. **Chat-Bubbles** erscheinen darüber mit gestaffelter Animation (stagger)
4. Das Ganze wirkt wie ein moderner In-Place-Chat, ohne Seitenwechsel

Beim Schliessen (Tap auf Overlay oder Senden) faded alles wieder smooth zurück.

```text
┌─────────────────────┐
│                     │
│   Dashboard Content │
│                     │
│                     │
│ ┌─ dark overlay ──┐ │
│ │                 │ │
│ │  Chat Bubbles   │ │
│ │  (staggered in) │ │
│ │                 │ │
│ └─────────────────┘ │
│ ╔═══════════════════╗│
│ ║ 💬 Nachricht...  ▶║│  ← Liquid Glass Input
│ ╚═══════════════════╝│
└─────────────────────┘
```

### Technische Umsetzung

#### 1. Neue Komponente: `OverlayChatBar`
- Erstelle `src/components/chat/OverlayChatBar.tsx`
- Enthält:
  - **Ruhezustand**: Glasmorphes Eingabefeld mit Placeholder "Nachricht schreiben..." + Send-Button, floating am unteren Rand
  - **Aktiver Zustand**: `isChatOpen` State → Overlay + Chat-Bubbles
- Liquid Glass Styling: `backdrop-filter: blur(20px) saturate(180%)`, halbtransparenter weisser Hintergrund, subtiler Border + Shadow
- Send-Button: Runder Button im gleichen Stil wie der aktuelle FAB (blauer Gradient)

#### 2. Dark Overlay & Chat-Bubbles
- Overlay: `fixed inset-0`, `bg-black/50`, fade-in via framer-motion (`opacity 0→1`, 200ms)
- Chat-Nachrichten: Lade die letzten ~10 Nachrichten aus der bestehenden Chat-Logik (Supabase `chat_messages`)
- Bubbles erscheinen mit `staggerChildren: 0.05` von unten nach oben
- Scroll-Container direkt über dem Eingabefeld, `max-h-[60vh]`, auto-scroll nach unten

#### 3. Integration der Chat-Logik
- Wiederverwendung der bestehenden Chat-Nachrichtenlade- und Sendelogik aus `ChatBotInterface.tsx`
- Extrahiere die Kernlogik (Nachrichten laden, senden, Echtzeit-Subscription) in einen Custom Hook `useChatMessages(userId)`
- Senden einer Nachricht direkt aus dem Overlay heraus

#### 4. Anpassung `UserTaxReturns.tsx`
- Entferne die gesamte bestehende Bottom-Navigation (`<nav data-bottom-navbar>` + FAB-Button)
- Ersetze durch `<OverlayChatBar userId={userId} />`
- Der Menü-Button wird ins Welcome-Header oder in die Action-Cards verschoben (oder über ein Icon im Chat-Input zugänglich gemacht)

#### 5. Animationen (framer-motion)
- **Input-Bar**: `layoutId` für smooth morphing, leichte Y-Translation beim Öffnen
- **Overlay**: `AnimatePresence` + `motion.div` mit `opacity` transition (300ms ease-out)
- **Bubbles**: `variants` mit `staggerChildren: 0.04`, jede Bubble `opacity: 0, y: 20 → opacity: 1, y: 0` (200ms)
- **Schliessen**: Reverse-Animation, Bubbles fade out, Overlay fades, Input gleitet zurück

#### 6. Menü-Zugang
- Füge ein kleines Burger/Menu-Icon links im Chat-Input hinzu (im Ruhezustand), das weiterhin `setMenuSheetOpen(true)` auslöst
- Alternativ: Home-Icon + Menu-Icon als kleine Icons links im Eingabefeld

### Dateien

| Datei | Aktion |
|---|---|
| `src/hooks/useChatMessages.ts` | Neu – Chat-Logik extrahiert |
| `src/components/chat/OverlayChatBar.tsx` | Neu – Overlay-Chat-Komponente |
| `src/pages/UserTaxReturns.tsx` | Bearbeiten – Navbar ersetzen durch OverlayChatBar |

