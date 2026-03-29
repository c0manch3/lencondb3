import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import type { CalendarViewMode, CalendarDay } from '../types';

// ─── Constants ──────────────────────────────────────────────────────────────

/** ISO week: Monday = 0, Sunday = 6 */
const DAY_LABELS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
export type DayLabel = (typeof DAY_LABELS)[number];

/** Breakpoints for responsive auto-switch */
const BREAKPOINT_MOBILE = 640;
const BREAKPOINT_TABLET = 1024;

// ─── Date helpers (no external deps) ────────────────────────────────────────

function toDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Returns Monday of the week containing the given date (ISO weeks). */
function getMonday(d: Date): Date {
  const copy = new Date(d);
  const day = copy.getDay();
  // getDay(): 0=Sun, 1=Mon, ..., 6=Sat -> offset to Monday
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  return copy;
}

function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

function addMonths(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setMonth(copy.getMonth() + n);
  return copy;
}

// ─── Hook ───────────────────────────────────────────────────────────────────

interface CalendarNavigationResult {
  viewMode: CalendarViewMode;
  setViewMode: (mode: CalendarViewMode) => void;
  currentMonth: Date;
  currentDay: Date;
  weekStart: Date; // Monday of current week

  // Navigation
  goToToday: () => void;
  goToThisWeek: () => void;
  goToPrevious: () => void;
  goToNext: () => void;
  selectDate: (date: string) => void;

  // Memoized grid data
  weekDays: readonly DayLabel[];
  calendarDays: CalendarDay[];

  // Date range for data queries
  rangeStart: string;
  rangeEnd: string;

  // Touch ref for swipe binding
  touchRef: React.RefObject<HTMLDivElement>;
}

