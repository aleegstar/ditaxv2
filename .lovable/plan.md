

# Dynamischer Status-Text mit Shimmer-Wechsel-Effekt

## Zusammenfassung
Der statische Status-Text ("Arbeitgeber wird geprüft...") wird durch eine dynamische, dokumenttyp-spezifische Animation ersetzt. Statt die Status-Texte untereinander anzuzeigen, werden sie auf einer Zeile mit einem Shimmer-Fade-Wechsel-Effekt dargestellt - ähnlich wie bei AI-Assistenten, die "überlegen".

---

## Was wird geändert

### 1. Dokumenttyp-spezifische Status-Texte
Jeder Dokumenttyp erhält eigene, kontextbezogene Status-Nachrichten:

| Dokumenttyp | Status-Texte (Beispiele) |
|-------------|-------------------------|
| Lohnausweis | "Arbeitgeber wird erkannt...", "Bruttolohn wird geprüft...", "AHV-Nr. wird validiert..." |
| Säule 3a | "Anbieter wird erkannt...", "Einzahlung wird geprüft...", "Steuerjahr wird validiert..." |
| Pensionskassenausweis | "Vorsorgeeinrichtung wird erkannt...", "Altersguthaben wird geprüft..." |
| Mieteinnahmen | "Liegenschaft wird erkannt...", "Mietzins wird geprüft..." |
| Default | Generische Texte für unbekannte Dokumenttypen |

### 2. Animierter Text-Wechsel auf einer Linie
- Texte erscheinen auf **einer einzigen Zeile**
- Wechsel alle **2-3 Sekunden** mit sanftem Fade-Out/Fade-In
- **Shimmer-Effekt** auf dem aktiven Text (wie bei "Ditax denkt nach")
- Respektiert `prefers-reduced-motion`

---

## Visuelle Darstellung

```text
┌─────────────────────────────────────────┐
│                                         │
│              [Ditax Logo]               │
│                                         │
│     Ditax prüft Säule 3a Bescheinigung  │
│                                         │
│      ✨ Anbieter wird erkannt... ✨      │  ← Shimmer + Fade-Wechsel
│                                         │
│  ┌───────────────────────────────────┐  │
│  │  Name           Max Mustermann ✓  │  │
│  │  Anbieter       VIAC              │  │
│  │  Einzahlung     ░░░░░░░░░░░       │  │
│  │  Datum          ░░░░░░░░░░░       │  │
│  └───────────────────────────────────┘  │
│                                         │
└─────────────────────────────────────────┘
```

---

## Technische Umsetzung

### Datei: `src/components/ui/ai-document-validation.tsx`

#### A. Neue Dokumenttyp-Konfiguration
```typescript
const STATUS_MESSAGES_BY_DOCTYPE: Record<string, string[]> = {
  'employment-income': [
    'Arbeitgeber wird erkannt…',
    'Bruttolohn wird geprüft…',
    'AHV-Beiträge werden validiert…',
    'Quellensteuer wird analysiert…'
  ],
  'pillar3a-certificate': [
    'Anbieter wird erkannt…',
    'Einzahlung wird geprüft…',
    'Steuerjahr wird validiert…',
    'Kontodaten werden analysiert…'
  ],
  'pillar2-statement': [
    'Vorsorgeeinrichtung wird erkannt…',
    'Altersguthaben wird geprüft…',
    'Beiträge werden validiert…'
  ],
  // ... weitere Dokumenttypen
  'default': [
    'Text wird erkannt…',
    'Daten werden analysiert…',
    'Dokument wird validiert…'
  ]
};
```

#### B. Rotierender Status-Text mit Shimmer

**Neuer State:**
```typescript
const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
```

**Timer für Text-Rotation:**
```typescript
useEffect(() => {
  if (isComplete) return;
  
  const interval = setInterval(() => {
    setCurrentMessageIndex(prev => 
      (prev + 1) % statusMessages.length
    );
  }, 2500); // Wechsel alle 2.5 Sekunden
  
  return () => clearInterval(interval);
}, [isComplete, statusMessages.length]);
```

**Animierte Darstellung:**
```tsx
<AnimatePresence mode="wait">
  <motion.p
    key={currentMessageIndex}
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -8 }}
    transition={{ duration: 0.3 }}
    className="shimmer-text text-sm text-center"
  >
    {statusMessages[currentMessageIndex]}
  </motion.p>
</AnimatePresence>
```

#### C. Prop-Erweiterung
```typescript
interface AIDocumentValidationProps {
  progress: ValidationProgress;
  documentType?: string;
  documentTypeId?: string;  // NEU: ID für Status-Lookup
  foundKeywords?: string[];
}
```

### Datei: `src/components/EnhancedDocumentUploader.tsx`
- Übergibt `documentTypeId` an `AIDocumentValidation`

### Datei: `src/components/documents/DocumentAssignmentModal.tsx`
- Übergibt `documentTypeId` an `AIDocumentValidation`

---

## Animation-Details

| Eigenschaft | Wert |
|-------------|------|
| Wechsel-Intervall | 2500ms |
| Fade-Dauer | 300ms |
| Shimmer-Geschwindigkeit | 2.5s (bestehende CSS-Klasse) |
| Y-Versatz beim Wechsel | ±8px |

---

## Accessibility

- `prefers-reduced-motion`: Shimmer und Fade werden deaktiviert
- Text bleibt lesbar ohne Animation
- Keine Layout-Verschiebungen durch konstante Zeilenhöhe

---

## Betroffene Dateien

| Datei | Änderung |
|-------|----------|
| `src/components/ui/ai-document-validation.tsx` | Haupt-Implementation |
| `src/components/EnhancedDocumentUploader.tsx` | Prop-Übergabe |
| `src/components/documents/DocumentAssignmentModal.tsx` | Prop-Übergabe |

