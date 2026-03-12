

# UI Design System Audit & Consolidation Plan

## 1. Current State — Inventory & Inconsistencies

### Dialogs / Modals (5 competing implementations)

| Component | File | Used in | Style |
|---|---|---|---|
| `Dialog` (base) | `ui/dialog.tsx` | 18 files | Dark theme support, `bg-black/80` overlay, `rounded-2xl` |
| `Dialog` (modern) | `ui/modern-dialog.tsx` | 4 files | Frosted glass, `rgba(255,255,255,0.95)`, `rounded-3xl` |
| `AlertDialog` (base) | `ui/alert-dialog.tsx` | 5 files | Frosted glass, uses `buttonVariants` |
| `AlertDialog` (modern) | `ui/modern-alert-dialog.tsx` | 2 files | Frosted glass, `rounded-3xl` |
| `UnifiedAlertDialog` | `ui/unified-alert-dialog.tsx` | 5 files | Centered icon, frosted glass, `rounded-3xl` |

**Inconsistencies**: Different border-radius (2xl vs 3xl), different overlays (black/80 vs white/2e + blur), different close button styles (X icon vs circle bg-slate-100), different padding (p-6 vs p-8), different shadow systems.

### Headers (1 main, inline variants)
- `SubpageHeader` used in ~25 files — consistent but has some issues: hardcoded `bg-white`, avatar navigation baked in, no overlay-dismiss variant.

### Bottom Sheets (2 implementations)
- `Drawer` (Vaul) with `bottom-sheet` variant — used in ~3 files
- Custom CSS `BottomSheet` in `add-tax-year-dropdown.tsx` — avoids Vaul for touch stability

### Buttons (2+ systems)
- `Button` component with 6 variants (default, destructive, outline, secondary, ghost, link) and 4 sizes
- `RainbowButton` — separate component, not using Button system
- `UnifiedAlertDialogAction` — its own button styling, not using `buttonVariants`
- Inline button styles scattered across pages (e.g., Auth page custom buttons)

---

## 2. Design Standard — Single Source of Truth

### A) `AppHeader`
- Consolidate into enhanced `SubpageHeader` (rename to `AppHeader`)
- Fixed height: `h-14` (56px)
- Padding: `px-4 py-3`
- Background: `bg-background` (not hardcoded white)
- Left: Back button `w-10 h-10 rounded-full bg-muted/50 border border-border/40`, min touch target 44px
- Center: Title `text-[15px] font-semibold text-foreground`, single line with `truncate`
- Right: Optional action slot, same 44px touch target
- Sticky with `backdrop-blur-sm`
- New prop: `mode: 'page' | 'overlay'` — overlay mode calls `onClose` instead of navigate

### B) `AppDialog`
- Merge all 5 dialog/alert implementations into 2 components:
  - `AppDialog` (general content dialogs) — replaces `dialog.tsx` + `modern-dialog.tsx`
  - `AppAlertDialog` (confirmations/destructive) — replaces `alert-dialog.tsx` + `modern-alert-dialog.tsx` + `unified-alert-dialog.tsx`
- Unified styling:
  - Overlay: `bg-black/40 backdrop-blur-sm`
  - Container: `rounded-2xl`, `bg-background`, `border border-border/40`
  - Shadow: `shadow-[0_8px_40px_-12px_rgba(0,0,0,0.12)]`
  - Padding: `p-6`
  - Close button: `w-10 h-10 rounded-full bg-muted/50` top-right
  - Sizes: `sm` (max-w-sm), `default` (max-w-md), `lg` (max-w-lg), `xl` (max-w-4xl)
- `AppAlertDialog` keeps the centered icon pattern from `UnifiedAlertDialog` (it works well)
- Buttons use the `AppButton` system (see below)

### C) `AppBottomSheet`
- Keep Vaul `Drawer` as the base, with the `bottom-sheet` variant as default
- Standardize:
  - `rounded-t-[24px]`
  - Drag handle: `h-1 w-10 rounded-full bg-muted-foreground/20`, centered, `mt-3 mb-2`
  - Padding: `px-5 pb-6`
  - Max height: `max-h-[85vh]`
  - Overlay: frosted (`backdrop-blur-sm`)
- Keep the custom CSS fallback for touch-critical flows (per memory note)

### D) `AppButton` (Button System)
- Extend existing `Button` component — it's already well-structured
- Adjustments needed:
  - Remove gradient from `default` variant → use solid `bg-primary text-primary-foreground`
  - Remove gradient from `destructive` → solid `bg-destructive text-destructive-foreground`
  - Standardize sizes to 3: `sm` (h-9), `default` (h-11), `lg` (h-13)
  - Add `loading` prop with spinner
  - Add `icon` size (w-10 h-10, min 44px touch target)
  - Ensure all touch targets meet 44px minimum
- Retire `RainbowButton` — replace with `variant="primary"` or remove usage
- Migrate `UnifiedAlertDialogAction/Cancel` to use `buttonVariants` internally

---

## 3. Implementation Plan

### Phase 1: Create unified components
1. **Enhance `Button`** — add loading state, adjust variants to solid colors, standardize sizes
2. **Create `AppDialog`** — single dialog component with size variants, unified overlay/shadow
3. **Create `AppAlertDialog`** — confirmation dialog with icon support, using `Button` for actions
4. **Enhance `SubpageHeader`** → rename conceptually but keep file, add `mode` prop, use design tokens

### Phase 2: Migration
5. **Migrate all dialog imports** — 18 files using `ui/dialog`, 4 using `modern-dialog`, 5 using `alert-dialog`, 2 using `modern-alert-dialog`, 5 using `unified-alert-dialog` → point to new unified components
6. **Migrate all header usages** — update 25 SubpageHeader consumers to use new props/tokens
7. **Migrate inline button styles** — Auth page, form pages, admin pages
8. **Remove deprecated files** — `modern-dialog.tsx`, `modern-alert-dialog.tsx` (keep `unified-alert-dialog.tsx` as alias or merge)

### Phase 3: Consistency pass
9. **Audit every screen** for remaining hardcoded colors, inconsistent spacing, one-off styles

---

## 4. Scope & Risk

This is a **large refactor touching 40+ files**. To manage risk:
- Phase 1 (components) can be done without breaking anything — new components alongside old
- Phase 2 (migration) should be done per-component-type to keep changes reviewable
- Phase 3 is a polish pass

**Estimated scope**: ~15-20 file edits for Phase 1, ~35+ for Phase 2.

I recommend starting with **Phase 1** (creating the unified components) and then migrating incrementally. Shall I proceed with Phase 1 first?

