import { type FC, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type {
  CalendarDay,
  CalendarData,
  WorkloadPlanEntry,
  WorkloadActualEntry,
  WorkloadPermissions,
} from '../types';
import { PLAN_ENTRY_COLORS, type PlanEntryColorType } from '../types';
import { getPlansForDate, getActualsForDate } from '../hooks/useWorkloadData';
import type { DayLabel } from '../hooks/useCalendarNavigation';

// ─── Entry color resolver ───────────────────────────────────────────────────

function getPlanColorType(day: CalendarDay): PlanEntryColorType {
  if (day.isToday) return 'plan-today';
  return 'plan-future';
}

// ─── Props ──────────────────────────────────────────────────────────────────

interface MonthViewProps {
  weekDays: readonly DayLabel[];
  calendarDays: CalendarDay[];
  calendarData: CalendarData | undefined;
  isLoading: boolean;
  permissions: WorkloadPermissions;
  isAllEmployeesMode: boolean;
  projectFilter?: string;
  onAddPlan: (date: string) => void;
  onEditPlan: (plan: WorkloadPlanEntry) => void;
  onViewActual: (actual: WorkloadActualEntry) => void;
  onLogActual: (date: string) => void;
  onViewDateEmployees: (date: string) => void;
  onSelectDate: (date: string) => void;
}

// ─── Plan entry chip ────────────────────────────────────────────────────────

const PlanChip: FC<{
  entry: WorkloadPlanEntry;
  colorType: PlanEntryColorType;
  showProject?: boolean;
  onClick: () => void;
}> = ({ entry, colorType, showProject, onClick }) => {
  const colors = PLAN_ENTRY_COLORS[colorType];
  const { t } = useTranslation();
  const hoursLabel = entry.hours != null ? `${entry.hours}${t('workload.hoursShort')}` : '';

  const label = showProject
    ? `${entry.projectName} ${hoursLabel}`.trim()
    : `${entry.userInitials} ${hoursLabel}`.trim();

  return (
    <button
      type="button"
      className="w-full text-left px-1.5 py-0.5 rounded text-[0.6875rem] leading-[1.3] mb-0.5 cursor-pointer overflow-hidden text-ellipsis whitespace-nowrap transition-opacity hover:opacity-80"
      style={{
        backgroundColor: colors.bg,
        color: colors.text,
        borderLeft: `2px solid ${colors.border}`,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      title={`${entry.userName}\n${entry.projectName}${hoursLabel ? `\n${hoursLabel}` : ''}`}
    >
      {label}
    </button>
  );
};

// ─── Actual entry chip ──────────────────────────────────────────────────────

const ActualChip: FC<{
  entry: WorkloadActualEntry;
  showProject?: boolean;
  onClick: () => void;
}> = ({ entry, showProject, onClick }) => {
  const colors = PLAN_ENTRY_COLORS.actual;
  const { t } = useTranslation();

  const firstProjectName =
    entry.distributions.length > 0 ? entry.distributions[0].projectName : '';

  const label = showProject
    ? `${firstProjectName} ${entry.hoursWorked}${t('workload.hoursShort')}`.trim()
    : `${entry.userInitials} ${entry.hoursWorked}${t('workload.hoursShort')}`.trim();

  return (
    <button
      type="button"
      className="w-full text-left px-1.5 py-0.5 rounded text-[0.6875rem] leading-[1.3] mb-0.5 cursor-pointer overflow-hidden text-ellipsis whitespace-nowrap transition-opacity hover:opacity-80"
      style={{
        backgroundColor: colors.bg,
        color: colors.text,
        borderLeft: `2px solid ${colors.border}`,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      title={`${entry.userName}\n${entry.hoursWorked}${t('workload.hoursShort')} ${t('workload.actual').toLowerCase()}`}
    >
      {label}
    </button>
  );
};

// ─── Action buttons ─────────────────────────────────────────────────────────

const CellActions: FC<{
  day: CalendarDay;
  permissions: WorkloadPermissions;
  hasEntries: boolean;
  onAddPlan: (date: string) => void;
  onLogActual: (date: string) => void;
}> = ({ day, permissions, hasEntries, onAddPlan, onLogActual }) => {
  const { t } = useTranslation();

  const showPlanBtn = permissions.canCreatePlan && (day.isFuture || day.isToday);
  const showActualBtn = permissions.canLogActual && (day.isPast || day.isToday);

  if (!showPlanBtn && !showActualBtn) return null;

  // On cells with existing entries, buttons are invisible until hover
  const visibilityClass = hasEntries ? 'opacity-0 group-hover:opacity-100' : '';

  return (
    <div className={`flex flex-col gap-0.5 mt-0.5 transition-opacity ${visibilityClass}`}>
      {showPlanBtn && (
        <button
          type="button"
          className="text-[0.625rem] text-[#b49132] hover:text-[#6b5520] cursor-pointer text-left transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onAddPlan(day.date);
          }}
        >
          + {t('workload.planned')}
        </button>
      )}
      {showActualBtn && (
        <button
          type="button"
          className="text-[0.625rem] text-[#5c4a3e] hover:text-[#22150d] cursor-pointer text-left transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onLogActual(day.date);
          }}
        >
          + {t('workload.actual')}
        </button>
      )}
    </div>
  );
};

// ─── Component ──────────────────────────────────────────────────────────────

const MonthView: FC<MonthViewProps> = ({
  weekDays,
  calendarDays,
  calendarData,
  isLoading,
  permissions,
  isAllEmployeesMode,
  projectFilter,
  onAddPlan,
  onEditPlan,
  onViewActual,
  onLogActual,
  onViewDateEmployees,
  onSelectDate,
}) => {
  const { t } = useTranslation();

  const handleCellClick = useCallback(
    (day: CalendarDay, plansCount: number, actualsCount: number) => {
      if (isAllEmployeesMode) {
        // Only open modal if there is data to show
        if (actualsCount > 0 || plansCount > 0) {
          onViewDateEmployees(day.date);
        }
      } else {
        onSelectDate(day.date);
      }
    },
    [isAllEmployeesMode, onViewDateEmployees, onSelectDate],
  );

  const dayLabelMap: Record<DayLabel, string> = useMemo(
    () => ({
      mon: t('workload.mon'),
      tue: t('workload.tue'),
      wed: t('workload.wed'),
      thu: t('workload.thu'),
      fri: t('workload.fri'),
      sat: t('workload.sat'),
      sun: t('workload.sun'),
    }),
    [t],
  );

  // Split days into weeks (7 per row)
  const weeks: CalendarDay[][] = useMemo(() => {
    const result: CalendarDay[][] = [];
    for (let i = 0; i < calendarDays.length; i += 7) {
      result.push(calendarDays.slice(i, i + 7));
    }
    return result;
  }, [calendarDays]);

  return (
    <div className="bg-[#fdfaf0] border border-[rgba(34,21,13,0.15)] rounded-xl overflow-hidden">
      {/* Header row: Mon-Sun */}
      <div className="grid grid-cols-7 bg-[#f5ecd4] border-b border-[rgba(34,21,13,0.15)]">
        {weekDays.map((label) => (
          <div
            key={label}
            className="text-center py-2 px-1 text-xs font-semibold uppercase tracking-wider text-[#5c4a3e]"
          >
            {dayLabelMap[label]}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      {isLoading ? (
        <div className="grid grid-cols-7">
          {Array.from({ length: 42 }).map((_, i) => (
            <div
              key={i}
              className="min-h-[6rem] p-1.5 border-r border-b border-[rgba(34,21,13,0.08)]"
            >
              <div className="h-3 w-6 rounded bg-[rgba(34,21,13,0.06)] animate-pulse mb-2" />
              <div className="h-4 w-full rounded bg-[rgba(34,21,13,0.04)] animate-pulse mb-1" />
            </div>
          ))}
        </div>
      ) : (
        weeks.map((week, wIdx) => (
          <div key={wIdx} className="grid grid-cols-7">
            {week.map((day) => {
              const plans = getPlansForDate(calendarData, day.date);
              const rawActuals = getActualsForDate(calendarData, day.date);

              // Filter actuals by project if a project filter is active
              const actuals = projectFilter
                ? rawActuals.filter((a) =>
                    a.distributions.some((d) => d.projectId === projectFilter),
                  )
                : rawActuals;

              const plansCount = plans.length;
              const actualsCount = actuals.length;
              const hasEntries = plansCount > 0 || actualsCount > 0;
              const colorType = getPlanColorType(day);

              return (
                <div
                  key={day.date}
                  className={`
                    group min-h-[6rem] p-1.5
                    border-r border-b border-[rgba(34,21,13,0.08)]
                    cursor-pointer transition-colors duration-100
                    hover:bg-[rgba(34,21,13,0.03)]
                    ${day.isWeekend ? 'bg-[rgba(34,21,13,0.02)]' : ''}
                    ${!day.isCurrentMonth ? 'opacity-40' : ''}
                  `}
                  onClick={() => handleCellClick(day, plansCount, actualsCount)}
                  role="gridcell"
                  aria-label={day.date}
                >
                  {/* Day number */}
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`
                        text-xs font-medium
                        ${
                          day.isToday
                            ? 'inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#22150d] text-[#f9f0d9] font-semibold'
                            : day.isCurrentMonth
                              ? 'text-[#5c4a3e]'
                              : 'text-[rgba(34,21,13,0.25)]'
                        }
                      `}
                    >
                      {day.dayOfMonth}
                    </span>
                  </div>

                  {isAllEmployeesMode ? (
                    /* ── Aggregate count mode ── */
                    <AggregateCell
                      day={day}
                      actualsCount={actualsCount}
                      plansCount={plansCount}
                      hasEntries={hasEntries}
                      permissions={permissions}
                      onViewDateEmployees={onViewDateEmployees}
                      onAddPlan={onAddPlan}
                      onLogActual={onLogActual}
                    />
                  ) : (
                    /* ── Individual chip mode ── */
                    <ChipCell
                      day={day}
                      plans={plans}
                      actuals={actuals}
                      colorType={colorType}
                      hasEntries={hasEntries}
                      permissions={permissions}
                      onEditPlan={onEditPlan}
                      onViewActual={onViewActual}
                      onAddPlan={onAddPlan}
                      onLogActual={onLogActual}
                    />
                  )}
                </div>
              );
            })}
          </div>
        ))
      )}
    </div>
  );
};

// ─── Aggregate cell (all-employees mode) ────────────────────────────────────

const AggregateCell: FC<{
  day: CalendarDay;
  actualsCount: number;
  plansCount: number;
  hasEntries: boolean;
  permissions: WorkloadPermissions;
  onViewDateEmployees: (date: string) => void;
  onAddPlan: (date: string) => void;
  onLogActual: (date: string) => void;
}> = ({
  day,
  actualsCount,
  plansCount,
  hasEntries,
  permissions,
  onViewDateEmployees,
  onAddPlan,
  onLogActual,
}) => {
  const { t } = useTranslation();

  // Actuals take priority for past/today; plans show for future (or today with no actuals)
  const showActuals = (day.isPast || day.isToday) && actualsCount > 0;
  const showPlans = !showActuals && plansCount > 0 && (day.isFuture || day.isToday);

  return (
    <>
      {showActuals && (
        <button
          type="button"
          className="flex flex-col items-center w-full cursor-pointer hover:opacity-80 transition-opacity mt-1"
          onClick={(e) => {
            e.stopPropagation();
            onViewDateEmployees(day.date);
          }}
        >
          <span className="text-[#5c4a3e] font-bold text-lg leading-tight">
            {actualsCount}
          </span>
          <span className="text-xs text-[#7d6b5d]">
            {t('workload.report', { count: actualsCount })}
          </span>
        </button>
      )}

      {showPlans && (
        <button
          type="button"
          className="flex flex-col items-center w-full cursor-pointer hover:opacity-80 transition-opacity mt-1"
          onClick={(e) => {
            e.stopPropagation();
            onViewDateEmployees(day.date);
          }}
        >
          <span className="text-[#6b5520] font-bold text-lg leading-tight">
            {plansCount}
          </span>
          <span className="text-xs text-[#7d6b5d]">
            {t('workload.plan', { count: plansCount })}
          </span>
        </button>
      )}

      <CellActions
        day={day}
        permissions={permissions}
        hasEntries={hasEntries}
        onAddPlan={onAddPlan}
        onLogActual={onLogActual}
      />
    </>
  );
};

// ─── Chip cell (individual employee mode) ───────────────────────────────────

const ChipCell: FC<{
  day: CalendarDay;
  plans: WorkloadPlanEntry[];
  actuals: WorkloadActualEntry[];
  colorType: PlanEntryColorType;
  hasEntries: boolean;
  permissions: WorkloadPermissions;
  onEditPlan: (plan: WorkloadPlanEntry) => void;
  onViewActual: (actual: WorkloadActualEntry) => void;
  onAddPlan: (date: string) => void;
  onLogActual: (date: string) => void;
}> = ({
  day,
  plans,
  actuals,
  colorType,
  hasEntries,
  permissions,
  onEditPlan,
  onViewActual,
  onAddPlan,
  onLogActual,
}) => {
  const MAX_VISIBLE = 3;
  const totalEntries = plans.length + actuals.length;
  const hiddenCount = Math.max(0, totalEntries - MAX_VISIBLE);

  // Show plans first, then actuals, up to MAX_VISIBLE total
  const visiblePlans = plans.slice(0, MAX_VISIBLE);
  const remainingSlots = MAX_VISIBLE - visiblePlans.length;
  const visibleActuals = remainingSlots > 0 ? actuals.slice(0, remainingSlots) : [];

  return (
    <>
      {visiblePlans.map((plan) => (
        <PlanChip
          key={plan.id}
          entry={plan}
          colorType={colorType}
          showProject
          onClick={() => {
            if (permissions.canEditPlan(plan) && !day.isPast) {
              onEditPlan(plan);
            }
          }}
        />
      ))}

      {visibleActuals.map((actual) => (
        <ActualChip
          key={actual.id}
          entry={actual}
          showProject
          onClick={() => onViewActual(actual)}
        />
      ))}

      {hiddenCount > 0 && (
        <div className="text-[0.625rem] text-[#7d6b5d] mt-0.5 cursor-pointer hover:text-[#22150d]">
          +{hiddenCount}
        </div>
      )}

      <CellActions
        day={day}
        permissions={permissions}
        hasEntries={hasEntries}
        onAddPlan={onAddPlan}
        onLogActual={onLogActual}
      />
    </>
  );
};

export default MonthView;
