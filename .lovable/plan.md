
# Plan: Rainbow Shadow für Social Login Container

## Ziel

Ein animierter Rainbow-Glow-Effekt (wie beim "Get Unlimited Access" Button) soll hinter dem Social Login Container erscheinen. Der Effekt wird nach oben hin ausstrahlen und dem Container einen Premium-Look verleihen.

## Screenshot-Analyse

| Element | Beschreibung |
|---------|--------------|
| Screenshot 1 | Rainbow-Button mit animiertem Farbverlauf-Schatten unter dem Button |
| Screenshot 2 | Social Login Container mit dunklem Hintergrund - hier soll der Rainbow-Glow nach oben hin angewendet werden |

## Technische Umsetzung

### Vorhandene Ressourcen

Das Projekt hat bereits:
- CSS-Variablen für Rainbow-Farben (`--color-1` bis `--color-5`)
- `animate-rainbow` Animation in Tailwind
- Rainbow-Keyframes in `tailwind.config.ts`

### Änderungen an `src/pages/Auth.tsx`

Im Social Login Container (Zeile 577) wird ein Pseudo-Element oder zusätzliches `div` hinzugefügt:

```text
┌────────────────────────────────────────┐
│     ~~~~ Rainbow Glow (nach oben) ~~~~ │
├────────────────────────────────────────┤
│                                        │
│      ┌──────────────────────────┐      │
│      │   Weiter mit Google      │      │
│      └──────────────────────────┘      │
│                                        │
│      ┌──────────────────────────┐      │
│      │   Weiter mit Apple       │      │
│      └──────────────────────────┘      │
│                                        │
│         Impressum • Datenschutz        │
│                                        │
└────────────────────────────────────────┘
```

### Code-Implementierung

1. **Wrapper-Struktur anpassen** (Zeile 577):

```tsx
{/* Social Login Container mit Rainbow Glow */}
<div className="relative">
  {/* Rainbow Glow Element - positioned behind */}
  <div 
    className="absolute -top-8 left-1/2 -translate-x-1/2 w-[80%] h-16 
               animate-rainbow bg-[length:200%] rounded-full blur-2xl opacity-60
               bg-[linear-gradient(90deg,hsl(var(--color-1)),hsl(var(--color-5)),
               hsl(var(--color-3)),hsl(var(--color-4)),hsl(var(--color-2)))]"
    style={{ '--speed': '4s' } as React.CSSProperties}
  />
  
  {/* Existing container */}
  <div className="flex flex-col items-center ... bg-gradient-to-b from-slate-700 to-slate-900 ...">
    {/* Social buttons content */}
  </div>
</div>
```

### Rainbow Glow Styling

| Eigenschaft | Wert | Zweck |
|-------------|------|-------|
| `position` | absolute, -top-8 | Positioniert über dem Container |
| `width` | 80% | Schmaler als Container für natürlichen Glow |
| `height` | 16 (4rem) | Höhe des Glow-Bereichs |
| `blur-2xl` | blur(40px) | Weicher Schatten-Effekt |
| `opacity-60` | 0.6 | Subtiler aber sichtbarer Effekt |
| `animate-rainbow` | 4s linear infinite | Animierter Farbverlauf |
| `rounded-full` | Abgerundet | Organische Glow-Form |

## Erwartetes Ergebnis

- Animierter Rainbow-Glow strahlt nach oben vom Social Login Container
- Gleiche Farbpalette wie beim Rainbow-Button (rot, violett, blau, cyan, grün)
- Sanfte, professionelle Animation die kontinuierlich läuft
- Container selbst bleibt unverändert dunkel

## Datei-Änderungen

| Datei | Änderung |
|-------|----------|
| `src/pages/Auth.tsx` | Rainbow Glow div über dem Social Login Container hinzufügen |
