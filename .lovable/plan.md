# Plan: Despia-konformer Keyboard-Fix

## Was die Despia-Doku hier klar sagt
- `/best-practices/frontend/structure`: Die App soll mobil als **fixed root frame** aufgebaut sein (`position: fixed; inset: 0; display: flex; flex-direction: column; overflow: hidden`). Dann bleibt der mittlere Bereich scrollbar und die App passt sich der Tastatur korrekt an.
- `/best-practices/frontend/structure#virtual-keyboard-adaptation`: Mit dieser **fixed frame structure** passt sich die App bei der Tastatur **automatisch** an.
- `/native-features/prevent-autoscroll`: `enabled=false` ist nur richtig, wenn **JavaScript die Keyboard-Avoidance vollständig selbst übernimmt**. `enabled=true` stellt das native Verhalten wieder her.

## Aktuelle Ursache im Projekt
Die App mischt gerade zwei Strategien:
- **Native Despia-Autoscroll ist aktiv** (`enabled=true`) – das ist ok.
- Aber die Layout-Struktur folgt **nicht** durchgehend dem Despia-Root-Frame-Muster:
  - `src/App.tsx` nutzt mobil noch einen normalen `min-h-screen`-Wrapper statt eines festen App-Frames.
  - `src/components/layout/AppShell.tsx` nutzt mobil ebenfalls `min-h-screen min-h-[100dvh]` statt `fixed inset-0 overflow-hidden`.
  - `src/pages/Chat.tsx` baut zusätzlich einen eigenen `fixed inset-0`-Frame innerhalb der Shell.
  - `src/pages/Auth.tsx` und `src/components/welcome/WelcomeFlow.tsx` arbeiten mobil weiter mit `min-h-screen`/zentrierten Cards.
- Ergebnis: Die native Keyboard-Anpassung arbeitet gegen uneinheitliche Page-Layouts; dadurch bleiben Inputs in Despia trotzdem verdeckt.

## Umsetzungsplan

### 1. Eine einzige mobile Root-Frame-Architektur einführen
- Mobil den obersten App-Container in `src/App.tsx` auf Despia-konformes Muster umstellen:
  - `fixed inset-0 flex flex-col overflow-hidden`
  - Desktop-Verhalten unverändert lassen.
- Ziel: Es gibt auf Mobile **einen** klaren Viewport-Rahmen, nicht mehrere konkurrierende `min-h-screen`-Layouts.

### 2. `AppShell` auf Despia-Frame-Struktur umstellen
- `src/components/layout/AppShell.tsx` so umbauen, dass mobil:
  - Header/Banner `flex-shrink-0` bleiben,
  - Content-Zone `flex-1 min-h-0 overflow-y-auto` erhält,
  - keine `min-h-screen`-Logik mehr den Viewport simuliert.
- Desktop-Zweig bleibt wie bisher.

### 3. Chat an die Shell anpassen statt eigenen Vollbild-Frame zu erzwingen
- `src/pages/Chat.tsx` den mobilen `fixed inset-0`-Container entfernen.
- Chat stattdessen als normales `h-full min-h-0 flex flex-col` innerhalb der globalen Shell rendern.
- Nachrichtenliste bleibt die einzige Scroll-Zone, Composer bleibt Footer-Zone.
- So arbeitet Despia mit einem konsistenten Frame statt mit verschachtelten Fixed-Containern.

### 4. Auth und Welcome auf denselben Mobile-Frame umstellen
- `src/pages/Auth.tsx` und `src/components/welcome/WelcomeFlow.tsx` mobil von `min-h-screen`/zentrierter Vollhöhe auf das gleiche Frame-Muster umstellen:
  - äußerer Frame fix,
  - Inhalt in einer scrollbaren Middle-Zone,
  - keine mobilen `justify-center`-Layouts, die beim Keyboard kollidieren.
- Optik bleibt gleich; nur die Struktur wird keyboard-sicher.

### 5. Weitere Formularseiten auf dieselbe Struktur angleichen
- Die bereits identifizierten formularlastigen Seiten prüfen und nur dort anpassen, wo noch problematische Mobile-Muster vorkommen:
  - `PersonalInfo`
  - `CreateTicket`
  - `Tickets`
  - `Feedback`
  - `MultiStepContactForm`
  - `MultiStepYesNoForm`
  - `SubmissionForm`
- Fokus: `min-h-screen`, `overflow-hidden`, `justify-center`, feste Footer und zusätzliche Fullscreen-Wrapper.

### 6. Browser/PWA-Fallback behalten, aber sauber abgrenzen
- `useVisualViewportInset` und `useFocusScrollIntoView` nur als **Browser/PWA-Fallback** weiterverwenden.
- In Despia bleibt die Hauptlösung: **native Autoscroll + fixed frame structure**.
- Kein zusätzlicher Despia-spezifischer JS-Workaround, solange die Doku-konforme Struktur aktiv ist.

### 7. `despiaKeyboard.ts` konsistent halten
- `enabled=true` beibehalten, weil wir in Despia nicht vollständig auf JS-Keyboard-Handling setzen wollen.
- Nur falls ein einzelner Sonderfall später zwingend JS-only braucht, würde man `enabled=false` dort gezielt und temporär einsetzen — nicht global.

## Technische Details
```text
Mobile root
└─ fixed app frame
   ├─ safe area / banners / header (shrink-0)
   ├─ scroll content (flex-1 min-h-0 overflow-y-auto)
   └─ footer / composer / nav (shrink-0)
```

## Validierung nach der Umsetzung
- Testen auf mobilen Formularseiten mit Fokus auf untere Inputs.
- Speziell prüfen:
  1. `/chat`
  2. `/auth`
  3. `/welcome`
  4. mindestens eine weitere Formularseite
- Erwartung:
  - Input bleibt in Despia sichtbar
  - kein Layout-Sprung
  - Browser/PWA bleibt intakt
  - Desktop bleibt unverändert

## Ergebnis
Statt weitere Keyboard-Hacks zu stapeln, wird die App auf die von Despia dokumentierte Struktur gebracht. Das ist sehr wahrscheinlich der fehlende Teil, warum es trotz `enabled=true` noch nicht zuverlässig funktioniert.