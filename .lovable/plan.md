

## Plan: Dokumentation verbessern -- aussagekräftiger Inhalt mit visuellen UI-Mockups

### Problem
Die aktuelle Dokumentation ist textlastig, funktionsbasiert und nicht anschaulich. Es fehlen visuelle Elemente, die dem User zeigen, wie die App aussieht und wie die Schritte ablaufen.

### Ansatz
Da zur Build-Time keine echten Screenshots erstellt werden können, baue ich **illustrative UI-Mockups als React-Komponenten** direkt in die Artikel ein. Diese zeigen stilisierte App-Screens (Dashboard, Upload, Formulare etc.) und machen die Dokumentation visuell ansprechend und verständlich.

### Änderungen

**1. `src/components/docs/DocsContent.ts`** -- Inhalte komplett überarbeiten
- Texte umschreiben: weniger Aufzählungslisten, mehr erklärende Absätze mit konkreten Beispielen
- Subtitles für alle Artikel hinzufügen (kurzer Nutzen-Satz)
- Markdown-Inhalte mit Tipps, Hinweisen und konkreten Szenarien anreichern (z.B. "Du bist Arbeitnehmer und hast eine Säule 3a? So gehst du vor...")
- Callout-Boxen via Markdown-Konvention (z.B. `> **Tipp:**`)

**2. `src/components/docs/DocsArticleContent.tsx`** -- Visuelle UI-Mockups einbauen
- Neue interne Komponenten für illustrative App-Mockups:
  - `DashboardMockup` -- zeigt stilisierten Dashboard-Screen mit Steuerjahr-Card, Fortschrittsanzeige
  - `UploadMockup` -- zeigt Dokumenten-Upload-Bereich mit Drag&Drop und Status-Icons
  - `FormMockup` -- zeigt ein Formularfeld-Beispiel (Einkommen/Abzüge)
  - `StatusMockup` -- zeigt die Status-Timeline (Erfassung → Eingereicht → Fertig)
  - `PaymentMockup` -- zeigt Zahlungs-Screen mit TWINT/Kreditkarte
- Jeder Mockup ist eine leichte, stilisierte Darstellung im Ditax-Design (primary color, rounded corners, border)
- Mockups werden per `articleId` in die passenden Artikel eingebettet
- Rich-Layout (wie bei Introduction) für die wichtigsten Artikel: Registration, Upload, Status

**3. `src/components/docs/DocsArticleContent.tsx`** -- Callout/Tipp-Komponente
- Wiederverwendbare `DocsTip` und `DocsWarning` Komponenten für Hinweisboxen
- Werden in den Markdown-Renderer als Custom-Elemente oder direkt in die Rich-Layouts integriert

### Betroffene Dateien
| Datei | Aktion |
|-------|--------|
| `src/components/docs/DocsContent.ts` | Alle Artikel-Texte überarbeiten |
| `src/components/docs/DocsArticleContent.tsx` | UI-Mockup-Komponenten + Rich-Layouts für mehr Artikel |
| `src/pages/Help.tsx` | TOC-Headings ggf. anpassen |

### Technische Details
- Mockups sind reine React/Tailwind-Komponenten, keine externen Bilder
- Nutzen die bestehenden Farben (primary, border, muted) und das Ditax-Logo aus `src/assets/`
- Kein neuer Dependency-Bedarf
- Die Mockups sind responsive und passen sich an die Dokumentations-Breite an

