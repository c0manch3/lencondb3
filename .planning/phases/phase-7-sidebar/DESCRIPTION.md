# Phase 7: TopNav → Sidebar Navigation

## Goal
Replace top navigation bar with left sidebar. Add bottom nav for mobile.

## Changes
- Delete `shared/components/TopNav.tsx`
- Create `shared/components/Sidebar.tsx` — full sidebar with icons + text (~240px)
- Create `shared/components/BottomNav.tsx` — mobile bottom navigation (4-5 main items)
- Update `shared/components/Layout.tsx` — sidebar left + content right, no top padding
- Same functionality: role-based nav items, overdue badge, user dropdown, unsaved changes

## Design
- Sidebar bg: `bg-brown-900` (dark brown, same as old TopNav)
- Text: cream, active: yellow accent
- Logo "LenconDB" at top
- Nav items with icons + labels
- User section at bottom (avatar + name + logout)
- Desktop: sidebar always visible
- Mobile (<768px): sidebar hidden, bottom nav appears
