# Site Teardown: OpenHands

**URL:** https://openhands.dev/
**Platform:** Webflow (custom code overlays)
**Date analyzed:** 2026-03-28

## Tech Stack (Confirmed from Source)

| Technology | Evidence | Purpose |
|---|---|---|
| Webflow | HTML structure, `.w-` class prefixes, CMS bindings | Site builder / CMS |
| GSAP 3 | CDN script: `cdn.jsdelivr.net/npm/gsap@3/dist/gsap.min.js` | Animation engine (ticker for Lenis) |
| Lenis | CDN module: `@studio-freight/lenis@1/bundled/lenis.mjs` | Smooth scrolling |
| jQuery | Webflow default, `$()` calls in nav code | DOM manipulation (nav dropdowns) |
| PostHog | Inline init, `posthog.capture()`, feature flags | Analytics, A/B testing, session tracking |
| Perlin Noise (custom) | Full inline implementation | ASCII art background animation |
| Swiper (partial) | `.swiper-slide`, `.swiper-button-disabled` classes | Slider component (testimonials) |

## Design System

### Colors

| Name/Usage | Value |
|---|---|
| Background (cream) | `#f9f0d9` |
| Text / Dark brown | `#22150d` |
| Primary accent (yellow) | `#FFFF8B` |
| Code block bg | `#22150d` |
| Code block text | `#f9f0d9` |
| Code selection | `#8a5f45` |
| Dialog backdrop | `rgba(32, 21, 14, 0.50)` with `blur(8px)` |
| Muted text (in rich text) | `#7d7d7d` |
| Nav hover icon fill | `#FFFF8B` (yellow) / `#000000` (path) |
| Button hover | `#000` bg, `white` text |
| Disabled state | `opacity: 0.5` |

### Typography

| Role | Font Family | Sizes |
|---|---|---|
| Body / UI | System stack (Webflow default) | Responsive via Webflow |
| Code / ASCII | `ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace` | 12px mobile, 14px desktop (900px+) |
| ASCII art | Same monospace | 14px / line-height 14px on desktop |

### Key Design Traits
- **Warm, earthy palette** — cream background (`#f9f0d9`) + dark brown (`#22150d`), not the typical cold dark/light theme
- **Monospace as decorative element** — ASCII art background is the visual identity
- **Minimal border-radius** — `0.4rem` for code blocks, `0px` for nav dropdowns
- **Anti-aliased text** — `-webkit-font-smoothing: antialiased`
- **Custom text selection** — inverted colors (dark bg + cream text)
- **Yellow accent** (`#FFFF8B`) used sparingly for hover states and highlights

### Spacing System
- CSS custom properties for grid gaps: `--gap-main`, `--gap-md`, `--gap-sm`, `--gap-button`
- Grid uses `calc(var(--gap) / 2)` for column padding (negative margin pattern)
- Slider gap: `24px`
- Nav mobile padding: `8rem 2.5% 4rem`
- Mobile nav gap: `2rem`

### Responsive Breakpoints

| Breakpoint | Target |
|---|---|
| `max-width: 497px` | Small mobile |
| `min-width: 480px` and `max-width: 767px` | Mobile landscape |
| `min-width: 768px` and `max-width: 991px` | Tablet |
| `min-width: 900px` | Code font scaling |
| `min-width: 992px` | Desktop |
| `max-width: 1200px` | Tablets and below |
| `max-width: 85rem` (1360px) | Navigation switch to mobile |

## Effects Breakdown

| Effect | Implementation | Complexity | Cloneable? |
|---|---|---|---|
| ASCII art background | Custom Perlin noise generating text characters in `<pre>`, 30fps canvas-like rendering | High | Yes (full code available) |
| ASCII erase on mousemove | `mousemove`/`touchmove` on pre element, radial falloff buffer | Med | Yes |
| ASCII streaks | Animated line-shaped gaps moving through the ASCII field | Med | Yes (part of ASCII system) |
| Smooth scrolling | Lenis with `lerp: 0.04`, `wheelMultiplier: 0.4`, GSAP ticker integration | Low | Yes |
| Logo marquee | Custom JS: clones track children, animates `translateX` at 80px/s, infinite loop | Low | Yes |
| Hero feature slider | Data-attribute matching (`data-key`, `data-heroslide`, `data-item`), CSS transitions | Med | Yes |
| Testimonial carousel | Autoplay 8s interval, prev/next buttons, `opacity` + `active` class toggle | Low | Yes |
| Nav dropdowns | Transform origin calculated from parent center, `translateY(-4px)` reveal, `0.25s ease` | Low | Yes |
| Mobile nav slide | Fixed overlay, `transform: translate(0, -100%)` to `(0, 0)`, `450ms ease` | Low | Yes |
| Accordion (FAQ) | Native `<details>` element, icon rotates 45deg on open | Low | Yes |
| GitHub star counter | Fetch from GitHub API, `Intl.NumberFormat` compact display | Low | Yes |
| Reduced motion support | `prefers-reduced-motion` check disables Lenis, uses native scroll | Low | Yes |
| Dialog/modal | Native `<dialog>` element, backdrop blur | Low | Yes |

## Implementation Details

### ASCII Art Background (Most Impressive Effect)

The signature visual. A full-viewport `<pre>` element filled with characters that form flowing band patterns using Perlin noise.

