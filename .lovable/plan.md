

# Welcome Flow Animation Fix

## Problem

Der aktuelle Ablauf ist falsch:
1. Schritt 3 (Steuerjahr) → GIF Animation → Schritt 4 (Familie)

**Gewünschter Ablauf:**
1. Schritt 3 (Steuerjahr) → direkt Schritt 4 (Familie)
2. Schritt 4 (Familie) → Übergangsanimation → Hauptseite `/`

---

## Lösung

### Änderungen in WelcomeFlow.tsx

**1. GIF-Import entfernen (Zeile 12)**
```typescript
// ENTFERNEN:
import ditaxSplashTransition from '@/assets/ditax-splash-transition.gif';
```

**2. handleSaveData vereinfachen (Zeile 70-130)**

Daten speichern und direkt zu Schritt 4 wechseln (ohne Animation):

```typescript
const handleSaveData = async () => {
  setIsLoading(true);
  try {
    // ... Supabase calls bleiben gleich ...
    
    // Direkt zu Schritt 4 ohne Animation
    setDataSaved(true);
    setCurrentStep(3);
  } catch (error) {
    // ... error handling ...
  } finally {
    setIsLoading(false);
  }
};
```

**3. handleFamilyLater und handleFamilyNow anpassen (Zeile 132-138)**

Übergangsanimation vor Navigation zeigen:

```typescript
const handleFamilyLater = async () => {
  setShowTransition(true);
  await new Promise(resolve => setTimeout(resolve, 800));
  navigate('/', { replace: true });
};

const handleFamilyNow = async () => {
  setShowTransition(true);
  await new Promise(resolve => setTimeout(resolve, 800));
  navigate('/tax-filers', { replace: true });
};
```

**4. Übergangsanimation anpassen (Zeile 329-355)**

Statisches Logo statt GIF verwenden:

```tsx
<AnimatePresence>
  {showTransition && (
    <motion.div 
      className="fixed inset-0 z-[51] bg-white flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
    >
      <motion.img 
        src="/lovable-uploads/e9306e57-1198-4333-abcf-b510c9713e63.png"
        alt="ditax"
        className="h-16 w-auto object-contain"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1, duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
      />
    </motion.div>
  )}
</AnimatePresence>
```

---

## Neuer Ablauf

```text
Schritt 1 (Consent)
      ↓
Schritt 2 (Name)
      ↓
Schritt 3 (Jahr)
      ↓ [Daten speichern im Hintergrund]
Schritt 4 (Familie)
      ↓
┌─────────────────────────────────────┐
│   Übergangsanimation (Logo fade)    │
│   ~800ms                            │
└─────────────────────────────────────┘
      ↓
Hauptseite (/) oder /tax-filers
```

---

## Datei

| Datei | Änderung |
|-------|----------|
| `src/components/welcome/WelcomeFlow.tsx` | GIF entfernen, Animation-Timing anpassen |

