import { useTranslation } from 'react-i18next';
import type { ViewMode } from './types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface WorkloadToolbarProps {
  viewMode: ViewMode;
  currentDay: Date;
  currentMonth: Date;
  weekDays: Date[];

  // Navigation
  handlePrevMonth: () => void;
  handleNextMonth: () => void;
  handlePrevDay: () => void;
  handleNextDay: () => void;
  handlePrevWeek: () => void;
  handleNextWeek: () => void;

  // Quick-jump
  goToToday: () => void;
  goToThisWeek: () => void;

  // View mode setters
  setViewDay: () => void;
  setViewWeek: () => void;
  setViewMonth: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Calendar toolbar with view-mode toggle, prev/next navigation, and
 * today / this-week quick-jump buttons.
 *
 * Renders the title as day / week-range / month-year depending on `viewMode`.
 * The view-mode toggle buttons are hidden on small screens where the
 * responsive hook already selects the appropriate mode.
 *
 * Also renders a mobile hint banner below the toolbar for day/week views.
 */
export default function WorkloadToolbar({
  viewMode,
  currentDay,
  currentMonth,
  weekDays,
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
}: WorkloadToolbarProps) {
  const { t } = useTranslation();

  const handlePrev =
    viewMode === 'day'
      ? handlePrevDay
      : viewMode === 'week'
        ? handlePrevWeek
        : handlePrevMonth;

  const handleNext =
    viewMode === 'day'
      ? handleNextDay
      : viewMode === 'week'
        ? handleNextWeek
        : handleNextMonth;

  const prevAriaLabel =
    viewMode === 'day'
      ? t('workload.previousDay')
      : viewMode === 'week'
        ? t('workload.previousWeek')
        : t('workload.previousMonth');

  const nextAriaLabel =
    viewMode === 'day'
      ? t('workload.nextDay')
      : viewMode === 'week'
        ? t('workload.nextWeek')
        : t('workload.nextMonth');

  // Title adapts to the current view mode
  const title =
    viewMode === 'day'
      ? currentDay.toLocaleDateString('default', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        })
      : viewMode === 'week'
        ? `${weekDays[0].toLocaleDateString('default', { month: 'short', day: 'numeric' })} - ${weekDays[6].toLocaleDateString('default', { month: 'short', day: 'numeric', year: 'numeric' })}`
        : currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <>
      {/* Calendar Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrev}
            className="p-2 hover:bg-cream-200 rounded-[0.4rem] touch-target"
            aria-label={prevAriaLabel}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={goToToday}
            className="px-3 py-1.5 text-sm font-medium text-brown-600 bg-brown-50 hover:bg-brown-100 rounded-[0.4rem] touch-target"
            aria-label={t('workload.goToToday')}
          >
            {t('workload.today')}
          </button>
          <button
            onClick={goToThisWeek}
            className="px-3 py-1.5 text-sm font-medium text-green-600 bg-green-50 hover:bg-green-100 rounded-[0.4rem] touch-target"
            aria-label={t('workload.goToThisWeek')}
          >
            {t('workload.thisWeek')}
          </button>
        </div>

        {/* View mode toggle (hidden on small screens) */}
        <div className="hidden sm:flex items-center gap-1 bg-cream-200 rounded-[0.4rem] p-1">
          <button
            onClick={setViewDay}
            className={`px-2 py-1 text-xs font-medium rounded ${viewMode === 'day' ? 'bg-cream-50 shadow text-brown-600' : 'text-brown-600 hover:text-brown-900'}`}
            aria-label={t('workload.dayView')}
          >
            {t('workload.day')}
          </button>
          <button
            onClick={setViewWeek}
            className={`px-2 py-1 text-xs font-medium rounded ${viewMode === 'week' ? 'bg-cream-50 shadow text-brown-600' : 'text-brown-600 hover:text-brown-900'}`}
            aria-label={t('workload.weekView')}
          >
            {t('workload.week')}
          </button>
          <button
            onClick={setViewMonth}
            className={`px-2 py-1 text-xs font-medium rounded ${viewMode === 'month' ? 'bg-cream-50 shadow text-brown-600' : 'text-brown-600 hover:text-brown-900'}`}
            aria-label={t('workload.monthView')}
          >
            {t('workload.month')}
          </button>
        </div>

        <h2 className="text-lg font-semibold text-center">{title}</h2>

        <button
          onClick={handleNext}
          className="p-2 hover:bg-cream-200 rounded-[0.4rem] touch-target"
          aria-label={nextAriaLabel}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* View mode hint banners for mobile */}
      {viewMode === 'day' && (
        <div className="text-center text-xs text-brown-500 py-1 bg-cream-100 border-b">
          {t('workload.swipeToNavigateDays')}
        </div>
      )}
      {viewMode === 'week' && (
        <div className="text-center text-xs text-brown-500 py-1 bg-cream-100 border-b">
          {t('workload.weekView')}
        </div>
      )}
    </>
  );
}
