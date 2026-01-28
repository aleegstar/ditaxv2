
# Implementierungsplan: Layout- und UX-Verbesserungen

## Zusammenfassung
Dieser Plan korrigiert die während des Audits identifizierten Layout-Inkonsistenzen und UX-Verbesserungen auf der Hauptseite und im /form-Flow.

---

## 1. SubpageHeader Breite korrigieren

**Problem:** Der SubpageHeader verwendet `max-w-7xl` statt dem Subpage-Standard `max-w-4xl`.

**Änderung:**
- **Datei:** `src/components/ui/subpage-header.tsx`
- **Zeile 37:** `max-w-7xl` ändern zu `max-w-4xl`

**Vorher:**
```tsx
<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-3">
```

**Nachher:**
```tsx
<div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
```

---

## 2. MultiStepContactForm Breite vereinheitlichen

**Problem:** Das Formular verwendet `max-w-[500px]` statt `max-w-4xl`.

**Änderung:**
- **Datei:** `src/components/forms/MultiStepContactForm.tsx`
- Container-Wrapper auf `max-w-4xl` ändern für Desktop-Konsistenz

---

## 3. iOS Safe-Area-Insets hinzufügen

**Problem:** Das Dashboard verwendet statisches `pb-28` ohne Berücksichtigung von iOS Home-Indicator.

**Änderung:**
- **Datei:** `src/pages/UserTaxReturns.tsx`
- Tailwind `pb-safe` oder CSS `env(safe-area-inset-bottom)` hinzufügen

**Implementierung:**
```tsx
// Im Footer-Bereich
<div className="pb-28 pb-[max(7rem,calc(5rem+env(safe-area-inset-bottom)))]">
```

---

## 4. Avatar onError Fallback hinzufügen

**Problem:** Fehlende Fallback-Logik wenn Avatar-Bilder nicht laden können.

**Änderung:**
- **Dateien:** `src/components/TaxYearDashboard.tsx`, `src/components/ui/subpage-header.tsx`
- `onError` Handler für Avatar-Images hinzufügen

**Implementierung:**
```tsx
<img 
  src={profile?.avatar_url || '/lovable-uploads/default-avatar.png'} 
  alt="Profil" 
  className="w-full h-full object-cover"
  onError={(e) => {
    e.currentTarget.src = '/lovable-uploads/default-avatar.png';
  }}
/>
```

---

## Technische Details

| Datei | Änderungstyp | Beschreibung |
|-------|--------------|--------------|
| `src/components/ui/subpage-header.tsx` | Edit | max-w-7xl → max-w-4xl, Avatar onError |
| `src/components/forms/MultiStepContactForm.tsx` | Edit | max-w-[500px] → max-w-4xl |
| `src/pages/UserTaxReturns.tsx` | Edit | iOS safe-area-insets |
| `src/components/TaxYearDashboard.tsx` | Edit | Avatar onError fallback |

---

## Erwartetes Ergebnis

1. Konsistente Seitenbreiten (max-w-4xl) auf allen Subpages
2. Bessere Darstellung auf iOS-Geräten mit Home-Indicator
3. Robuste Avatar-Anzeige mit Fallback bei Ladefehlern
