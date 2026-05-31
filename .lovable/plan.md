# Tastatur überdeckt Inputs in Despia — überall

## Problem

In `src/main.tsx` rufen wir beim App-Start global `initDespiaKeyboardHandling()` → das sendet `preventdefault://autoscroll?enabled=false`. Damit verschiebt die native WebView den fokussierten Input **nicht mehr** über die Tastatur.

Unser eigenes JS-Avoidance funktioniert in Despia nicht zuverlässig (`window.innerHeight` bleibt konstant, `visualViewport` liefert in der iOS-WebView je nach Version 0/falsche Werte) — Ergebnis: Inputs werden **auf jeder Seite** (auch `/chat`, `/welcome`, Auth-Formularen etc.) verdeckt.

## Lösung

Native Autoscroll-Verhalten wieder aktivieren und der WebView die Arbeit überlassen. Despia hebt fokussierte Inputs dann automatisch über die Tastatur — auf **allen Seiten**, ohne JS-Logik pro Seite.

Da der Chat-Footer aktuell per `translateY(-bottomInset)` selbst positioniert wird, wird dieser Mechanismus entfernt — der Footer bleibt einfach inline am unteren Rand, und native Autoscroll scrollt die Liste so, dass der Footer mit Input sichtbar bleibt.

## Änderungen

### 1. `src/lib/despiaKeyboard.ts`
- `initDespiaKeyboardHandling()` ruft **kein** `preventdefault://autoscroll?enabled=false` mehr auf. Funktion wird zu einem No-op (zurück lassen für API-Kompatibilität, mit Kommentar warum). Optional Default-Aktivierung `preventdefault://autoscroll?enabled=true` explizit senden, falls Despia einen vorherigen Disable-State speichert.

### 2. `src/main.tsx`
- Aufruf bleibt, ist aber jetzt no-op. Kein Code-Move nötig.

### 3. `src/pages/Chat.tsx`
- `keyboardOffset` + `translateY`-Logik aus dem Composer-Wrapper entfernen (Zeile 128, 438–440). Wrapper wird einfach:
  ```tsx
  <div className="flex-shrink-0 border-t border-border/60 bg-background">
    <ChatComposer ... />
  </div>
  ```
- `useKeyboardDetection`-Import + Destructuring entfernen, falls nicht mehr genutzt.
- Der Container `fixed inset-0 flex flex-col` bleibt — Despia scrollt den fokussierten Composer-Input automatisch über die Tastatur.

### 4. `src/components/chat/ChatComposer.tsx`
- Unverändert. `padding-bottom: env(safe-area-inset-bottom)` bleibt für den Home-Indicator.

## Erwartetes Verhalten in Despia

- **Welcome, Auth, Profile, Forms, Tickets, Feedback usw.**: Tastatur erscheint → Despia hebt den fokussierten Input automatisch über die Tastatur. Keine Codeänderung pro Seite nötig.
- **Chat**: Composer ist Teil des Layouts; bei Fokus auf das Textarea scrollt Despia den Composer über die Tastatur. Kein weißer Gap, kein verdeckter Input mehr.
- **Browser/Lovable-Preview**: Verhalten unverändert (visualViewport regelt das selbst).
