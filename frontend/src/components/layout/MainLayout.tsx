import { Outlet } from 'react-router-dom';
import { useSmoothScroll } from '@/hooks/useSmoothScroll';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import TopNav from './TopNav';

export default function MainLayout() {
  // GSAP/Lenis hooks are initialized here so they only load on authenticated pages
  useSmoothScroll();
  useScrollReveal();

  return (
    <div className="min-h-dvh bg-cream-50">
      {/* Skip to main content link for keyboard accessibility */}
      <a
        href="#main-content"
        className="absolute left-4 top-4 z-[100] bg-brown-900 text-cream-50 px-4 py-2 rounded-[0.4rem] shadow-lg outline-none ring-2 ring-accent-300 opacity-0 focus:opacity-100 pointer-events-none focus:pointer-events-auto transition-opacity"
      >
        Skip to main content
      </a>

      {/* Top navigation bar */}
      <TopNav />

      {/* Main content area — offset by the fixed nav height (h-16 = 4rem) */}
      <main id="main-content" className="pt-16 pb-6" tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  );
}
