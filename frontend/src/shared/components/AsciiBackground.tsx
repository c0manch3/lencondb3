import { useEffect, useRef, memo } from 'react';

// ─── Exact port of the OpenHands.dev ASCII art grid animation ──────────────
// Source: openhands.dev inline script (extracted 2026-03-28)
// Only change: lineSet text "LENCON DB" instead of "OPEN HANDS"

interface AsciiBackgroundProps {
  opacity?: number;
  color?: string;
  className?: string;
}

function AsciiBackgroundInner({
  opacity = 0.09,
  color,
  className = '',
}: AsciiBackgroundProps) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const hostEl = hostRef.current;
    if (!hostEl) return;
    // Non-null alias so TypeScript narrows inside nested closures
    const host: HTMLDivElement = hostEl;

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    // ═══════════════════════════════════════════════════════════════════════
    // EXACT ORIGINAL CODE — ported from OpenHands.dev inline script
    // DO NOT simplify, rewrite, or "optimise" any of this.
    // ═══════════════════════════════════════════════════════════════════════

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
      bandJitter: { enabled: true, amp: 0.2, scale: 0.85, speed: 0.05 },
      randomSet: Array.from(' .,:;*+![]{}()<>-~'),
      lineSet: Array.from(' LENCON DB @@@ '), // ONLY THIS CHANGED
      gapSet: Array.from('@'),
      randomChangeHz: 1.5,
      lineThreshold: 0,
      gapThreshold: 1,
      gapFan: { enabled: true, strength: 0.5 },
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

    // ─── Gradient table G[256] with cos/sin ───────────────────────────────
    const G: { x: number; y: number }[] = [];
    for (let i = 0; i < 256; i++) {
      const a = (i / 256) * Math.PI * 2;
      G[i] = { x: Math.cos(a), y: Math.sin(a) };
    }

    // ─── Permutation table P[512] with seed 1234567 ──────────────────────
    const P = new Uint8Array(512);
    {
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
    }

    // ─── Utility ──────────────────────────────────────────────────────────
    const clamp = (v: number, a: number, b: number) =>
      v < a ? a : v > b ? b : v;
    const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);

    // ─── Perlin noise ─────────────────────────────────────────────────────
    function grad(ix: number, iy: number, x: number, y: number): number {
      const X = ix & 255,
        Y = iy & 255;
      const g = G[P[X + P[Y]]];
      return g.x * (x - ix) + g.y * (y - iy);
    }

    function perlin(x: number, y: number): number {
      const x0 = Math.floor(x),
        y0 = Math.floor(y);
      const x1 = x0 + 1,
        y1 = y0 + 1;
      const sx = fade(x - x0),
        sy = fade(y - y0);
      const n00 = grad(x0, y0, x, y);
      const n10 = grad(x1, y0, x, y);
      const n01 = grad(x0, y1, x, y);
      const n11 = grad(x1, y1, x, y);
      const ix0 = n00 + sx * (n10 - n00);
      const ix1 = n01 + sx * (n11 - n01);
      return ix0 + sy * (ix1 - ix0);
    }

    // ─── Fractal Brownian motion ──────────────────────────────────────────
    function fbm(
      x: number,
      y: number,
      oct?: number,
      gain?: number,
      lac?: number,
    ): number {
      oct = oct || 3;
      gain = gain || 0.5;
      lac = lac || 2;
      let v = 0,
        amp = 1,
        f = 1,
        norm = 0;
      for (let i = 0; i < oct; i++) {
        v += amp * perlin(x * f, y * f);
        norm += amp;
        amp *= gain;
        f *= lac;
      }
      return v / (norm || 1);
    }

    // ─── Hash functions ───────────────────────────────────────────────────
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

    const pickFrom = (arr: string[], h: number) => arr[h % arr.length];

    // ─── Create <pre> element ─────────────────────────────────────────────
    const pre = document.createElement('pre');
    pre.className = 'ascii-pre';
    pre.setAttribute('aria-hidden', 'true');
    pre.style.width = '100%';
    pre.style.height = '100%';
    pre.style.margin = '0';
    pre.style.padding = '0';
    pre.style.whiteSpace = 'pre';
    pre.style.overflow = 'hidden';
    pre.style.fontFamily =
      'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace';
    pre.style.fontSize = '14px';
    pre.style.lineHeight = '14px';
    pre.style.userSelect = 'none';
    pre.style.pointerEvents = 'auto';

    const fg =
      color ||
      getComputedStyle(host).getPropertyValue('--fg')?.trim() ||
      '#22150d';
    pre.style.color = fg;

    host.appendChild(pre);

    // ─── Grid measurement ─────────────────────────────────────────────────
    let cols = 0,
      rows = 0,
      sShort = 1;
    let t0 = performance.now(),
      lastFrame = 0,
      lastT = 0;
    let cellW = 8,
      cellH = 14;
    let eraseBuf = new Float32Array(1);

    const SAFE_CHAR_PAD_X = 0.15,
      SAFE_CHAR_PAD_Y = 0.05;

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

    function computeGrid(): void {
      const m = measureCell();
      cellW = m.cw;
      cellH = m.lh;
      const rect = host.getBoundingClientRect();
      const c = Math.max(1, Math.floor(rect.width / cellW - SAFE_CHAR_PAD_X));
      const r = Math.max(1, Math.floor(rect.height / cellH - SAFE_CHAR_PAD_Y));
      if (c === cols && r === rows) return;
      cols = c;
      rows = r;
      sShort = cols < rows ? cols : rows;
      eraseBuf = new Float32Array(cols * rows);
    }

    // ─── Streaks ──────────────────────────────────────────────────────────
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

    const ST: { list: Streak[] } = { list: [] };
    const randRange = (a: number, b: number) => a + Math.random() * (b - a);

    function makeDir(): { dx: number; dy: number; nx: number; ny: number } {
      let dx = CFG.driftX || 0.0001;
      let dy = CFG.driftY || 0;
      if (CFG.streaks.enabled && CFG.streaks.randomDirection) {
        let baseAngle = CFG.streaks.useDriftDirection
          ? Math.atan2(dy, dx)
          : 0;
        baseAngle +=
          randRange(-1, 1) *
          CFG.streaks.angleJitterDeg *
          (Math.PI / 180);
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

    function resetStreak(i: number, t: number): void {
      ST.list[i] = makeStreak(t);
    }

    function initStreaks(t: number): void {
      ST.list.length = 0;
      if (!CFG.streaks.enabled || CFG.streaks.count <= 0) return;
      for (let i = 0; i < CFG.streaks.count; i++) {
        ST.list.push(makeStreak(t));
      }
    }

    function inAnyStreak(u: number, v: number, t: number): boolean {
      if (!CFG.streaks.enabled || CFG.streaks.count <= 0) return false;
      const sm = CFG.streaks.startMargin;
      for (let i = 0; i < ST.list.length; i++) {
        const st = ST.list[i];
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
        )
          return true;
      }
      return false;
    }

    // ─── Gap clouds ───────────────────────────────────────────────────────
    function inGapCloud(u: number, v: number, t: number): boolean {
      if (!CFG.gapClouds.enabled) return false;
      const c = CFG.gapClouds;
      const n = fbm(
        u * c.scale + t * c.speed + 11.3,
        v * c.scale - t * c.speed - 7.9,
        c.octaves,
        0.55,
        2,
      );
      const hardened = Math.pow(n, c.hardness);
      const threshold = 1 - c.density;
      const cellJit =
        ((hash3((u * 9999) | 0, (v * 9999) | 0, Math.floor(t)) % 997) / 997) *
        0.02;
      return hardened + cellJit > threshold;
    }

    // ─── Erase interaction ────────────────────────────────────────────────
    function applyErase(cx: number, cy: number): void {
      if (!CFG.erase.enabled) return;
      const R = CFG.erase.radiusCells | 0;
      const dur = CFG.erase.durationSec;
      const hard = clamp(CFG.erase.hardness, 0, 1);
      const jit = clamp(CFG.erase.jitter, 0, 1);
      const r2 = R * R;
      const x0 = Math.max(0, cx - R),
        x1 = Math.min(cols - 1, cx + R);
      const y0 = Math.max(0, cy - R),
        y1 = Math.min(rows - 1, cy + R);
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const dx = x - cx,
            dy = y - cy;
          const d2 = dx * dx + dy * dy;
          if (d2 > r2) continue;
          const d = Math.sqrt(d2) / R;
          const falloff = Math.pow(1 - d, hard * 3 + 0.01);
          const h =
            (hash3(x * 131 + y * 911, y * 521 + x * 173, cx * 7 + cy * 13) %
              1000) /
            1000;
          const accept =
            h <
            falloff * (1 - jit) + (falloff > 0.5 ? jit * 0.6 : jit * 0.2);
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

    function onMove(ev: MouseEvent | TouchEvent): void {
      const p = eventToCell(ev);
      applyErase(p.cx, p.cy);
    }

    pre.addEventListener('mousemove', onMove);
    pre.addEventListener('touchstart', onMove, { passive: true });
    pre.addEventListener('touchmove', onMove, { passive: true });

    // ─── sampleBands — THE KEY to the smooth flowing pattern ──────────────
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
      rowNorm: number,
    ): BandSample {
      const s = sShort || 1;
      let u = x / s;
      let v = y / s;
      u -= CFG.driftX * t;
      v -= CFG.driftY * t;

      const wt = t * CFG.warpSpeed;
      const wx =
        CFG.warpAmp *
        fbm(u * CFG.warpScale + 10.1 + wt, v * CFG.warpScale - 9.3 - wt, 3, 0.55, 2);
      const wy =
        CFG.warpAmp *
        fbm(
          u * CFG.warpScale - 30.9 - wt,
          v * CFG.warpScale + 19.7 + wt,
          3,
          0.8,
          2,
        );

      const ang = (CFG.angleDeg * Math.PI) / 180;
      const rx =
        (u + wx) * Math.cos(ang) + (v + wy) * Math.sin(ang);

      const bandWave =
        0.5 + 0.5 * Math.sin(rx * Math.PI * 2 * (CFG.frequency / 2));
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
          2,
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

    // ─── Character selection ──────────────────────────────────────────────
    function baseChar(
      x: number,
      y: number,
      t: number,
      b: BandSample,
    ): string {
      const u = b.u,
        v = b.v;
      const bandIndex = b.bandIndex;
      const tLine = b.tLine,
        tGap = b.tGap;

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
        ((x + 1) * 15485863) ^ ((y + 1) * 32452843) ^ (slice * 49979687),
      );
      return CFG.randomSet[h2 % CFG.randomSet.length];
    }

    function chooseChar(
      x: number,
      y: number,
      t: number,
      b: BandSample,
    ): string {
      const idx = y * cols + x;
      if (eraseBuf[idx] > 0) return ' ';
      return baseChar(x, y, t, b);
    }

    // ─── Render loop ──────────────────────────────────────────────────────
    let animId = 0;

    function render(now: number): void {
      if (now - lastFrame < 1000 / CFG.fpsCap) {
        animId = requestAnimationFrame(render);
        return;
      }

      const t = (now - t0) / 1000;
      const dt = t - lastT;
      lastT = t;
      lastFrame = now;

      // Erase buffer decay
      if (CFG.erase.enabled) {
        const decay = dt > 0 ? dt : 0.016;
        for (let i = 0; i < eraseBuf.length; i++) {
          const v = eraseBuf[i] - decay;
          eraseBuf[i] = v > 0 ? v : 0;
        }
      }

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

    // ─── Startup ──────────────────────────────────────────────────────────
    const ro = new ResizeObserver(computeGrid);
    ro.observe(host);

    function start(): void {
      computeGrid();
      initStreaks(0);

      if (prefersReducedMotion) {
        // Render one static frame
        const now = performance.now();
        const t = (now - t0) / 1000;
        lastT = t;
        lastFrame = now;
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
      } else {
        animId = requestAnimationFrame(render);
      }
    }

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(start);
    } else {
      start();
    }

    // ─── Visibility change (pause when tab hidden) ────────────────────────
    let pausedAt: number | null = null;

    function onVisibilityChange(): void {
      if (document.visibilityState === 'hidden') {
        pausedAt = performance.now();
        cancelAnimationFrame(animId);
      } else if (pausedAt !== null) {
        const d = performance.now() - pausedAt;
        t0 += d;
        pausedAt = null;
        lastFrame = 0;
        if (!prefersReducedMotion) {
          animId = requestAnimationFrame(render);
        }
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange);

    // ─── Cleanup ──────────────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(animId);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      pre.removeEventListener('mousemove', onMove);
      pre.removeEventListener('touchstart', onMove);
      pre.removeEventListener('touchmove', onMove);
      ro.disconnect();
      if (host.contains(pre)) {
        host.removeChild(pre);
      }
    };
  }, [color]);

  return (
    <div
      ref={hostRef}
      className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}
      style={{ opacity }}
      aria-hidden="true"
    />
  );
}

const AsciiBackground = memo(AsciiBackgroundInner);
AsciiBackground.displayName = 'AsciiBackground';

export default AsciiBackground;
