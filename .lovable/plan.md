- 2026-05-31: Android PWA/Standalone fix ergänzt. Root bleibt fixed-frame-konform; Keyboard-Inset wird jetzt zusätzlich über die VirtualKeyboard API (`navigator.virtualKeyboard.geometrychange`) ermittelt, weil `visualViewport` in installierten Android-Webapps nicht zuverlässig schrumpft. Chat-Composer und Message-Scrollzone reagieren direkt auf `--keyboard-inset`.
- 2026-05-31: Nach Analyse des Standalone-Bugs Viewport-Meta von `interactive-widget=resizes-content` auf `resizes-visual` umgestellt. Zusätzlich rückt im Chat der gesamte Footer-Frame per `padding-bottom: var(--keyboard-inset)` nach oben; Composer-Innenpadding nutzt wieder nur Safe-Area, um Doppel-Offsets zu vermeiden.
# Plan

## Befund
Das Problem ist noch nicht vollständig gelöst, weil die App zwar bereits Teile der Despia-Strategie nutzt, aber die Layout-Struktur weiterhin uneinheitlich ist.

**Aus der Despia-Doku:**
- `/best-practices/frontend/structure#virtual-keyboard-adaptation`: Die Tastatur-Anpassung funktioniert automatisch, wenn die App als **fixed root frame** aufgebaut ist.
- `/native-features/prevent-autoscroll`: Native Autoscroll soll **aktiv bleiben**, solange die App Keyboard-Avoidance nicht komplett selbst übernimmt.

**Im Code sehe ich weiter konkurrierende Muster:**
- `src/App.tsx` nutzt bereits einen mobilen Fixed-Root, aber nur als äußerste Hülle.
- `src/components/layout/AppShell.tsx` und einzelne Seiten teilen die Scroll-Verantwortung noch uneinheitlich auf.
- `src/pages/Auth.tsx` hat innen weiter `min-h-screen min-h-[100dvh]` plus eigene Fullscreen-Wrapper.
- `src/components/welcome/WelcomeFlow.tsx` arbeitet weiter mit step-basiertem Vollhöhen-Layout.
- `src/pages/PersonalInfo.tsx` und `src/pages/CreateTicket.tsx` nutzen weiter `min-h-screen`-Seitenstrukturen.
- `src/hooks/useFocusScrollIntoView.ts` ist in Despia komplett deaktiviert, obwohl dort aktuell noch ein Fallback fehlt, wenn ein Input innerhalb verschachtelter Scroll-Container landet.

## Ziel
Alle mobilen Seiten mit Inputs sollen in Despia, Browser und PWA dieselbe robuste Struktur verwenden:
- ein fixer Root-Frame,
- genau eine echte Scroll-Zone pro Screen,
- Header/Footer ohne Mit-Scrollen,
- fokussierte Inputs bleiben sichtbar.

## Umsetzung

### 1. Mobile Frame-Architektur vereinheitlichen
Ich ziehe alle problematischen Seiten auf dasselbe Muster:

```text
fixed app root
├─ safe area / header (shrink-0)
├─ scroll container (flex-1 min-h-0 overflow-y-auto)
└─ footer / composer / actions (shrink-0)
```

Betroffene Hauptdateien:
- `src/components/layout/AppShell.tsx`
- `src/pages/Auth.tsx`
- `src/components/welcome/WelcomeFlow.tsx`
- `src/pages/PersonalInfo.tsx`
- `src/pages/CreateTicket.tsx`
- weitere Formularseiten mit denselben Mustern

### 2. Problematische Vollhöhen-Muster entfernen
Ich ersetze auf mobilen Formularscreens die Layout-Kombinationen, die mit der Tastatur kollidieren:
- `min-h-screen`
- `100vh` / `100dvh` innerhalb innerer Seitenwrapper
- zusätzliche `fixed inset-0`-Container innerhalb der Shell
- `justify-center` auf Vollhöhen-Formlayouts
- `overflow-hidden`, wo eigentlich die Inhaltszone scrollen muss

Desktop bleibt unverändert.

### 3. Despia-kompatiblen Focus-Fallback ergänzen
Da Inputs trotz Root-Frame noch verdeckt werden, ergänze ich einen gezielten Fallback für Despia:
- beim `focusin` wird **der nächstliegende Scroll-Container** ermittelt,
- dieser Container scrollt den aktiven Input in den sichtbaren Bereich,
- nur wenn das Element tatsächlich unter dem sichtbaren Bereich liegt,
- ohne visuelle Sprünge und ohne Desktop-Verhalten zu ändern.

Das ist kein kompletter JS-Keyboard-Workaround, sondern ein minimaler Safety-Net für reale verschachtelte Layouts.

### 4. Chat separat absichern
`/chat` behält seine eigene Nachrichten-Scrollzone, aber ich prüfe und korrigiere:
- Header `shrink-0`
- Nachrichtenliste als einzige `flex-1 min-h-0 overflow-y-auto`-Zone
- Composer strikt `shrink-0`
- kein zusätzlicher Wrapper, der die verfügbare Höhe falsch kapselt

### 5. Welcome/Auth auf echte Mobile-Form-Struktur umstellen
Gerade dort sind Inputs kritisch. Ich baue diese Screens so um, dass:
- nicht die ganze Seite künstlich auf Viewport-Höhe gezwungen wird,
- stattdessen nur die mittlere Zone scrollt,
- der aktive Input bei offener Tastatur sichtbar bleibt,
- das bestehende Design optisch gleich bleibt.

### 6. Validierung gegen Akzeptanzkriterien
Ich prüfe danach gezielt:
- `/chat`
- `/auth`
- `/welcome`
- mindestens eine weitere Formularseite wie `/create-ticket` oder `/personal-info`

## Technische Details
- `preventdefault://autoscroll?enabled=true` bleibt aktiv.
- Die Despia-Doku-Vorgabe „fixed root frame statt 100vh“ wird konsequent bis in die betroffenen Formularseiten durchgezogen.
- Der bestehende `visualViewport`-Ansatz bleibt für Browser/PWA erhalten.
- Der zusätzliche Focus-Fallback greift nur mobil und nur dort, wo ein Input sonst verdeckt wäre.

## Ergebnis
Damit beheben wir nicht nur einen einzelnen Screen, sondern die eigentliche Ursache: gemischte Mobile-Layout-Systeme innerhalb einer Despia-App. Nach der Umsetzung sollen Inputs weder in der installierten Web-App noch im Browser von der Tastatur verdeckt werden.