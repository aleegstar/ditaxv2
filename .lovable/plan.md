

# Remove colorful gradient background from User Detail header

## Problem
The User Detail page header card and UserInfoCard both use a colorful pastel gradient background (`linear-gradient(135deg, hsla(280, 60%, 85%, 1) 0%, ...)`). The user confirms this doesn't match the actual design — the tax year cards follow a minimalist white background style per the project's design memory.

## Changes

### 1. `src/pages/UserDetail.tsx` (~line 586-590)
Replace the gradient background on the header card with a clean, light style:
- Remove `linear-gradient(135deg, hsla(280, ...))`
- Use `background: hsla(0, 0%, 97%, 1)` (light white/grey matching the bottom sheet cards)
- Border: `1px solid rgba(0, 0, 0, 0.06)` instead of white
- Adjust child elements (avatar, badge backgrounds) from `bg-white/50` to appropriate neutral tones

### 2. `src/components/user-detail/UserInfoCard.tsx` (~line 14-17)
Same treatment — remove the gradient, use clean white/light background with subtle border.

Both files: 2 style property changes each, no logic changes.

