# Phase 3: Redesign (OpenHands.dev Style — Full Copy)

## Goal
Complete visual overhaul to match OpenHands.dev design language. Warm palette, monospace decorative elements, smooth animations.

## Reference
- Teardown: `research/2026-03-28-openhands-teardown.md`

## Design System Changes

### Colors (replace current blue theme)
| Role | Old | New |
|------|-----|-----|
| Background | white/gray | `#f9f0d9` (cream) |
| Text | gray-900 | `#22150d` (dark brown) |
| Primary accent | blue-500 | `#FFFF8B` (yellow) |
| Code/dark areas | gray-800 | `#22150d` |
| Selection | default | Inverted (dark bg + cream text) |

### Typography
- Add monospace stack for decorative elements: `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`
- Anti-aliased text rendering
- Keep system font for body text

### New Components
- **ASCII Art Background** — Perlin noise character animation (adapted from OpenHands, customized for LenconDB branding)
- **Smooth Scroll** — Lenis with GSAP ticker integration
- **Marquee** — for partner/client logos if applicable
- **Accordion** — native `<details>` elements for FAQ/settings
- Navigation with transform-origin dropdown animations

### Tailwind Config Overhaul
- Replace color palette in `tailwind.config.js`
- Add custom colors: cream, brown, yellow-accent
- Update border-radius defaults (minimal: 0.4rem)
- Add custom animations (marquee keyframes)

### Component Restyling
- Sidebar/navigation → warm palette, dropdown animations
- Buttons → yellow accent hover, dark hover state
- Cards → cream/brown borders, minimal radius
- Modals → backdrop blur, brown overlay
- Forms → custom autofill styling (cream bg)
- Tables → brown borders, cream alternating rows
- Charts → warm color palette for Recharts

## Waves
- **Wave 1:** Tailwind config + global styles + CSS variables (1 agent)
- **Wave 2:** Core layout components (Nav, Sidebar, Header, Footer) + ASCII background (2 agents parallel)
- **Wave 3:** Page-level restyling (Workload, Projects, Analytics, Expenses, Settings — 5 agents parallel)
- **Wave 4:** Animations (Lenis + GSAP + transitions) + responsive polish (2 agents parallel)
