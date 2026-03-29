import { useEffect, useRef } from 'react';

// ---------------------------------------------------------------------------
// Configuration — adapted from OpenHands.dev ASCII art system
// Key change: lineSet uses " LENCON DB @@@ " instead of " OPEN HANDS @@@ "
// ---------------------------------------------------------------------------

const CFG = {
  angleDeg: 0,
  frequency: 11,
  contrast: 0.35,
  edgeWidth: 0.04,
  gapLevel: 0.3,
  flowSpeed: 0.018,
  flowAngleOffset: 0,
  flowReverse: false,
  flowMode: 'up' as const,
  driftX: 1.1021821192326178e-18,
  driftY: -0.018,
  warpAmp: 0.42,
  warpScale: 1.4,
  warpSpeed: 0.001,
  bandJitter: {
    enabled: true,
    amp: 0.2,
    scale: 0.85,
    speed: 0.05,
  },
  randomSet: Array.from(' .,:;*+![]{}()<>-~'),
  lineSet: Array.from(' LENCON DB @@@ '),
  gapSet: Array.from('@'),
  randomChangeHz: 1.5,
  lineThreshold: 0,
  gapThreshold: 1,
  gapFan: {
    enabled: true,
    strength: 0.5,
  },
  streaks: {
    enabled: true,
    count: 3,
    char: ' ',
    randomDirection: true,
    useDriftDirection: true,
    angleJitterDeg: 75,
    widthMin: 0.008,
    widthMax: 0.028,
    lengthMin: 0.22,
    lengthMax: 0.7,
    speedMin: 0.12,
    speedMax: 0.3,
    startMargin: 0.18,
  },
  gapClouds: {
    enabled: true,
    density: 0.08,
    scale: 1.6,
    speed: 0.03,
    octaves: 3,
    hardness: 0.85,
  },
  erase: {
    enabled: true,
    radiusCells: 12,
    durationSec: 0.9,
    jitter: 0.35,
    hardness: 0.6,
  },
  fpsCap: 30,
};

// ---------------------------------------------------------------------------
// Perlin Noise — 256-entry circular gradient table + deterministic permutation
// ---------------------------------------------------------------------------

interface GradVec {
  x: number;
  y: number;
}

const G: GradVec[] = [];
for (let i = 0; i < 256; i++) {
  const a = (i / 256) * Math.PI * 2;
  G[i] = { x: Math.cos(a), y: Math.sin(a) };
}

const P = new Uint8Array(512);
(function seedPerm() {
  const base = new Uint8Array(256);
  for (let i = 0; i < 256; i++) base[i] = i;
  let s = 1234567;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 0xffffffff);
  for (let i = 255; i > 0; i--) {
    const j = (rnd() * (i + 1)) | 0;
    const tmp = base[i];
    base[i] = base[j];
    base[j] = tmp;
  }
  for (let i = 0; i < 512; i++) P[i] = base[i & 255];
})();

// ---------------------------------------------------------------------------
// Noise utilities
// ---------------------------------------------------------------------------

function clamp(v: number, a: number, b: number): number {
  return v < a ? a : v > b ? b : v;
}

function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function grad(ix: number, iy: number, x: number, y: number): number {
  const X = ix & 255;
  const Y = iy & 255;
  const g = G[P[X + P[Y]]];
  return g.x * (x - ix) + g.y * (y - iy);
}

function perlin(x: number, y: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = x0 + 1;
  const y1 = y0 + 1;
  const sx = fade(x - x0);
  const sy = fade(y - y0);
  const n00 = grad(x0, y0, x, y);
  const n10 = grad(x1, y0, x, y);
  const n01 = grad(x0, y1, x, y);
  const n11 = grad(x1, y1, x, y);
  const ix0 = n00 + sx * (n10 - n00);
  const ix1 = n01 + sx * (n11 - n01);
  return ix0 + sy * (ix1 - ix0);
}

function fbm(
  x: number,
  y: number,
  oct = 3,
  gain = 0.5,
  lac = 2
): number {
  let v = 0;
  let amp = 1;
  let f = 1;
  let norm = 0;
  for (let i = 0; i < oct; i++) {
    v += amp * perlin(x * f, y * f);
    norm += amp;
    amp *= gain;
    f *= lac;
  }
  return v / (norm || 1);
}