export function useCalendarNavigation(): CalendarNavigationResult {
  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => toDateString(today), [today]);

  // ─── View mode with responsive auto-switch ──────────────────────
  const [viewMode, setViewModeRaw] = useState<CalendarViewMode>(() => {
    if (typeof window === 'undefined') return 'month';
    const w = window.innerWidth;
    if (w < BREAKPOINT_MOBILE) return 'day';
    if (w < BREAKPOINT_TABLET) return 'week';
    return 'month';
  });

  const [userOverrode, setUserOverrode] = useState(false);

  const setViewMode = useCallback((mode: CalendarViewMode) => {
    setUserOverrode(true);
    setViewModeRaw(mode);
  }, []);

  // Auto-switch on resize (only if user hasn't manually selected)
  useEffect(() => {
    if (userOverrode) return;

    const handleResize = () => {
      const w = window.innerWidth;
      if (w < BREAKPOINT_MOBILE) setViewModeRaw('day');
      else if (w < BREAKPOINT_TABLET) setViewModeRaw('week');
      else setViewModeRaw('month');
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [userOverrode]);

  // ─── Navigation state ───────────────────────────────────────────
  const [currentMonth, setCurrentMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [currentDay, setCurrentDay] = useState(today);
  const [weekStart, setWeekStart] = useState(() => getMonday(today));

  // ─── Navigation handlers ────────────────────────────────────────
  const goToToday = useCallback(() => {
    const now = new Date();
    setCurrentDay(now);
    setWeekStart(getMonday(now));
    setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1));
  }, []);

  const goToThisWeek = useCallback(() => {
    const now = new Date();
    setWeekStart(getMonday(now));
    setCurrentDay(now);
    setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1));
  }, []);

  const goToPrevious = useCallback(() => {
    switch (viewMode) {
      case 'month':
        setCurrentMonth((prev) => addMonths(prev, -1));
        break;
      case 'week':
        setWeekStart((prev) => addDays(prev, -7));
        break;
      case 'day':
        setCurrentDay((prev) => addDays(prev, -1));
        break;
    }
  }, [viewMode]);

  const goToNext = useCallback(() => {
    switch (viewMode) {
      case 'month':
        setCurrentMonth((prev) => addMonths(prev, 1));
        break;
      case 'week':
        setWeekStart((prev) => addDays(prev, 7));
        break;
      case 'day':
        setCurrentDay((prev) => addDays(prev, 1));
        break;
    }
  }, [viewMode]);

  const selectDate = useCallback(
    (dateStr: string) => {
      const d = parseDate(dateStr);
      setCurrentDay(d);
      setWeekStart(getMonday(d));
      setCurrentMonth(new Date(d.getFullYear(), d.getMonth(), 1));
      if (viewMode === 'month') {
        setViewMode('day');
      }
    },
    [viewMode, setViewMode],
  );

  // ─── Touch swipe ────────────────────────────────────────────────
  const touchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = touchRef.current;
    if (!el) return;

    let startX = 0;
    let startY = 0;
    const SWIPE_THRESHOLD = 50;

    const onTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    };

    const onTouchEnd = (e: TouchEvent) => {
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      const dx = endX - startX;
      const dy = endY - startY;

      // Only trigger for horizontal swipes (not vertical scrolling)
      if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy) * 1.5) {
        if (dx < 0) {
          goToNext();
        } else {
          goToPrevious();
        }
      }
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [goToNext, goToPrevious]);

  // ─── Calendar grid computation ──────────────────────────────────
  const calendarDays = useMemo<CalendarDay[]>(() => {
    if (viewMode === 'day') {
      const d = currentDay;
      const dateStr = toDateString(d);
      const dow = d.getDay();
      return [
        {
          date: dateStr,
          dayOfMonth: d.getDate(),
          isToday: dateStr === todayStr,
          isCurrentMonth: true,
          isWeekend: dow === 0 || dow === 6,
          isFuture: dateStr > todayStr,
          isPast: dateStr < todayStr,
        },
      ];
    }

    if (viewMode === 'week') {
      const days: CalendarDay[] = [];
      for (let i = 0; i < 7; i++) {
        const d = addDays(weekStart, i);
        const dateStr = toDateString(d);
        const dow = d.getDay();
        days.push({
          date: dateStr,
          dayOfMonth: d.getDate(),
          isToday: dateStr === todayStr,
          isCurrentMonth: d.getMonth() === currentMonth.getMonth(),
          isWeekend: dow === 0 || dow === 6,
          isFuture: dateStr > todayStr,
          isPast: dateStr < todayStr,
        });
      }
      return days;
    }

    // Month view: build 6-week grid starting from Monday
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const gridStart = getMonday(firstDayOfMonth);

    // Always render 6 rows = 42 cells for consistent grid height
    const days: CalendarDay[] = [];
    for (let i = 0; i < 42; i++) {
      const d = addDays(gridStart, i);
      const dateStr = toDateString(d);
      const dow = d.getDay();
      days.push({
        date: dateStr,
        dayOfMonth: d.getDate(),
        isToday: dateStr === todayStr,
        isCurrentMonth: d.getMonth() === month && d.getFullYear() === year,
        isWeekend: dow === 0 || dow === 6,
        isFuture: dateStr > todayStr,
        isPast: dateStr < todayStr,
      });
    }
    return days;
  }, [viewMode, currentDay, weekStart, currentMonth, todayStr]);

  // ─── Date range for API queries ─────────────────────────────────
  const { rangeStart, rangeEnd } = useMemo(() => {
    if (calendarDays.length === 0) {
      return { rangeStart: todayStr, rangeEnd: todayStr };
    }
    return {
      rangeStart: calendarDays[0].date,
      rangeEnd: calendarDays[calendarDays.length - 1].date,
    };
  }, [calendarDays, todayStr]);

  return {
    viewMode,
    setViewMode,
    currentMonth,
    currentDay,
    weekStart,
    goToToday,
    goToThisWeek,
    goToPrevious,
    goToNext,
    selectDate,
    weekDays: DAY_LABELS,
    calendarDays,
    rangeStart,
    rangeEnd,
    touchRef,
  };
}
