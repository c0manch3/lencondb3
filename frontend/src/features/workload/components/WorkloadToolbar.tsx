import { type FC, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/components';
import type { CalendarViewMode } from '../types';

// ─── Icons ──────────────────────────────────────────────────────────────────

function ChevronLeftIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z" />
      <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
    </svg>
  );
}

// ─── Props ──────────────────────────────────────────────────────────────────

interface WorkloadToolbarProps {
  viewMode: CalendarViewMode;
  onViewModeChange: (mode: CalendarViewMode) => void;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
  onThisWeek: () => void;
  onExport?: () => void;
  canExport: boolean;
  title: string;
}

// ─── Segmented control button ───────────────────────────────────────────────

const VIEW_MODES: CalendarViewMode[] = ['month', 'week', 'day'];

// ─── Component ──────────────────────────────────────────────────────────────

const WorkloadToolbar: FC<WorkloadToolbarProps> = ({
  viewMode,
  onViewModeChange,
  onPrevious,
  onNext,
  onToday,
  onThisWeek,
  onExport,
  canExport,
  title,
}) => {
  const { t } = useTranslation();

  const viewLabels = useMemo(
    () => ({
      month: t('workload.monthView'),
      week: t('workload.weekView'),
      day: t('workload.dayView'),
    }),
    [t],
  );

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      {/* Left: view mode segmented control */}
      <div className="flex items-center gap-3">
        {/* Segmented control per TABLE_DESIGN.md */}
        <div
          className="inline-flex border border-[rgba(34,21,13,0.15)] rounded overflow-hidden"
          role="group"
          aria-label={t('workload.title')}
        >
          {VIEW_MODES.map((mode) => (
            <button
              key={mode}
              type="button"
              className={`
                px-3 py-1.5 text-[0.8125rem] font-medium
                border-r border-[rgba(34,21,13,0.15)] last:border-r-0
                transition-colors duration-150 cursor-pointer
                ${
                  viewMode === mode
                    ? 'bg-[#22150d] text-[#f9f0d9]'
                    : 'bg-transparent text-[#5c4a3e] hover:bg-[rgba(34,21,13,0.04)]'
                }
              `}
              onClick={() => onViewModeChange(mode)}
              aria-pressed={viewMode === mode}
            >
              {viewLabels[mode]}
            </button>
          ))}
        </div>

        {/* Quick nav: Today / This Week */}
        <div className="hidden sm:flex items-center gap-1.5">
          <Button variant="ghost" size="sm" onClick={onToday}>
            {t('workload.goToToday')}
          </Button>
          {viewMode === 'week' && (
            <Button variant="ghost" size="sm" onClick={onThisWeek}>
              {t('workload.goToThisWeek')}
            </Button>
          )}
        </div>
      </div>

      {/* Center: navigation arrows + title */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="inline-flex items-center justify-center w-8 h-8 rounded text-[#5c4a3e] hover:bg-[rgba(34,21,13,0.06)] transition-colors cursor-pointer"
          onClick={onPrevious}
          aria-label={
            viewMode === 'month'
              ? t('workload.previousMonth')
              : viewMode === 'week'
                ? t('workload.previousWeek')
                : t('workload.previousDay')
          }
        >
          <ChevronLeftIcon />
        </button>

        <span className="text-sm font-semibold text-[#22150d] min-w-[140px] text-center">
          {title}
        </span>

        <button
          type="button"
          className="inline-flex items-center justify-center w-8 h-8 rounded text-[#5c4a3e] hover:bg-[rgba(34,21,13,0.06)] transition-colors cursor-pointer"
          onClick={onNext}
          aria-label={
            viewMode === 'month'
              ? t('workload.nextMonth')
              : viewMode === 'week'
                ? t('workload.nextWeek')
                : t('workload.nextDay')
          }
        >
          <ChevronRightIcon />
        </button>
      </div>

      {/* Right: export button */}
      <div className="flex items-center gap-2">
        {/* Mobile-only today button */}
        <div className="sm:hidden">
          <Button variant="ghost" size="sm" onClick={onToday}>
            {t('workload.goToToday')}
          </Button>
        </div>

        {canExport && onExport && (
          <Button variant="secondary" size="sm" icon={<DownloadIcon />} onClick={onExport}>
            {t('common.export')}
          </Button>
        )}
      </div>
    </div>
  );
};

export default WorkloadToolbar;