// ---------------------------------------------------------------------------
// Hash functions for deterministic character selection
// ---------------------------------------------------------------------------

function hash32(n: number): number {
  n = (n >>> 0) + 0x9e3779b9;
  n ^= n >>> 16;
  n = Math.imul(n, 0x85ebca6b);
  n ^= n >>> 13;
  n = Math.imul(n, 0xc2b2ae35);
  n ^= n >>> 16;
  return n >>> 0;
}

function hash3(x: number, y: number, z: number): number {
  let h = 2166136261;
  h ^= x | 0;
  h = Math.imul(h, 16777619);
  h ^= y | 0;
  h = Math.imul(h, 16777619);
  h ^= z | 0;
  h = Math.imul(h, 16777619);
  return h >>> 0;
}

function pickFrom(arr: readonly string[], h: number): string {
  return arr[h % arr.length];
}

function randRange(a: number, b: number): number {
  return a + Math.random() * (b - a);
}

// ---------------------------------------------------------------------------
// Streak types and factory
// ---------------------------------------------------------------------------

interface Streak {
  dirx: number;
  diry: number;
  nrmx: number;
  nrmy: number;
  p0: number;
  width: number;
  length: number;
  speed: number;
  headStart: number;
  bornAt: number;
}

function makeDir(): { dx: number; dy: number; nx: number; ny: number } {
  let dx = CFG.driftX || 0.0001;
  let dy = CFG.driftY || 0;
  if (CFG.streaks.enabled && CFG.streaks.randomDirection) {
    let baseAngle = CFG.streaks.useDriftDirection
      ? Math.atan2(dy, dx)
      : 0;
    baseAngle +=
      randRange(-1, 1) * CFG.streaks.angleJitterDeg * (Math.PI / 180);
    dx = Math.cos(baseAngle);
    dy = Math.sin(baseAngle);
  }
  const len = Math.hypot(dx, dy) || 1;
  dx /= len;
  dy /= len;
  return { dx, dy, nx: -dy, ny: dx };
}

