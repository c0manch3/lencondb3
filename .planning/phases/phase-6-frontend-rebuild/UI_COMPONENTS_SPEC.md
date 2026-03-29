# OpenHands UI Components — Design Reference for LenconDB Rebuild

**Source:** https://openhands.dev/ (analyzed 2026-03-29)
**Purpose:** Guide for rebuilding all UI components from scratch

## Key Design Principles
- **No shadows on cards** — flat design, borders only
- **Border-radius: 0.4rem** everywhere (buttons, cards, inputs, modals)
- **No gradients** on UI elements
- **Minimal transitions** — 0.3s ease for interactive states
- **ASCII background on ALL pages** (not just login)

## Color System

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-cream` | `#f9f0d9` | Page background, card backgrounds |
| `--text-brown` | `#22150d` | Text, dark backgrounds (nav, buttons) |
| `--accent-yellow` | `#FFFF8B` | Hover highlights, active states |
| `--border-brown` | `rgba(34, 21, 13, 0.15)` | Default borders |
| `--border-brown-strong` | `rgba(34, 21, 13, 0.3)` | Emphasized borders |
| `--muted` | `#7d7d7d` | Secondary text |
| `--code-selection` | `#8a5f45` | Code block selection |

## Buttons

### Primary Button
- Background: `#22150d` (dark brown)
- Text: `#f9f0d9` (cream) or white
- Border: none
- Border-radius: `0.4rem`
- Hover: `background: #000; color: white`
- Padding: ~`0.75rem 1.5rem`
- Font-weight: 500-600
- Cursor: pointer
- Transition: `all 0.3s ease`

### Secondary/Outline Button
- Background: transparent
- Border: `1px solid rgba(34, 21, 13, 0.3)`
- Text: `#22150d`
- Hover: `background: rgba(34, 21, 13, 0.05)`
- Same radius and padding as primary

### Ghost Button
- Background: transparent
- No border
- Text: `#22150d`
- Hover: `background: rgba(34, 21, 13, 0.05)`

### Disabled Button
- `opacity: 0.5`
- `pointer-events: none`

## Cards/Panels

### Standard Card
- Background: cream (`#f9f0d9` or slightly lighter)
- Border: `1px solid rgba(34, 21, 13, 0.15)`
- Border-radius: `0.4rem`
- **No shadow** (flat design)
- Padding: `1.5rem` to `2rem`

### Active Card (selected state)
- Border: `1px solid rgba(34, 21, 13, 0.3)` (stronger)
- Or: subtle background change

### Interactive Card
- `cursor: pointer`
- Hover: border strengthens or subtle bg change
- Transition: `all 0.25s ease`

## Form Elements

### Text Input
- Background: cream (same as page, or transparent)
- Border: `1px solid rgba(34, 21, 13, 0.15)`
- Border-radius: `0.4rem` (NOT 0 — site resets to 0 then applies 0.4rem)
- Padding: `0.75rem 1rem`
- Color: `#22150d`
- Placeholder: `rgba(34, 21, 13, 0.4)`
- Focus: `border-color: rgba(34, 21, 13, 0.5)` or `outline: 2px solid var(--accent-yellow); outline-offset: 2px`
- Autofill override: cream background + brown text

### Select Dropdown
- Same as text input
- Custom arrow: CSS pseudo-element `::after` with border chevron
- Arrow size: `0.4rem`
- Arrow: `border-top: 2px solid; border-right: 2px solid; transform: rotate(135deg)`

### Checkbox / Toggle
- Custom styled (hide native)
- Brown themed

## Tables

### Table Header
- Text: uppercase or small-caps, letter-spacing
- Color: muted brown
- Border-bottom: `1px solid rgba(34, 21, 13, 0.15)`
- Text-align: left (first column), varies others
- Font-weight: 600
- Font-size: smaller than body

### Table Row
- Border-bottom: `1px solid rgba(34, 21, 13, 0.1)`
- No alternating row colors (flat)
- Padding: `0.75rem 1rem`
- Hover: subtle background change (optional)

### Table - Mobile (≤497px)
- Reduced padding: `0.5rem`
- Responsive columns hide or stack

## Badges / Tags

### Status Badge
- Border-radius: full (`9999px`) or `0.4rem`
- Padding: `0.25rem 0.75rem`
- Font-size: 0.75rem
- Font-weight: 500
- Colors: context-dependent (green for active, brown for default)

## Modals / Dialogs

### Dialog
- `display: flex` when `[open]`
- Backdrop: `rgba(32, 21, 14, 0.50)` + `backdrop-filter: blur(8px)`
- Card: cream background, `0.4rem` radius, no shadow
- Content padding: `1.5rem` to `2rem`
- Close button: top-right, icon button

## Navigation (TopNav)

### Nav Bar
- Background: `#22150d` (dark brown)
- Height: ~`4rem`
- Position: fixed, top
- Z-index: high (50+)
- Logo: monospace font, cream colored, `font-weight: bold`

### Nav Links (Desktop)
- Color: cream (light on dark)
- Active: `#FFFF8B` (yellow accent) or underline
- Hover: brighter/yellow tint
- Transition: `color 0.3s ease`
- Gap: `1.5rem` to `2rem`

### Dropdown
- Background: cream
- Border: `1px solid rgba(34, 21, 13, 0.15)`
- Border-radius: `0.4rem`
- Transform origin: from parent center
- Enter: `opacity 0→1, translateY(-4px)→0` in `0.25s ease`
- Icon hover: `fill: #FFFF8B` (yellow)

### Mobile Menu
- Full screen overlay
- Background: `#22150d`
- Slide from top: `translateY(-100%) → translateY(0)` in `450ms ease`
- Links: cream colored, larger font
- Body scroll lock when open

## Accordion / Expandable

- Native `<details>` element
- Hide marker: `summary::-webkit-details-marker { display: none }`
- Icon rotates: `rotate(45deg)` on open
- Content: smooth height transition

## Icons

- Style: outline SVGs, minimal
- Size: `1rem` to `1.25rem` in nav, `1.5rem` in features
- Color: inherits text color
- Hover: fill changes to `#FFFF8B` or inverts

## Spacing System

| Context | Value |
|---------|-------|
| Section padding | `4rem 0` to `6rem 0` (desktop) |
| Card padding | `1.5rem` to `2rem` |
| Input padding | `0.75rem 1rem` |
| Button padding | `0.75rem 1.5rem` |
| Nav gap | `1.5rem` |
| Grid gap (default) | `1.5rem` to `2rem` |
| Grid gap (small) | `0.75rem` to `1rem` |

## Responsive Breakpoints

| Breakpoint | Target |
|------------|--------|
| `≤497px` | Small mobile |
| `480-767px` | Mobile landscape |
| `768-991px` | Tablet |
| `≥992px` | Desktop |
| `≤1200px` | Nav switches to mobile |

## ASCII Background (GLOBAL)
- Must be present on **ALL pages**, not just login
- Opacity: ~0.06-0.09 on light pages, ~0.08-0.12 on dark pages
- Color: `#22150d` on cream pages, `#f9f0d9` on dark pages
- `pointer-events: none` on container (but `auto` on pre for mouse interaction)
- `aria-hidden: true`
- 30fps cap, pauses on tab hidden
