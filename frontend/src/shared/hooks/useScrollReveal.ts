import { useEffect } from 'react';

/**
 * Reveals elements carrying the `data-reveal` attribute as they scroll
 * into the viewport using GSAP ScrollTrigger.
 *
 * Uses a MutationObserver to detect dynamically-added [data-reveal] elements
 * so that lazily-loaded content is animated correctly.
 *
 * Animation: opacity 0 -> 1, translateY 20px -> 0, 0.6s power2.out.
 * Trigger fires when element reaches 90% of the viewport height.
 *
 * Respects prefers-reduced-motion: skips all animations.
 * Cleans up ScrollTrigger instances and observer on unmount.
 */
export function useScrollReveal(): void {
  useEffect(() => {
    const prefersReduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    if (prefersReduced) return;

    let triggers: globalThis.ScrollTrigger[] = [];
    let observer: MutationObserver | null = null;

    async function init() {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([
        import('gsap'),
        import('gsap/ScrollTrigger'),
      ]);

      gsap.registerPlugin(ScrollTrigger);

      function revealElements() {
        const elements = document.querySelectorAll<HTMLElement>(
          '[data-reveal]:not([data-revealed])',
        );

        elements.forEach((el) => {
          el.setAttribute('data-revealed', '');

          gsap.set(el, { opacity: 0, y: 20 });

          const trigger = ScrollTrigger.create({
            trigger: el,
            start: 'top 90%',
            once: true,
            onEnter: () => {
              gsap.to(el, {
                opacity: 1,
                y: 0,
                duration: 0.6,
                ease: 'power2.out',
              });
            },
          });

          triggers.push(trigger);
        });
      }

      // Initial scan for elements already in the DOM
      revealElements();

      // Watch for new [data-reveal] elements added dynamically
      observer = new MutationObserver(() => {
        revealElements();
      });

      observer.observe(document.body, { childList: true, subtree: true });
    }

    init();

    return () => {
      if (observer) {
        observer.disconnect();
        observer = null;
      }
      triggers.forEach((t) => t.kill());
      triggers = [];
    };
  }, []);
}
