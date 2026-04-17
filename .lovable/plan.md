

## Ziel
Das Yes/No-Frageinterface (`src/components/forms/multistep/YesNoQuestion.tsx`) modernisieren, damit es konsistent mit dem Hauptseiten-Design (Swiss Minimal, weiße Karten, runde Pill-Buttons mit blauem Gradient, **keine Icons in Primärbuttons**) wirkt.

## Probleme im aktuellen Design (siehe Screenshot)
1. **Karte wirkt klein & "schwebend"** — wide white card mitten im leeren Raum, dicker `border-2`, `shadow-lg`, viel Padding-Asymmetrie. Passt nicht zum flachen Swiss-Look der Tax-Year-Cards.
2. **"Mehr Informationen"-Akkordeon dominiert die Karte**, obwohl er sekundär ist — graues Pill-Box mit Info-Icon links wirkt wie ein Eingabefeld.
3. **Thumbs-Up/Down im Footer der Karte** sind dekorativ, nicht funktional, irritieren.
4. **Bottom-Buttons mit Icons** (👍/👎) widersprechen der Memory-Regel "Icons werden in primären Buttons vermieden".
5. **Nein-Button als zerbrechliches rosa Pill** mit Destructive-Farben — wirkt wie ein Fehlerzustand statt einer neutralen Wahl.
6. **Progress-Anzeige** mit segmentierten Balken + "Frage 1 von 9" zentriert ist okay, aber Counter-Text könnte näher an Header rücken.

## Lösungsansatz

### A) Karte (`SwipeCard`)
- Weiße Karte ohne dicke Border (`border-border/40` statt `border-2`), weicher Schatten (`shadow-sm` + subtile Border), `rounded-3xl` beibehalten.
- Mehr vertikales Atmen: zentriertes Layout, Frage als großer Headline (font-semibold, text-2xl), Subtext darunter, kein eingebauter Akkordeon mehr.
- **"Mehr Informationen"** als dezenter Text-Link unter der Frage (klein, muted-foreground, mit unterstrichenem `Mehr erfahren`). Bei Klick öffnet sich Inline-Erklärung (sanftes `motion` Reveal) — kein Pill-Box mehr.
- Swipe-Indikatoren (JA/NEIN beim Drag) bleiben funktional, aber subtiler (kein Bold-Black, sondern Pill mit semantischer Farbe).
- Dekorative Thumbs-Hints im Karten-Footer **entfernen** — stattdessen kleiner Hinweistext "Wische oder tippe" (nur einmal beim ersten Mal anzeigen, oder ganz weglassen).

### B) Aktions-Buttons (Bottom)
- **Ja-Button**: Standard Pill mit blauem Gradient `from-[hsl(222,100%,60%)] to-[hsl(222,100%,47%)]`, **ohne Icon**, "Ja" zentriert, font-semibold.
- **Nein-Button**: Neutrales weißes Pill mit `border-border` und `text-foreground` (NICHT destructive rot), **ohne Icon**.
- Beide gleich breit (`flex-1`), gleiche Höhe (`py-3.5`), `rounded-full`.
- Konsistent mit Memory: keine Icons, flache Ästhetik.

### C) Progress (`MultiStepProgress`)
- Beibehalten, aber Counter-Text minimal kleiner & dichter am Balken (mt-2 statt mt-2.5), bleibt zentriert.

### D) Footer "VERSCHLÜSSELT & SICHER"
- Bleibt unverändert (passt schon zum Design-System).

## Betroffene Datei
- `src/components/forms/multistep/YesNoQuestion.tsx` — Karte, Akkordeon-Ersatz, Bottom-Buttons komplett überarbeiten.

## Visuelle Skizze (Mobile)
```text
┌─────────────────────────────────┐
│ ←     Abzüge                    │
│   ▰▱▱▱▱▱▱▱▱                     │
│   Frage 1 von 9                 │
│                                 │
│                                 │
│   Zahlst du in die Säule 3a    │
│   ein?                          │
│                                 │
│         Mehr erfahren           │  ← dezenter Link
│                                 │
│                                 │
│  ┌────────┐  ┌──────────────┐   │
│  │  Nein  │  │      Ja      │   │  ← Nein neutral, Ja blau
│  └────────┘  └──────────────┘   │
│                                 │
│   🛡 VERSCHLÜSSELT & SICHER     │
└─────────────────────────────────┘
```

## Hinweis zu Memory
Konsistent mit bestehenden Regeln — keine neue Memory nötig. Reine Anwendung von `button-standardization` (keine Icons in Primärbuttons), `tax-year-card-minimalism` (Swiss flat) und `iconography-standard`.

