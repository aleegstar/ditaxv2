

## Problem Analysis

On iPhone, the Vaul drawer's opening animation causes touch target misalignment. When a user taps "2028", the touch registers on "2030" because:

1. **Vaul's spring animation** shifts the drawer content upward during opening. iOS registers touch coordinates at the moment of tap, but the content has moved due to the ongoing animation.
2. **No `touch-action: manipulation`** on the buttons, which causes iOS to apply a 300ms delay and potentially misinterpret touch positions.
3. The year list is ordered descending (2030 at top), so an upward shift during animation maps taps to the wrong item.

Additionally, the drawer closes (`setIsOpen(false)`) before calling `onYearSelect(year)`, which may cause the year selection to be lost if the component unmounts during the drawer close animation.

## Plan

### 1. Fix touch target reliability in `add-tax-year-dropdown.tsx`

- Add `touch-action: manipulation` to all year buttons to prevent iOS touch delays
- Add `style={{ WebkitTapHighlightColor: 'transparent' }}` for cleaner iOS taps
- Reverse the handler order: call `onYearSelect(year)` first, then close the drawer with a small delay
- Add `will-change: transform` to stabilize layout during animation

### 2. Fix handler timing

Change `handleYearClick` to select the year immediately, then close the drawer after a brief delay:

```typescript
const handleYearClick = (year: string) => {
  onYearSelect(year);
  setTimeout(() => setIsOpen(false), 150);
};
```

### 3. Add iOS-safe touch properties to year buttons

For both the default and card variants' year option buttons:
- Add `style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}`
- This prevents the 300ms tap delay on iOS and ensures accurate touch registration

### Technical Details

The root cause is a known Vaul/iOS interaction: Vaul uses a spring animation to slide the drawer up. On iOS Safari, touch events are processed with the visual position at tap time, but the animation hasn't settled yet. The content is still shifting, so the element under the finger at registration time differs from what the user intended.

The fix ensures:
- Touch targets are stable via `touch-action: manipulation`
- The year is selected immediately on tap (before drawer closes)
- The drawer closing doesn't race with the selection callback

Files to modify:
- `src/components/ui/add-tax-year-dropdown.tsx`

