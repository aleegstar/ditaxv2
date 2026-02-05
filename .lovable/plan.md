
# Plan: OCR Validierungs-Animation im AI-Research-Stil

## Übersicht

Die aktuelle Validierungs-Animation zeigt nur einen Spinner mit Fortschrittsbalken. Das neue Design soll aussehen wie eine AI-Recherche mit:
- Shimmer-animiertem Text
- "Source found" Icons für erkannte Keywords
- Schrittweise erscheinende Analyse-Zeilen

## Neues Design

```text
┌─────────────────────────────────────┐
│                                     │
│    🔍  (pulsierendes Icon)          │
│                                     │
│    Dokument wird analysiert...      │
│    ~~~ Shimmer-Text ~~~             │
│                                     │
│    ─────────────────────────────    │
│                                     │
│    ✓ Metadaten geprüft              │
│    ✓ Layout analysiert              │
│    ◌ Text wird erkannt... (shimmer) │
│    ○ Dokumenttyp wird ermittelt     │
│                                     │
│    Keywords gefunden:               │
│    ┌─────────────────────────────┐  │
│    │ 📄 Lohnausweis              │  │
│    │ 📄 Bruttolohn               │  │
│    │ 📄 AHV-Nr                   │  │
│    └─────────────────────────────┘  │
│                                     │
│    ████████████░░░░░░░░░░  65%      │
│                                     │
└─────────────────────────────────────┘
```

## Neue Komponente: AIResearchProgress

Erstellt eine neue Komponente mit:
1. **Animierter Header** - Pulsierendes Analyse-Icon
2. **Shimmer-Text** - Animierter Gradient über den Statustext
3. **Step-Liste** - Schritte mit animierten Checkmarks
4. **Keyword-Pills** - Erkannte Keywords als kleine Pills mit Icon
5. **Progress-Bar** - Schlanker Fortschrittsbalken

## Dateien

| Datei | Aktion |
|-------|--------|
| `src/components/ui/ai-research-progress.tsx` | Neu erstellen |
| `src/components/EnhancedDocumentUploader.tsx` | Validierungs-Modal ersetzen |
| `src/components/documents/DocumentAssignmentModal.tsx` | Validierungs-Modal ersetzen |
| `src/index.css` | Shimmer-Animation hinzufügen |

---

## Technische Details

### 1. Neue Komponente: AIResearchProgress

```typescript
// src/components/ui/ai-research-progress.tsx
interface AIResearchProgressProps {
  progress: ValidationProgress;
  foundKeywords?: string[];
}
```

**Features:**
- `animate-shimmer` CSS-Klasse für Text-Gradient-Animation
- Steps als Array mit Status: `pending`, `active`, `complete`
- Keywords erscheinen einzeln mit Fade-In-Animation
- Framer Motion für smooth transitions

### 2. Shimmer CSS Animation

```css
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.animate-shimmer {
  background: linear-gradient(
    90deg,
    hsl(var(--muted-foreground)) 0%,
    hsl(var(--foreground)) 50%,
    hsl(var(--muted-foreground)) 100%
  );
  background-size: 200% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  animation: shimmer 2s infinite linear;
}
```

### 3. Step-Mapping

| ValidationProgress.step | UI-Anzeige |
|------------------------|------------|
| `preparing` | Metadaten prüfen... |
| `metadata` | ✓ Metadaten geprüft |
| `layout` | Layout analysieren... |
| `compressing` | Bild wird optimiert... |
| `ocr` | Text wird erkannt... |
| `analyzing` | Dokumenttyp ermitteln... |
| `complete` | ✓ Analyse abgeschlossen |

### 4. Keywords-Erweiterung

Um Keywords anzuzeigen, muss `ValidationProgress` erweitert werden:

```typescript
interface ValidationProgress {
  step: 'preparing' | 'metadata' | 'layout' | 'compressing' | 'ocr' | 'analyzing' | 'complete';
  percent: number;
  message: string;
  foundKeywords?: string[]; // NEU
}
```

### 5. Integration in Uploader

Ersetze den aktuellen Progress-Modal-Block (Zeilen 644-677) mit der neuen `AIResearchProgress` Komponente.

## Animations-Timing

- Header-Icon: `animate-pulse` (2s)
- Shimmer-Text: `animate-shimmer` (2s linear infinite)
- Steps: Fade-In 300ms pro Step
- Keywords: Staggered Fade-In (100ms Delay zwischen jedem)
- Progress-Bar: Smooth transition `duration-300`

## Erwartetes Ergebnis

- Benutzer sehen eine professionelle "AI-Recherche"-Animation
- Klare visuelle Feedback welcher Schritt gerade läuft
- Erkannte Keywords werden als "Sources" angezeigt
- Modernes, vertrauenswürdiges Erscheinungsbild