function makeStreak(t: number): Streak {
  const s = CFG.streaks;
  const m = s.startMargin;
  const D = makeDir();
  return {
    dirx: D.dx,
    diry: D.dy,
    nrmx: D.nx,
    nrmy: D.ny,
    p0: randRange(-m, 1 + m),
    width: randRange(s.widthMin, s.widthMax),
    length: randRange(s.lengthMin, s.lengthMax),
    speed: randRange(s.speedMin, s.speedMax),
    headStart: -(randRange(s.lengthMin, s.lengthMax) + m),
    bornAt: t,
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface AsciiBackgroundProps {
  /** CSS opacity for the entire ASCII layer (0 to 1). Default 0.09 */
  opacity?: number;
  /** Text color. Default: #22150d */
  color?: string;
  className?: string;
}

export default function AsciiBackground({
  opacity = 0.09,
  color = '#22150d',
  className = '',
}: AsciiBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const hostEl = containerRef.current;
    if (!hostEl) return;
    // Non-null alias for closures (TS narrowing doesn't propagate into nested fns)
    const host: HTMLDivElement = hostEl;

    // Create <pre> element
    const pre = document.createElement('pre');
    pre.className = 'ascii-pre';
    pre.setAttribute('aria-hidden', 'true');
    pre.style.cssText = `
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
      font-size: 14px;
      line-height: 14px;
      color: ${color};
      white-space: pre;
      overflow: hidden;
      pointer-events: auto;
      background: transparent;
    `;
    host.appendChild(pre);

    // Mutable state
    let cols = 0;
    let rows = 0;
    let sShort = 1;
    let cellW = 8;
    let cellH = 14;
    let t0 = performance.now();
    let lastFrame = 0;
    let lastT = 0;
    let eraseBuf = new Float32Array(1);
    let animId = 0;
    let disposed = false;

    const SAFE_CHAR_PAD_X = 0.15;
    const SAFE_CHAR_PAD_Y = 0.05;

    // Streak state
    const streakList: Streak[] = [];

    // -----------------------------------------------------------------------
    // Grid measurement
    // -----------------------------------------------------------------------

    function measureCell(): { cw: number; lh: number } {
      const probe = document.createElement('span');
      probe.textContent = 'M'.repeat(200);
      probe.style.position = 'absolute';
      probe.style.left = '-9999px';
      probe.style.top = '-9999px';
      probe.style.whiteSpace = 'pre';
      probe.style.pointerEvents = 'none';
      probe.style.visibility = 'hidden';
      const cs = getComputedStyle(pre);
      probe.style.font = cs.font;
      probe.style.letterSpacing = cs.letterSpacing;
      host.appendChild(probe);
      const totalW = probe.getBoundingClientRect().width;
      host.removeChild(probe);
      const cw = totalW / 200 || 8;
      const lh = parseFloat(cs.lineHeight) || 14;
      return { cw, lh };
    }

    function computeGrid() {
      const m = measureCell();
      cellW = m.cw;
      cellH = m.lh;
      const rect = host.getBoundingClientRect();
      const c = Math.max(
        1,
        Math.floor(rect.width / cellW - SAFE_CHAR_PAD_X)
      );
      const r = Math.max(
        1,
        Math.floor(rect.height / cellH - SAFE_CHAR_PAD_Y)
      );
      if (c === cols && r === rows) return;
      cols = c;
      rows = r;
      sShort = cols < rows ? cols : rows;
      eraseBuf = new Float32Array(cols * rows);
    }

    // -----------------------------------------------------------------------
    // Streaks
    // -----------------------------------------------------------------------

    function resetStreak(i: number, t: number) {
      streakList[i] = makeStreak(t);
    }

    function initStreaks(t: number) {
      streakList.length = 0;
      if (!CFG.streaks.enabled || CFG.streaks.count <= 0) return;
      for (let i = 0; i < CFG.streaks.count; i++) {
        streakList.push(makeStreak(t));
      }
    }

    function inAnyStreak(u: number, v: number, t: number): boolean {
      if (!CFG.streaks.enabled || CFG.streaks.count <= 0) return false;
      const sm = CFG.streaks.startMargin;
      for (let i = 0; i < streakList.length; i++) {
        const st = streakList[i];
        const sCoord = u * st.dirx + v * st.diry;
        const pCoord = u * st.nrmx + v * st.nrmy;
        const head = st.headStart + st.speed * t;
        const tail = head - st.length;
        if (head > 1 + sm) {
          resetStreak(i, t);
          continue;
        }
        if (
          Math.abs(pCoord - st.p0) <= st.width * 0.5 &&
          sCoord >= tail &&
          sCoord <= head
        ) {
          return true;
        }
      }
      return false;
    }

    // -----------------------------------------------------------------------
    // Gap clouds
    // -----------------------------------------------------------------------

    function inGapCloud(u: number, v: number, t: number): boolean {
      if (!CFG.gapClouds.enabled) return false;
      const c = CFG.gapClouds;
      const n = fbm(
        u * c.scale + t * c.speed + 11.3,
        v * c.scale - t * c.speed - 7.9,
        c.octaves,
        0.55,
        2
      );
      const hardened = Math.pow(n, c.hardness);
      const threshold = 1 - c.density;
      const cellJit =
        ((hash3((u * 9999) | 0, (v * 9999) | 0, Math.floor(t)) % 997) /
          997) *
        0.02;
      return hardened + cellJit > threshold;
    }

    // -----------------------------------------------------------------------
    // Erase (mouse / touch interaction)
    // -----------------------------------------------------------------------

    function applyErase(cx: number, cy: number) {
      if (!CFG.erase.enabled) return;
      const R = CFG.erase.radiusCells | 0;
      const dur = CFG.erase.durationSec;
      const hard = clamp(CFG.erase.hardness, 0, 1);
      const jit = clamp(CFG.erase.jitter, 0, 1);
      const r2 = R * R;
      const x0 = Math.max(0, cx - R);
      const x1 = Math.min(cols - 1, cx + R);
      const y0 = Math.max(0, cy - R);
      const y1 = Math.min(rows - 1, cy + R);
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const dx = x - cx;
          const dy = y - cy;
          const d2 = dx * dx + dy * dy;
          if (d2 > r2) continue;
          const d = Math.sqrt(d2) / R;
          const falloff = Math.pow(1 - d, hard * 3 + 0.01);
          const h =
            (hash3(
              x * 131 + y * 911,
              y * 521 + x * 173,
              cx * 7 + cy * 13
            ) %
              1000) /
            1000;
          const accept =
            h <
            falloff * (1 - jit) +
              (falloff > 0.5 ? jit * 0.6 : jit * 0.2);
          if (accept) {
            const idx = y * cols + x;
            eraseBuf[idx] = Math.max(eraseBuf[idx], dur * falloff);
          }
        }
      }
    }

    function eventToCell(ev: MouseEvent | TouchEvent): {
      cx: number;
      cy: number;
    } {
      const rect = pre.getBoundingClientRect();
      const touch =
        'touches' in ev && ev.touches[0] ? ev.touches[0] : (ev as MouseEvent);
      const ex = touch.clientX - rect.left;
      const ey = touch.clientY - rect.top;
      let cx = Math.floor(ex / cellW);
      let cy = Math.floor(ey / cellH);
      if (cx < 0) cx = 0;
      else if (cx >= cols) cx = cols - 1;
      if (cy < 0) cy = 0;
      else if (cy >= rows) cy = rows - 1;
      return { cx, cy };
    }

    function onMove(ev: MouseEvent | TouchEvent) {
      const p = eventToCell(ev);
      applyErase(p.cx, p.cy);
    }

    pre.addEventListener('mousemove', onMove as EventListener);
    pre.addEventListener('touchstart', onMove as EventListener, {
      passive: true,
    });
    pre.addEventListener('touchmove', onMove as EventListener, {
      passive: true,
    });

    // -----------------------------------------------------------------------
    // Band sampling — the core visual pattern
    // -----------------------------------------------------------------------

    interface BandSample {
      u: number;
      v: number;
      bandIndex: number;
      tLine: number;
      tGap: number;
    }

    function sampleBands(
      x: number,
      y: number,
      t: number,
      rowNorm: number
    ): BandSample {
      const s = sShort || 1;
      let u = x / s;
      let v = y / s;
      u -= CFG.driftX * t;
      v -= CFG.driftY * t;
      const wt = t * CFG.warpSpeed;
      const wx =
        CFG.warpAmp *
        fbm(
          u * CFG.warpScale + 10.1 + wt,
          v * CFG.warpScale - 9.3 - wt,
          3,
          0.55,
          2
        );
      const wy =
        CFG.warpAmp *
        fbm(
          u * CFG.warpScale - 30.9 - wt,
          v * CFG.warpScale + 19.7 + wt,
          3,
          0.8,
          2
        );
      const ang = CFG.angleDeg * (Math.PI / 180);
      const rx =
        (u + wx) * Math.cos(ang) + (v + wy) * Math.sin(ang);
      const bandWave = 0.5 + 0.5 * Math.sin(rx * Math.PI * 2 * (CFG.frequency / 2));
      const ink = Math.pow(bandWave, CFG.contrast);
      const gap = 1 - ink;

      let gLevel = CFG.gapLevel;
      if (CFG.gapFan.enabled) {
        const fan = (1 - rowNorm) * CFG.gapFan.strength;
        gLevel += fan;
      }
      if (CFG.bandJitter.enabled) {
        const j = fbm(
          u * CFG.bandJitter.scale + 77.1,
          v * CFG.bandJitter.scale - 99.8,
          3,
          0.55,
          2
        );
        gLevel +=
          CFG.bandJitter.amp * (j - 0.5) * 2 +
          Math.sin(t * CFG.bandJitter.speed) * 0.02;
      }

      const aL = gLevel - CFG.edgeWidth;
      const bL = gLevel + CFG.edgeWidth;
      const tLine = clamp(1 - (gap - aL) / (bL - aL), 0, 1);
      const tGap = clamp((gap - aL) / (bL - aL), 0, 1);
      const bandIndex = Math.floor(rx * CFG.frequency);

      return { u: u + wx, v: v + wy, bandIndex, tLine, tGap };
    }

    // -----------------------------------------------------------------------
    // Character selection
    // -----------------------------------------------------------------------

    function baseChar(
      x: number,
      y: number,
      t: number,
      b: BandSample
    ): string {
      const { u, v, bandIndex, tLine, tGap } = b;

      if (inGapCloud(u, v, t)) return ' ';
      if (inAnyStreak(u, v, t - t0 / 1000)) return CFG.streaks.char;

      if (tLine > CFG.lineThreshold) {
        const h = hash32(bandIndex * 73856093);
        return pickFrom(CFG.lineSet, h);
      }
      if (tGap > CFG.gapThreshold) {
        const h = hash32(bandIndex * 19349663);
        return pickFrom(CFG.gapSet, h);
      }

      const slice = Math.floor(t * CFG.randomChangeHz);
      const h2 = hash32(
        ((x + 1) * 15485863) ^ ((y + 1) * 32452843) ^ (slice * 49979687)
      );
      return CFG.randomSet[h2 % CFG.randomSet.length];
    }

    function chooseChar(
      x: number,
      y: number,
      t: number,
      b: BandSample
    ): string {
      const idx = y * cols + x;
      if (eraseBuf[idx] > 0) return ' ';
      return baseChar(x, y, t, b);
    }

    // -----------------------------------------------------------------------
    // Render loop
    // -----------------------------------------------------------------------

    function render(now: number) {
      if (disposed) return;

      if (now - lastFrame < 1000 / CFG.fpsCap) {
        animId = requestAnimationFrame(render);
        return;
      }

      const t = (now - t0) / 1000;
      const dt = t - lastT;
      lastT = t;
      lastFrame = now;

      // Decay erase buffer
      if (CFG.erase.enabled) {
        const decay = dt > 0 ? dt : 0.016;
        for (let i = 0; i < eraseBuf.length; i++) {
          const v = eraseBuf[i] - decay;
          eraseBuf[i] = v > 0 ? v : 0;
        }
      }

      // Build frame string
      let out = '';
      for (let y = 0; y < rows; y++) {
        const rowNorm = rows <= 1 ? 0 : y / (rows - 1);
        for (let x = 0; x < cols; x++) {
          const b = sampleBands(x, y, t, rowNorm);
          out += chooseChar(x, y, t, b);
        }
        if (y < rows - 1) out += '\n';
      }
      pre.textContent = out;

      animId = requestAnimationFrame(render);
    }

    // -----------------------------------------------------------------------
    // Visibility change — pause when tab is hidden, compensate time on resume
    // -----------------------------------------------------------------------

    let pausedAt: number | null = null;

    function onVisibility() {
      if (document.visibilityState === 'hidden') {
        pausedAt = performance.now();
      } else if (pausedAt !== null) {
        const d = performance.now() - pausedAt;
        t0 += d;
        pausedAt = null;
        lastFrame = 0;
        if (!disposed) {
          animId = requestAnimationFrame(render);
        }
      }
    }

    document.addEventListener('visibilitychange', onVisibility);

    // -----------------------------------------------------------------------
    // ResizeObserver
    // -----------------------------------------------------------------------

    const ro = new ResizeObserver(computeGrid);
    ro.observe(host);

    // -----------------------------------------------------------------------
    // Initialize
    // -----------------------------------------------------------------------

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    function start() {
      computeGrid();
      initStreaks(0);
      if (prefersReducedMotion) {
        // Render a single static frame and stop
        const t = 0;
        let out = '';
        for (let y = 0; y < rows; y++) {
          const rowNorm = rows <= 1 ? 0 : y / (rows - 1);
          for (let x = 0; x < cols; x++) {
            const b = sampleBands(x, y, t, rowNorm);
            out += baseChar(x, y, t, b);
          }
          if (y < rows - 1) out += '\n';
        }
        pre.textContent = out;
      } else {
        animId = requestAnimationFrame(render);
      }
    }

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(start);
    } else {
      start();
    }

    // -----------------------------------------------------------------------
    // Cleanup
    // -----------------------------------------------------------------------

    return () => {
      disposed = true;
      cancelAnimationFrame(animId);
      document.removeEventListener('visibilitychange', onVisibility);
      ro.disconnect();
      pre.removeEventListener('mousemove', onMove as EventListener);
      pre.removeEventListener('touchstart', onMove as EventListener);
      pre.removeEventListener('touchmove', onMove as EventListener);
      if (host.contains(pre)) {
        host.removeChild(pre);
      }
    };
  }, [color]);

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 overflow-hidden pointer-events-none select-none ${className}`}
      style={{ opacity }}
      aria-hidden="true"
    />
  );
}