**How it works:**
1. A grid of characters fills the container (measured by monospace character dimensions)
2. Each cell's character is determined by sampling a Perlin noise field with warping, drift, and band calculations
3. The noise creates flowing band patterns — characters alternate between `lineSet` (` OPEN HANDS @@@ `) and `randomSet` (punctuation/symbols)
4. Streaks (gap lines) move through the field
5. Gap clouds (fbm noise) create organic empty patches
6. Mouse interaction creates radial "erase" zones that fade over 0.9s
7. Runs at 30fps cap, pauses on tab visibility change

**Key config values:**
```javascript
CFG = {
  frequency: 11,          // Band density
  contrast: 0.35,         // Band sharpness
  flowSpeed: 0.018,       // Animation speed
  driftX: ~0, driftY: -0.018,  // Upward drift
  warpAmp: 0.42, warpScale: 1.4, warpSpeed: 0.001,  // Organic distortion
  randomSet: Array.from(" .,:;*+![]{}()<>-~"),
  lineSet: Array.from(" OPEN HANDS @@@ "),
  gapSet: Array.from("@"),
  fpsCap: 30,
  erase: { radiusCells: 12, durationSec: 0.9, jitter: 0.35 }
}
```

**CSS for the ASCII element:**
```css
pre.ascii-pre {
  font-size: 14px;
  line-height: 14px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
  color: var(--fg);  /* #22150d */
  /* opacity controlled by --ascii-opacity */
}

.ascii-embed {
  /* Container fills section, pre fills container */
}
```

### Hero Feature Slider

Interactive showcase with clickable "keys" that switch displayed content.

**Mechanism:**
- `.key[data-key]` elements act as tabs
- `.hero-media[data-heroslide]` elements are the media panels
- `.card[data-item]` elements are the detail cards
- Clicking a key: sets `.is-active`, shows matching media (`translateX(0%) / opacity:1`), shows matching card
- Inactive media slides off to `translateX(100%)` with `opacity:0`
- Transition: `transform 0.4s ease, opacity 0.4s ease`

### Marquee / Logo Slider

Infinite horizontal scroll of partner logos.

**Mechanism:**
- `.eyebrow-slider` container with `.track` child
- Track children are cloned until `scrollWidth >= containerWidth * 2.5`
- JavaScript `requestAnimationFrame` loop moves track at 80px/s
- When first item scrolls out of view, it's moved to the end (infinite loop illusion)
- Direction controlled by `data-direction="right"` attribute

### Lenis Smooth Scroll

```javascript
const lenis = new Lenis({
  lerp: 0.04,           // Very smooth (low lerp = more smoothing)
  wheelMultiplier: 0.4,  // Slower scroll per wheel tick
  smoothTouch: false,     // Native touch scrolling
});

gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);
```

Respects `prefers-reduced-motion` — falls back to native `scroll-behavior: auto`.

## Assets Needed to Recreate

1. **Monospace font** — System monospace stack (no custom fonts needed for ASCII)
2. **Body font** — Determine from Webflow (likely custom or system default)
3. **SVG icons** — Logo, tool icons (CLI, GitHub, GitLab, Slack), company logos for marquee
4. **Hero media** — Screenshots/videos of product for each use case tab
5. **Testimonial avatars** — Company logos or user photos

## Build Plan

### Recommended Stack
- **Framework**: Next.js or plain React (the site is mostly static with interactive widgets)
- **Styling**: Tailwind CSS (matches utility-class approach, easy to replicate spacing/colors)
- **Animation**: GSAP (already used) + Lenis for smooth scroll
- **No jQuery** — rewrite nav handlers in vanilla JS

### NPM Packages
```bash
npm install gsap @studio-freight/lenis
```

### Section-by-Section Build Order

**Section 1: ASCII Background**
- Create `AsciiBackground` component with full Perlin noise system
- Use `<pre>` element, measure character dimensions, render on `requestAnimationFrame`
- Implement mouse erase interaction
- Wrap in container that sits behind page content

**Section 2: Navigation**
- Fixed top nav with logo, link groups, dropdowns
- Mobile: full-screen overlay sliding from top
- Dropdown origin calculation for transform animations
- GitHub star count badge (fetch from API)

**Section 3: Hero**
- Tabbed interface with "key" toggles
- Media panels sliding in/out with CSS transitions
- Use case cards with active state
- CTA buttons

**Section 4: Logo Marquee**
- Infinite horizontal scroll
- Clone items to fill 2.5x viewport width
- requestAnimationFrame-based animation at 80px/s
- Mask fade on edges via CSS mask-image gradient

**Section 5: Features Grid**
- Card-based layout
- Interactive toggle (data-key matching)
- Grid/flexbox responsive layout

**Section 6: Testimonials Carousel**
- Simple slider with autoplay (8s)
- Prev/next navigation
- Opacity-based transitions

**Section 7: FAQ Accordion**
- Native `<details>` elements
- Icon rotation (45deg) on open
- Clean, minimal styling

**Section 8: Footer**
- Multi-column link layout
- Social icons
- Copyright with dynamic year

## Notes
- The ASCII art is the key differentiator — it's a custom Perlin noise implementation, not a library. The full code is available above and can be adapted.
- The warm cream/brown color scheme (`#f9f0d9` / `#22150d`) with yellow accent (`#FFFF8B`) gives a distinctive identity — avoid going generic dark/light.
- Site uses PostHog for A/B testing headlines — indicates iterative optimization culture.
- Webflow dependency can be fully eliminated — all custom code is vanilla JS + jQuery (nav only).
- Performance: ASCII art runs at 30fps cap, uses `Float32Array` for erase buffer, pauses on visibility change — already well-optimized.
- The `prefers-reduced-motion` respect is a good accessibility practice to keep.
