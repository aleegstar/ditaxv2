

# Plan: AI Sphere + Shimmer Text für OCR-Animation

## Überblick

Die aktuelle OCR-Validierungs-Animation in `ai-document-validation.tsx` zeigt das Ditax-Logo in einem weissen Kreis. Dieses soll durch die animierte **AI Sphere** ersetzt werden, mit dem **Shimmer-Text** darunter für die rotierenden Statusmeldungen.

---

## Visuelle Änderung

```text
┌──────────────────────────────────────────┐
│             VORHER                       │
│                                          │
│         ┌────────────┐                   │
│         │  Ditax     │  ← Statisches     │
│         │   Logo     │    Logo           │
│         └────────────┘                   │
│                                          │
│     Ditax prüft Lohnausweis              │
│     ✨ Arbeitgeber wird erkannt...       │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│             NACHHER                      │
│                                          │
│         ┌────────────┐                   │
│         │    🔮      │  ← AI Sphere      │
│         │  (video)   │    Animation      │
│         └────────────┘                   │
│                                          │
│     Ditax prüft Lohnausweis              │
│     ✨ Arbeitgeber wird erkannt...       │  ← Shimmer-Text
└──────────────────────────────────────────┘
```

---

## Technische Umsetzung

### Datei: `src/components/ui/ai-document-validation.tsx`

**Änderungen:**

1. **Sphere-Komponente importieren:**
   ```typescript
   import { Sphere } from '@/components/ui/sphere';
   ```

2. **Icon-Container ersetzen:**
   Das aktuelle Ditax-Logo-Icon wird durch die `Sphere`-Komponente ersetzt:

   ```typescript
   // VORHER: Ditax Logo in weissem Kreis
   <motion.div className="w-16 h-16 rounded-full...">
     <motion.img src={ditaxLogo} ... />
   </motion.div>

   // NACHHER: AI Sphere
   <Sphere 
     size="medium" 
     triggerPulse={isComplete}
     className="shadow-lg shadow-primary/20"
   />
   ```

3. **Shimmer-Text wird beibehalten:**
   Der bestehende `RotatingStatusText` nutzt bereits die `shimmer-text` CSS-Klasse - das bleibt unverändert.

4. **Completion-State anpassen:**
   Bei Abschluss zeigt die Sphere einen Pulse-Effekt, dann wird zum grünen Checkmark gewechselt:

   ```typescript
   <AnimatePresence mode="wait">
     {isComplete ? (
       // Grüner Checkmark wie bisher
       <motion.div className="w-16 h-16 rounded-full bg-emerald-500...">
         <Check />
       </motion.div>
     ) : (
       // AI Sphere während der Validierung
       <Sphere size="medium" />
     )}
   </AnimatePresence>
   ```

---

## Betroffene Datei

| Datei | Änderung |
|-------|----------|
| `src/components/ui/ai-document-validation.tsx` | Ditax-Logo durch Sphere-Komponente ersetzen |

---

## Erwartetes Ergebnis

- Während der OCR-Validierung wird die animierte **AI Sphere** (Video) angezeigt
- Darunter rotiert der **Shimmer-Text** mit den mehrfarbigen Gradient-Statusmeldungen (Blau → Violett → Pink)
- Bei Abschluss wechselt die Sphere zum grünen Checkmark
- Die Sphere zeigt einen Pulse-Effekt beim Übergang zu "Analyse abgeschlossen"

