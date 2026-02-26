

## Problem

Beim Erfassen des Geburtsdatums auf Mobile wird sofort die Fehlermeldung "Pflichtfelder ausfüllen" angezeigt, obwohl der User noch gar nicht auf "Weiter" geklickt hat.

## Ursache

Die `MobileFriendlyDateInput`-Komponente verwendet drei `Select`-Dropdowns (Tag, Monat, Jahr). Der `SelectTrigger` von Radix UI rendert intern ein `<button>`-Element. Innerhalb eines `<form>`-Tags ist der Standard-`type` eines Buttons `"submit"`. Das bedeutet: Sobald der User auf "Tag", "Monat" oder "Jahr" klickt, wird das Formular abgeschickt und die Validierung ausgeloest — obwohl er nur ein Datum auswaehlen wollte.

## Loesung

In der Datei `src/components/ui/mobile-friendly-date-input.tsx` bei allen drei `SelectTrigger`-Elementen (Zeilen 158, 172, 186) explizit `type="button"` setzen. Das verhindert, dass der Klick auf den Dropdown das Formular abschickt.

### Aenderung

**Datei: `src/components/ui/mobile-friendly-date-input.tsx`**

Drei Stellen — alle `SelectTrigger` im Mobile-Block erhalten `type="button"`:

```tsx
// Zeile 158 — Tag
<SelectTrigger type="button" className="min-h-[48px] text-base">

// Zeile 172 — Monat
<SelectTrigger type="button" className="min-h-[48px] text-base">

// Zeile 186 — Jahr
<SelectTrigger type="button" className="min-h-[48px] text-base">
```

Eine minimale Aenderung, die das Problem vollstaendig behebt. Keine weiteren Dateien betroffen.

