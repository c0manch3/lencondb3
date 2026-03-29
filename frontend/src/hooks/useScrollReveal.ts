import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useEffect } from 'react';

gsap.registerPlugin(ScrollTrigger);

/**
 * Animates elements with the `data-reveal` attribute into view on scroll.
 *
 * Timing follows UI/UX best practice:
 * - 600ms duration with power2.out easing (ease-out for entering)
 * - 20px upward travel keeps motion subtle and purposeful
 * - Trigger at 90% viewport ensures elements animate before the user
 *   reaches them, avoiding blank-then-pop perception
 * - toggleActions: "play none none none" = plays once, never resets
 *
 * Fully respects prefers-reduced-motion (no animation, instant display).
 */
export function useScrollReveal() {
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    if (prefersReducedMotion) return;

    // Small delay to ensure DOM is fully painted before querying
    const rafId = requestAnimationFrame(() => {
      const elements = document.querySelectorAll('[data-reveal]');

      elements.forEach((el) => {
        gsap.fromTo(
          el,
          { opacity: 0, y: 20 },
          {
            opacity: 1,
            y: 0,
            duration: 0.6,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: el,
              start: 'top 90%',
              toggleActions: 'play none none none',
            },
          }
        );
      });
    });

    return () => {
      cancelAnimationFrame(rafId);
      ScrollTrigger.getAll().forEach((t) => t.kill());
    };
  }, []);
}
