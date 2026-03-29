import { useState, useMemo, useEffect, useCallback } from 'react';
import type { ViewMode } from '../types';

// ---------------------------------------------------------------------------
// Responsive view mode detection (was top-level `useResponsiveView` hook)
// ---------------------------------------------------------------------------

function useResponsiveView(): ViewMode {
  const [viewMode, setViewMode] = useState<ViewMode>('month');

  useEffect(() => {
    const updateView = () => {
      const width = window.innerWidth;
      if (width < 640) {
        setViewMode('day');
      } else if (width < 1024) {
        setViewMode('week');
      } else {
        setViewMode('month');
      }
    };

    updateView();
    window.addEventListener('resize', updateView);
    return () => window.removeEventListener('resize', updateView);
  }, []);

  return viewMode;
}

// ---------------------------------------------------------------------------
// Return type
// ---------------------------------------------------------------------------

export interface UseCalendarNavigationReturn {
  // Current positions
  currentMonth: Date;
  currentDay: Date;
  currentWeekStart: Date;

  // Effective view mode (manual override > responsive)
  viewMode: ViewMode;
  manualViewMode: ViewMode | null;

  // Month navigation
  handlePrevMonth: () => void;
  handleNextMonth: () => void;

  // Day navigation
  handlePrevDay: () => void;
  handleNextDay: () => void;

  // Week navigation
  handlePrevWeek: () => void;
  handleNextWeek: () => void;

  // Quick-jump
  goToToday: () => void;
  goToThisWeek: () => void;

  // View mode setters
  setViewDay: () => void;
  setViewWeek: () => void;
  setViewMonth: () => void;

  // Touch / swipe handlers
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: () => void;

  // Memos
  weekDays: Date[];
  calendarDays: { date: Date; isCurrentMonth: boolean }[];

  // Expose raw setters for edge cases (e.g. month sync from data hook)
  setCurrentMonth: React.Dispatch<React.SetStateAction<Date>>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Encapsulates every piece of calendar navigation state:
 *
 * - Current month / day / week positions
 * - Responsive + manual view-mode logic
 * - Prev / next handlers for every granularity
 * - Mobile touch-swipe navigation
 * - `weekDays` and `calendarDays` memoised arrays
 */
export function useCalendarNavigation(): UseCalendarNavigationReturn {
  // ---- positions ----------------------------------------------------------
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [currentDay, setCurrentDay] = useState(new Date());
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - dayOfWeek);
    return weekStart;
  });

  // ---- view mode ----------------------------------------------------------
  const responsiveViewMode = useResponsiveView();
  const [manualViewMode, setManualViewMode] = useState<ViewMode | null>(null);
  const viewMode = manualViewMode || responsiveViewMode;

  // ---- month navigation ---------------------------------------------------
  const handlePrevMonth = useCallback(() => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  }, []);

  const handleNextMonth = useCallback(() => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  }, []);

  // ---- day navigation -----------------------------------------------------
  const handlePrevDay = useCallback(() => {
    setCurrentDay(prev => {
      const newDay = new Date(prev);
      newDay.setDate(newDay.getDate() - 1);
      return newDay;
    });
  }, []);

  const handleNextDay = useCallback(() => {
    setCurrentDay(prev => {
      const newDay = new Date(prev);
      newDay.setDate(newDay.getDate() + 1);
      return newDay;
    });
  }, []);

  // ---- week navigation ----------------------------------------------------
  const handlePrevWeek = useCallback(() => {
    setCurrentWeekStart(prev => {
      const newWeekStart = new Date(prev);
      newWeekStart.setDate(newWeekStart.getDate() - 7);
      return newWeekStart;
    });
  }, []);

  const handleNextWeek = useCallback(() => {
    setCurrentWeekStart(prev => {
      const newWeekStart = new Date(prev);
      newWeekStart.setDate(newWeekStart.getDate() + 7);
      return newWeekStart;
    });
  }, []);

  // ---- quick-jump ---------------------------------------------------------
  const goToToday = useCallback(() => {
    const today = new Date();
    setCurrentDay(today);
    setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    const dayOfWeek = today.getDay();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - dayOfWeek);
    setCurrentWeekStart(weekStart);
  }, []);

  const goToThisWeek = useCallback(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - dayOfWeek);
    setCurrentWeekStart(weekStart);
    setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setCurrentDay(today);
    setManualViewMode('week');
  }, []);

  // ---- view mode setters --------------------------------------------------
  const setViewDay = useCallback(() => setManualViewMode('day'), []);
  const setViewWeek = useCallback(() => setManualViewMode('week'), []);
  const setViewMonth = useCallback(() => setManualViewMode('month'), []);

  // ---- touch / swipe handling ---------------------------------------------
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      if (viewMode === 'day') handleNextDay();
      else if (viewMode === 'week') handleNextWeek();
      else handleNextMonth();
    } else if (isRightSwipe) {
      if (viewMode === 'day') handlePrevDay();
      else if (viewMode === 'week') handlePrevWeek();
      else handlePrevMonth();
    }
  };

  // ---- memoised derived data ----------------------------------------------
  const weekDays = useMemo(() => {
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(currentWeekStart);
      day.setDate(currentWeekStart.getDate() + i);
      days.push(day);
    }
    return days;
  }, [currentWeekStart]);

  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = firstDay.getDay();

    const days: { date: Date; isCurrentMonth: boolean }[] = [];

    // Padding from previous month
    for (let i = startPadding - 1; i >= 0; i--) {
      const date = new Date(year, month, -i);
      days.push({ date, isCurrentMonth: false });
    }

    // Days of current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true });
    }

    // Padding from next month
    const endPadding = 7 - (days.length % 7);
    if (endPadding < 7) {
      for (let i = 1; i <= endPadding; i++) {
        days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
      }
    }

    return days;
  }, [currentMonth]);

  // ---- public surface -----------------------------------------------------
  return {
    currentMonth,
    currentDay,
    currentWeekStart,
    viewMode,
    manualViewMode,
    handlePrevMonth,
    handleNextMonth,
    handlePrevDay,
    handleNextDay,
    handlePrevWeek,
    handleNextWeek,
    goToToday,
    goToThisWeek,
    setViewDay,
    setViewWeek,
    setViewMonth,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    weekDays,
    calendarDays,
    setCurrentMonth,
  };
}
