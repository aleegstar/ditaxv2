

# Plan: Upload-Problem beheben

## Problem-Analyse

Nach eingehender Untersuchung des Codes habe ich folgende Probleme identifiziert:

### 1. Fehlende Fehlerbehandlung in der Upload-Kette
Der Upload-Flow besteht aus mehreren Schritten:
1. File-Auswahl -> 2. Validierung (OCR) -> 3. Upload -> 4. Erfolg

Das Problem: **Wenn der Upload im Schritt 3 hängt oder fehlschlägt, gibt es keine Recovery-Logik.** Der Status bleibt auf "Wird hochgeladen..." ohne Timeout.

### 2. Potenzielle Ursachen
- **Tesseract-WASM Initialisierung**: Kann bei fehlenden WASM-Dateien hängen bleiben
- **Kein Upload-Timeout**: Wenn der Storage-Upload fehlschlägt, gibt es keine automatische Wiederherstellung
- **Status-Update Race Condition**: Doppelte Status-Updates zwischen `handleFileSelect` und `uploadFile`

## Lösungsplan

### Änderung 1: Upload-Timeout mit automatischer Fehlerbehandlung
**Datei:** `src/hooks/use-inline-upload.ts`

- Timeout von 45 Sekunden für den gesamten Upload-Prozess hinzufügen
- Bei Timeout: Fehlerstatus setzen und Benutzer informieren
- Fehler-Recovery: Clear-Funktion für abgestürzten Upload-State

### Änderung 2: Robuste Status-Übergänge
**Datei:** `src/hooks/use-inline-upload.ts`

- Status-Updates konsolidieren (keine doppelten Updates)
- Sicherstellen, dass bei jedem Fehler der Status korrekt auf 'error' gesetzt wird
- Try-catch-Block um den gesamten Upload-Flow

### Änderung 3: Validierungs-Timeout
**Datei:** `src/hooks/use-inline-upload.ts`

- Separates Timeout für die OCR-Validierung (20 Sekunden)
- Bei Timeout: Validierung überspringen und direkt zum Upload übergehen
- Keine Blockierung der Upload-Funktionalität durch fehlgeschlagene OCR

## Technische Details

```text
┌─────────────────────────────────────────────────────────────┐
│                    Verbesserter Upload-Flow                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Datei-Auswahl                                              │
│       ↓                                                     │
│  ┌─────────────────┐                                        │
│  │  Validierung    │ ◄── 20s Timeout                        │
│  │  (OCR/AI)       │     Bei Timeout: Skip & Upload         │
│  └────────┬────────┘                                        │
│           ↓                                                 │
│  ┌─────────────────┐                                        │
│  │  Upload         │ ◄── 45s Timeout                        │
│  │  (Storage + DB) │     Bei Timeout: Error + Toast         │
│  └────────┬────────┘                                        │
│           ↓                                                 │
│  ┌─────────────────┐                                        │
│  │  Erfolg         │                                        │
│  │  State cleared  │                                        │
│  └─────────────────┘                                        │
│                                                             │
│  ⚠ Bei jedem Fehler: Status → 'error' + Toast               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Zusammenfassung der Änderungen

| Datei | Änderung |
|-------|----------|
| `src/hooks/use-inline-upload.ts` | Timeout-Logik für Validierung (20s) und Upload (45s) hinzufügen |
| `src/hooks/use-inline-upload.ts` | Robuste Fehlerbehandlung mit garantiertem Status-Reset |
| `src/hooks/use-inline-upload.ts` | Logging für bessere Diagnose hinzufügen |

