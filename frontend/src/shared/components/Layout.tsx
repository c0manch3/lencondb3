import { Outlet } from 'react-router-dom';
import TopNav from './TopNav';
import AsciiBackground from './AsciiBackground';
import { useSmoothScroll } from '@/shared/hooks/useSmoothScroll';
import { useScrollReveal } from '@/shared/hooks/useScrollReveal';

/**
 * Authenticated page shell.
 *
 * Provides:
 * - Fixed ASCII background layer (opacity 0.06, behind everything)
 * - TopNav (fixed top, h-16)
 * - Main content area with pt-16 offset
 * - Lenis smooth scroll + GSAP scroll-reveal animations
 */
export default function Layout() {
  useSmoothScroll();
  useScrollReveal();

  return (
    <div className="min-h-dvh bg-cream-50 relative">
      <AsciiBackground opacity={0.06} className="fixed inset-0 z-0" />
      <div className="relative z-10">
        <TopNav />
        <main id="main-content" className="pt-16">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
