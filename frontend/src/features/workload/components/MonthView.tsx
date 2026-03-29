import { type FC, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type {
  CalendarDay,
  CalendarData,
  WorkloadPlanEntry,
  WorkloadActualEntry,
  WorkloadPermissions,
} from '../types';
import { PLAN_ENTRY_COLORS, type PlanEntryColorType } from '../types';
import { getPlansForDate, getActualsForDate, getEmployeesForDate } from '../hooks/useWorkloadData';
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
  onClick: () => void;
}> = ({ entry, colorType, onClick }) => {
  const colors = PLAN_ENTRY_COLORS[colorType];
  const { t } = useTranslation();
  const hoursLabel = entry.hours != null ? `${entry.hours}${t('workload.hoursShort')}` : '';

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
      {entry.userInitials} {hoursLabel}
    </button>
  );
};

// ─── Actual entry chip ──────────────────────────────────────────────────────

const ActualChip: FC<{
  entry: WorkloadActualEntry;
  onClick: () => void;
}> = ({ entry, onClick }) => {
  const colors = PLAN_ENTRY_COLORS.actual;
  const { t } = useTranslation();

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
      {entry.userInitials} {entry.hoursWorked}{t('workload.hoursShort')}
    </button>
  );
};

// ─── Component ──────────────────────────────────────────────────────────────

const MonthView: FC<MonthViewProps> = ({
  weekDays,
  calendarDays,
  calendarData,
  isLoading,
  permissions,
  onAddPlan,
  onEditPlan,
  onViewActual,
  onLogActual,
  onViewDateEmployees,
  onSelectDate,
}) => {
  const { t } = useTranslation();

  const handleCellClick = useCallback(
    (day: CalendarDay) => {
      onSelectDate(day.date);
    },
    [onSelectDate],
  );

  const dayLabelMap: Record<DayLabel, string> = {
    mon: t('workload.mon'),
    tue: t('workload.tue'),
    wed: t('workload.wed'),
    thu: t('workload.thu'),
    fri: t('workload.fri'),
    sat: t('workload.sat'),
    sun: t('workload.sun'),
  };

  // Split days into weeks (7 per row)
  const weeks: CalendarDay[][] = [];
  for (let i = 0; i < calendarDays.length; i += 7) {
    weeks.push(calendarDays.slice(i, i + 7));
  }

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
              const actuals = getActualsForDate(calendarData, day.date);
              const employeeCount = getEmployeesForDate(calendarData, day.date).length;
              const colorType = getPlanColorType(day);

              // Show max 3 entries in month view, then "+N more"
              const MAX_VISIBLE = 3;
              const allEntries = plans.length + actuals.length;
              const hiddenCount = Math.max(0, allEntries - MAX_VISIBLE);

              return (
                <div
                  key={day.date}
                  className={`
                    min-h-[6rem] p-1.5
                    border-r border-b border-[rgba(34,21,13,0.08)]
                    cursor-pointer transition-colors duration-100
                    hover:bg-[rgba(34,21,13,0.03)]
                    ${day.isWeekend ? 'bg-[rgba(34,21,13,0.02)]' : ''}
                    ${!day.isCurrentMonth ? 'opacity-40' : ''}
                  `}
                  onClick={() => handleCellClick(day)}
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

                    {/* Employee count badge */}
                    {permissions.canViewAllEmployees && employeeCount > 0 && (
                      <button
                        type="button"
                        className="text-[0.625rem] text-[#7d6b5d] hover:text-[#22150d] cursor-pointer transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewDateEmployees(day.date);
                        }}
                        title={t('workload.employeesAssignedCount', { count: employeeCount })}
                      >
                        {employeeCount}
                      </button>
                    )}
                  </div>

                  {/* Plan entries */}
                  {plans.slice(0, MAX_VISIBLE).map((plan) => (
                    <PlanChip
                      key={plan.id}
                      entry={plan}
                      colorType={colorType}
                      onClick={() => {
                        if (permissions.canEditPlan(plan) && !day.isPast) {
                          onEditPlan(plan);
                        }
                      }}
                    />
                  ))}

                  {/* Actual entries (only show if under MAX_VISIBLE) */}
                  {plans.length < MAX_VISIBLE &&
                    actuals.slice(0, MAX_VISIBLE - plans.length).map((actual) => (
                      <ActualChip
                        key={actual.id}
                        entry={actual}
                        onClick={() => onViewActual(actual)}
                      />
                    ))}

                  {/* Overflow indicator */}
                  {hiddenCount > 0 && (
                    <div className="text-[0.625rem] text-[#7d6b5d] mt-0.5 cursor-pointer hover:text-[#22150d]">
                      +{hiddenCount}
                    </div>
                  )}

                  {/* Add action indicators on hover */}
                  {day.isCurrentMonth && allEntries === 0 && (
                    <div className="opacity-0 hover:opacity-100 transition-opacity">
                      {permissions.canCreatePlan && !day.isPast && (
                        <button
                          type="button"
                          className="text-[0.625rem] text-[#b49132] hover:text-[#6b5520] cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            onAddPlan(day.date);
                          }}
                        >
                          + {t('workload.planned')}
                        </button>
                      )}
                      {permissions.canLogActual && !day.isFuture && (
                        <button
                          type="button"
                          className="text-[0.625rem] text-[#5c4a3e] hover:text-[#22150d] block cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            onLogActual(day.date);
                          }}
                        >
                          + {t('workload.actual')}
                        </button>
                      )}
                    </div>
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

export default MonthView;
