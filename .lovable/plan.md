
## Ziel

Die Hauptseite `/` wird radikal vereinfacht: Statt mehrerer Karten pro Steuerjahr gibt es **eine einzige aktive Ansicht** mit Pillen-Auswahl oben. Der Inhalt unten wechselt je nach Status der gewählten Steuererklärung. Eine neue **Bottom-Navbar** ersetzt die separaten Funktionskarten (Unterlagen / Chat).

## Neue Struktur von `/`

```text
┌─────────────────────────────────────┐
│ Header: Logo  ·  Profile · Menu     │
│ Greeting: "Hallo, {Name}"           │
├─────────────────────────────────────┤
│ [2025] [2024] [2023]   + Hinzufügen │  ← Pillen (aktives Jahr blau umrandet)
├─────────────────────────────────────┤
│                                     │
│   Inhalt für aktives Jahr           │
│   (siehe unten)                     │
│                                     │
├─────────────────────────────────────┤
│   [💬 Chat]      [📄 Unterlagen]    │  ← fixe Bottom-Navbar
└─────────────────────────────────────┘
```

### Pillen-Reihe (Screenshot 3)
- Horizontal scrollbare Reihe mit allen Steuerjahren des Nutzers (neueste links).
- Aktives Jahr: blaue Umrandung (`border-primary`), weisser Hintergrund, blaue Schrift.
- Inaktiv: grauer Pill (`bg-muted`).
- Letzte Pille: `+` Button → öffnet `AddTaxYearSheet`.
- State `selectedYear` lokal in `UserTaxReturns`. Default: erstes unbezahltes Jahr, sonst neuestes.

### Inhalt je nach Status (immer dieselbe Container-Breite)

**A) Entwurf / unbezahlt** → zeigt die 3-Schritt-Cards aus Screenshot 1 (entspricht `TaxYearDashboard`):
1. Persönliche Angaben (4 von 4 erledigt) — aufklappbar mit Sub-Items (Kontakt, Einkommen, Abzüge, Vermögen)
2. Belege & Unterlagen
3. Prüfung & Versand

→ `TaxYearDashboard` wird als wiederverwendbare Komponente eingebunden (umhüllt mit `FormProvider taxYear={selectedYear}`), Header/Back/TaxFilerSelector werden für Embed-Mode versteckt.

**B) Bezahlt / In Bearbeitung** → zeigt den Inhalt aus Screenshot 2 (Tracking, entspricht `TaxReturnTracking`):
- `TrackingProgressSteps` mit `workflowStep`
- `ExpressUpgradeCard`

→ Tracking-Inhalt wird in Komponente extrahiert und direkt eingebettet (kein Routing zu `/tax-return-tracking/:id` mehr nötig vom Dashboard aus, Route bleibt aber bestehen).

**C) Abgeschlossen** → zeigt Aktionen der Completed Tax Return:
- Status-Badge ("Abgeschlossen" / "Unterschrift ausstehend")
- Buttons für Ansehen/Herunterladen + ggf. Signatur-Dialog
- Inhalt aus `TaxReturnActions` Page wird wiederverwendet/extrahiert.

**D) Keine Steuererklärung vorhanden** → Empty state mit grossem "Steuerjahr hinzufügen" CTA.

### Bottom-Navbar (neu)
- Fix unten, `position: fixed`, mit `safe-area-inset-bottom`.
- Zwei Items: **Chat** (öffnet `OverlayChatBar` Overlay) und **Unterlagen** (öffnet `DocumentsOverlay`).
- Glassmorph, weisser Hintergrund mit Blur, abgerundet.
- Ersetzt die zwei "Funktionen"-Quick-Action-Karten.
- Nur auf `/` sichtbar.

## Zu entfernen / aufzuräumen in `UserTaxReturns.tsx`
- "Fortsetzen" Featured-Card (`renderUnpaidCard` für `featuredUnpaidYear`)
- "Funktionen"-Sektion mit 2 Quick-Action-Buttons
- Inline `OverlayChatBar` (zieht in Overlay aus Bottom-Navbar)
- "Steuererklärungen"-Liste (wird durch Pillen + aktiven Inhalt ersetzt)
- `MissingItemsAlert` bleibt oberhalb der Pillen.

## Technische Details

**Dateien:**
- `src/pages/UserTaxReturns.tsx` — komplett umstrukturieren (siehe oben).
- `src/components/TaxYearDashboard.tsx` — Prop `embedded?: boolean` hinzufügen, um SubpageHeader/TaxFilerSelector im Embed-Modus auszublenden.
- `src/components/dashboard/YearPillSelector.tsx` (neu) — Pillen-Reihe.
- `src/components/dashboard/HomeBottomNav.tsx` (neu) — Bottom-Navbar (Chat + Unterlagen).
- `src/components/dashboard/TrackingContent.tsx` (neu, optional) — extrahierter Inhalt aus `TaxReturnTracking` für Embedding.
- `src/components/dashboard/CompletedContent.tsx` (neu, optional) — extrahierter Inhalt aus `TaxReturnActions`.

**State in UserTaxReturns:**
- `selectedYear: string`
- abgeleitet: `selectedReturn`, `selectedStatus` ('draft' | 'processing' | 'completed').

**Routing:** Bestehende Routen `/form`, `/tax-return-tracking/:id`, `/tax-return-actions/:id` bleiben funktional (Backward-compat für Deep-Links / Notifications). Dashboard rendert deren Inhalt jetzt aber inline.

**Chat-Overlay:** `OverlayChatBar` hat bereits einen Overlay-Modus — Bottom-Nav-Button setzt internen `open`-State.

## Out of scope
- Keine Änderung an `/form` als separater Route (bleibt für Tiefenlinks).
- Keine Änderung am Admin-Bereich.
- Keine Änderung an Pull-to-Refresh-Logik.
