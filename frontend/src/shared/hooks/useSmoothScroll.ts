import { useEffect } from 'react';

/**
 * Initialises Lenis smooth scrolling with GSAP ticker integration.
 *
 * - lerp 0.04 for silky-smooth interpolation
 * - wheelMultiplier 0.4 for slower, more controlled scroll
 * - syncTouch false to keep native touch behaviour
 * - Respects prefers-reduced-motion (skips entirely)
 * - Cleans up Lenis instance and GSAP ticker callback on unmount
 */
export function useSmoothScroll(): void {
  useEffect(() => {
    const prefersReduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    if (prefersReduced) return;

    let lenis: InstanceType<typeof import('@studio-freight/lenis').default> | null =
      null;
    let onTick: ((time: number) => void) | null = null;
    let gsapRef: typeof import('gsap').gsap | null = null;

    async function init() {
      const [{ default: Lenis }, { gsap }] = await Promise.all([
        import('@studio-freight/lenis'),
        import('gsap'),
      ]);

      gsapRef = gsap;

      lenis = new Lenis({
        lerp: 0.04,
        wheelMultiplier: 0.4,
        syncTouch: false,
      });

      // Add Lenis raf to GSAP's ticker so both systems share the same frame loop
      onTick = (time: number) => {
        lenis?.raf(time * 1000);
      };

      gsap.ticker.add(onTick);
      gsap.ticker.lagSmoothing(0);

      // Add the `lenis` class so CSS can hook into it
      document.documentElement.classList.add('lenis');
    }

    init();

    return () => {
      if (lenis) {
        lenis.destroy();
      }
      if (gsapRef && onTick) {
        gsapRef.ticker.remove(onTick);
        gsapRef.ticker.lagSmoothing(250, 33);
      }
      document.documentElement.classList.remove('lenis');
    };
  }, []);
}
