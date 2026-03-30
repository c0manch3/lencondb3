import { type FC } from 'react';
import { useTranslation } from 'react-i18next';
import type {
  CalendarDay,
  CalendarData,
  WorkloadPlanEntry,
  WorkloadActualEntry,
  WorkloadPermissions,
} from '../types';
import { PLAN_ENTRY_COLORS, type PlanEntryColorType } from '../types';
import {
  getPlansForDate,
  getActualsForDate,
} from '../hooks/useWorkloadData';
import type { DayLabel } from '../hooks/useCalendarNavigation';

// ─── Helpers ────────────────────────────────────────────────────────────────

function getPlanColorType(day: CalendarDay): PlanEntryColorType {
  if (day.isToday) return 'plan-today';
  return 'plan-future';
}

// ─── Props ──────────────────────────────────────────────────────────────────

interface WeekViewProps {
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

// ─── Reusable entry chips ───────────────────────────────────────────────────

const PlanEntry: FC<{
  entry: WorkloadPlanEntry;
  colorType: PlanEntryColorType;
  canEdit: boolean;
  isPast: boolean;
  showProject?: boolean;
  onClick: () => void;
}> = ({ entry, colorType, canEdit, isPast, showProject, onClick }) => {
  const colors = PLAN_ENTRY_COLORS[colorType];
  const { t } = useTranslation();
  const hoursLabel = entry.hours != null ? `${entry.hours}${t('workload.hoursShort')}` : '';

  return (
    <button
      type="button"
      className={`
        w-full text-left px-2 py-1 rounded text-xs leading-snug
        cursor-pointer overflow-hidden transition-opacity hover:opacity-80
        ${!canEdit || isPast ? 'cursor-default' : ''}
      `}
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
      <div className="font-medium truncate">
        {showProject ? entry.projectName : entry.userName}
      </div>
      <div className="truncate text-[0.6875rem] opacity-80">
        {showProject ? entry.userName : entry.projectName}
      </div>
      {hoursLabel && (
        <div className="text-[0.6875rem] opacity-70 mt-0.5">{hoursLabel}</div>
      )}
    </button>
  );
};

const ActualEntry: FC<{
  entry: WorkloadActualEntry;
  showProject?: boolean;
  onClick: () => void;
}> = ({ entry, showProject, onClick }) => {
  const colors = PLAN_ENTRY_COLORS.actual;
  const { t } = useTranslation();

  const firstProjectName =
    entry.distributions.length > 0 ? entry.distributions[0].projectName : '';

  return (
    <button
      type="button"
      className="w-full text-left px-2 py-1 rounded text-xs leading-snug cursor-pointer overflow-hidden transition-opacity hover:opacity-80"
      style={{
        backgroundColor: colors.bg,
        color: colors.text,
        borderLeft: `2px solid ${colors.border}`,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      title={`${entry.userName} - ${entry.hoursWorked}${t('workload.hoursShort')} ${t('workload.actual').toLowerCase()}`}
    >
      <div className="font-medium truncate">
        {showProject ? (firstProjectName || entry.userName) : entry.userName}
      </div>
      <div className="text-[0.6875rem] opacity-80">
        {`${entry.hoursWorked}${t('workload.hoursShort')} ${t('workload.actual').toLowerCase()}`}
      </div>
      {!showProject && entry.distributions.length > 0 && (
        <div className="text-[0.625rem] opacity-60 mt-0.5 truncate">
          {entry.distributions.map((d) => d.projectName).join(', ')}
        </div>
      )}
    </button>
  );
};

// ─── Component ──────────────────────────────────────────────────────────────

const WeekView: FC<WeekViewProps> = ({
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

  const dayLabelMap: Record<DayLabel, string> = {
    mon: t('workload.mon'),
    tue: t('workload.tue'),
    wed: t('workload.wed'),
    thu: t('workload.thu'),
    fri: t('workload.fri'),
    sat: t('workload.sat'),
    sun: t('workload.sun'),
  };

  return (
    <div className="bg-[#fdfaf0] border border-[rgba(34,21,13,0.15)] rounded-xl overflow-hidden">
      {/* Header row */}
      <div className="grid grid-cols-7 bg-[#f5ecd4] border-b border-[rgba(34,21,13,0.15)]">
        {calendarDays.map((day, idx) => (
          <div
            key={day.date}
            className="text-center py-2 px-1"
          >
            <div className="text-xs font-semibold uppercase tracking-wider text-[#5c4a3e]">
              {dayLabelMap[weekDays[idx]]}
            </div>
            <div
              className={`
                text-sm mt-0.5
                ${
                  day.isToday
                    ? 'inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#22150d] text-[#f9f0d9] font-semibold'
                    : 'text-[#5c4a3e] font-medium'
                }
              `}
            >
              {day.dayOfMonth}
            </div>
          </div>
        ))}
      </div>

      {/* Day columns */}
      {isLoading ? (
        <div className="grid grid-cols-7">
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className="min-h-[24rem] p-2 border-r border-[rgba(34,21,13,0.08)] last:border-r-0"
            >
              <div className="space-y-2">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="h-12 rounded bg-[rgba(34,21,13,0.04)] animate-pulse" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-7">
          {calendarDays.map((day) => {
            const plans = getPlansForDate(calendarData, day.date);
            const actuals = getActualsForDate(calendarData, day.date);
            const colorType = getPlanColorType(day);

            // Aggregate counts for all-employees mode, filtered by project if active
            const filteredActuals = projectFilter
              ? actuals.filter(a => a.distributions.some(d => d.projectId === projectFilter))
              : actuals;
            const actualsCount = filteredActuals.length;
            const plansCount = plans.length; // Plans already filtered by backend via projectId param

            return (
              <div
                key={day.date}
                className={`
                  min-h-[24rem] p-2
                  border-r border-[rgba(34,21,13,0.08)] last:border-r-0
                  ${day.isWeekend ? 'bg-[rgba(34,21,13,0.02)]' : ''}
                `}
                onClick={() => {
                  if (isAllEmployeesMode) {
                    if (actualsCount > 0 || plansCount > 0) {
                      onViewDateEmployees(day.date);
                    }
                  } else {
                    onSelectDate(day.date);
                  }
                }}
                role="gridcell"
                aria-label={day.date}
              >
                {isAllEmployeesMode ? (
                  /* ── Aggregate count mode ── */
                  (() => {
                    // Determine what to show: actuals take priority over plans
                    const showActuals = (day.isPast || day.isToday) && actualsCount > 0;
                    const showPlans = !showActuals && plansCount > 0 && (day.isFuture || day.isToday);

                    return (
                      <div className="flex flex-col items-center justify-center h-full min-h-[20rem]">
                        {/* Count display */}
                        {showActuals && (
                          <button
                            type="button"
                            className="flex flex-col items-center cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={(e) => { e.stopPropagation(); onViewDateEmployees(day.date); }}
                          >
                            <span className="text-[#5c4a3e] font-bold text-2xl leading-tight">{actualsCount}</span>
                            <span className="text-xs text-[#7d6b5d]">{t('workload.report', { count: actualsCount })}</span>
                          </button>
                        )}
                        {showPlans && (
                          <button
                            type="button"
                            className="flex flex-col items-center cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={(e) => { e.stopPropagation(); onViewDateEmployees(day.date); }}
                          >
                            <span className="text-[#6b5520] font-bold text-2xl leading-tight">{plansCount}</span>
                            <span className="text-xs text-[#7d6b5d]">{t('workload.plan', { count: plansCount })}</span>
                          </button>
                        )}

                        {/* Action buttons */}
                        <div className="flex gap-2 mt-2">
                          {permissions.canLogActual && (day.isPast || day.isToday) && (
                            <button
                              type="button"
                              className="text-[0.6875rem] text-[#5c4a3e] hover:text-[#22150d] cursor-pointer transition-colors"
                              onClick={(e) => { e.stopPropagation(); onLogActual(day.date); }}
                            >
                              + {t('workload.actual')}
                            </button>
                          )}
                          {permissions.canCreatePlan && (day.isFuture || day.isToday) && (
                            <button
                              type="button"
                              className="text-[0.6875rem] text-[#b49132] hover:text-[#6b5520] cursor-pointer transition-colors"
                              onClick={(e) => { e.stopPropagation(); onAddPlan(day.date); }}
                            >
                              + {t('workload.planned')}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  /* ── Individual chip mode ── */
                  <>
                    {/* Entries stack */}
                    <div className="flex flex-col gap-1">
                      {plans.map((plan) => (
                        <PlanEntry
                          key={plan.id}
                          entry={plan}
                          colorType={colorType}
                          canEdit={permissions.canEditPlan(plan)}
                          isPast={day.isPast}
                          showProject={!isAllEmployeesMode}
                          onClick={() => {
                            if (permissions.canEditPlan(plan) && !day.isPast) {
                              onEditPlan(plan);
                            }
                          }}
                        />
                      ))}

                      {filteredActuals.map((actual) => (
                        <ActualEntry
                          key={actual.id}
                          entry={actual}
                          showProject={!isAllEmployeesMode}
                          onClick={() => onViewActual(actual)}
                        />
                      ))}
                    </div>

                    {/* Action buttons at bottom */}
                    <div className="mt-2 flex flex-col gap-1">
                      {permissions.canCreatePlan && !day.isPast && (
                        <button
                          type="button"
                          className="text-[0.6875rem] text-[#b49132] hover:text-[#6b5520] cursor-pointer text-left transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            onAddPlan(day.date);
                          }}
                        >
                          + {t('workload.addPlanned')}
                        </button>
                      )}
                      {permissions.canLogActual && !day.isFuture && (
                        <button
                          type="button"
                          className="text-[0.6875rem] text-[#5c4a3e] hover:text-[#22150d] cursor-pointer text-left transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            onLogActual(day.date);
                          }}
                        >
                          + {t('workload.logHours')}
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default WeekView;
