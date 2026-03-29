import Lenis from '@studio-freight/lenis';
import gsap from 'gsap';
import { useEffect, useRef } from 'react';

/**
 * Initializes Lenis smooth scrolling with GSAP ticker integration.
 * Respects prefers-reduced-motion for accessibility.
 *
 * Lenis config rationale:
 * - lerp: 0.04 = heavy smoothing, matches the premium/earthy feel of the brand
 * - wheelMultiplier: 0.4 = slower scroll per wheel tick, prevents fast overshooting
 * - syncTouch: false = native touch scrolling (avoids gesture conflicts on mobile)
 */
export function useSmoothScroll() {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    if (prefersReducedMotion) {
      document.documentElement.style.scrollBehavior = 'auto';
      return;
    }

    const lenis = new Lenis({
      lerp: 0.04,
      wheelMultiplier: 0.4,
      syncTouch: false,
    });

    lenisRef.current = lenis;

    // Bind Lenis RAF to GSAP ticker for synchronized frame updates
    const onTick = (time: number) => {
      lenis.raf(time * 1000);
    };

    gsap.ticker.add(onTick);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(onTick);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  return lenisRef;
}
