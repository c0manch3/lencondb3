import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import AsciiBackground from './AsciiBackground';
import { useSmoothScroll } from '@/shared/hooks/useSmoothScroll';
import { useScrollReveal } from '@/shared/hooks/useScrollReveal';

/**
 * Authenticated page shell.
 *
 * Provides:
 * - Fixed ASCII background layer (opacity 0.06, behind everything)
 * - Sidebar (fixed left, w-60, desktop only)
 * - BottomNav (fixed bottom, h-16, mobile only)
 * - Main content area with md:ml-60 offset + pb-16 on mobile
 * - Lenis smooth scroll + GSAP scroll-reveal animations
 */
export default function Layout() {
  useSmoothScroll();
  useScrollReveal();

  return (
    <div className="min-h-dvh bg-cream-50 relative">
      <AsciiBackground opacity={0.06} className="fixed inset-0 z-0" />
      <div className="relative z-10 flex">
        <Sidebar />
        <main id="main-content" className="flex-1 md:ml-60 pb-16 md:pb-0 p-6 md:p-8">
          <Outlet />
        </main>
        <BottomNav />
      </div>
    </div>
  );
}
