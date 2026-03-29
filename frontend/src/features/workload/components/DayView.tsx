import { type FC } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/components';
import type {
  CalendarDay,
  CalendarData,
  WorkloadPlanEntry,
  WorkloadActualEntry,
  WorkloadPermissions,
} from '../types';
import { PLAN_ENTRY_COLORS, type PlanEntryColorType } from '../types';
import { getPlansForDate, getActualsForDate } from '../hooks/useWorkloadData';

// ─── Icons ──────────────────────────────────────────────────────────────────

function PencilIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.519.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
    </svg>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getPlanColorType(day: CalendarDay): PlanEntryColorType {
  if (day.isToday) return 'plan-today';
  return 'plan-future';
}

// ─── Props ──────────────────────────────────────────────────────────────────

interface DayViewProps {
  calendarDays: CalendarDay[];
  calendarData: CalendarData | undefined;
  isLoading: boolean;
  permissions: WorkloadPermissions;
  onAddPlan: (date: string) => void;
  onEditPlan: (plan: WorkloadPlanEntry) => void;
  onDeletePlan: (plan: WorkloadPlanEntry) => void;
  onViewActual: (actual: WorkloadActualEntry) => void;
  onLogActual: (date: string) => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

const DayView: FC<DayViewProps> = ({
  calendarDays,
  calendarData,
  isLoading,
  permissions,
  onAddPlan,
  onEditPlan,
  onDeletePlan,
  onViewActual,
  onLogActual,
}) => {
  const { t } = useTranslation();

  if (calendarDays.length === 0) return null;

  const day = calendarDays[0];
  const plans = getPlansForDate(calendarData, day.date);
  const actuals = getActualsForDate(calendarData, day.date);
  const colorType = getPlanColorType(day);

  if (isLoading) {
    return (
      <div className="bg-[#fdfaf0] border border-[rgba(34,21,13,0.15)] rounded-xl p-6 space-y-4">
        {[1, 2, 3].map((n) => (
          <div key={n} className="h-16 rounded bg-[rgba(34,21,13,0.04)] animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="bg-[#fdfaf0] border border-[rgba(34,21,13,0.15)] rounded-xl overflow-hidden">
      {/* Day header */}
      <div className="bg-[#f5ecd4] px-4 py-3 border-b border-[rgba(34,21,13,0.15)] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span
            className={`
              text-lg font-semibold
              ${
                day.isToday
                  ? 'inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#22150d] text-[#f9f0d9]'
                  : 'text-[#22150d]'
              }
            `}
          >
            {day.dayOfMonth}
          </span>
          <span className="text-sm text-[#5c4a3e]">
            {new Date(day.date + 'T00:00:00').toLocaleDateString(undefined, {
              weekday: 'long',
              month: 'long',
              year: 'numeric',
            })}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {permissions.canCreatePlan && !day.isPast && (
            <Button variant="secondary" size="sm" onClick={() => onAddPlan(day.date)}>
              + {t('workload.addPlanned')}
            </Button>
          )}
          {permissions.canLogActual && !day.isFuture && (
            <Button variant="primary" size="sm" onClick={() => onLogActual(day.date)}>
              {t('workload.logHours')}
            </Button>
          )}
        </div>
      </div>

      {/* Plan section */}
      {plans.length > 0 && (
        <div className="px-4 py-3 border-b border-[rgba(34,21,13,0.08)]">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#5c4a3e] mb-2">
            {t('workload.planned')} ({plans.length})
          </h3>
          <div className="space-y-2">
            {plans.map((plan) => {
              const colors = PLAN_ENTRY_COLORS[colorType];
              const canEdit = permissions.canEditPlan(plan) && !day.isPast;
              const canDelete = permissions.canDeletePlan(plan) && !day.isPast;

              return (
                <div
                  key={plan.id}
                  className="flex items-center justify-between p-3 rounded"
                  style={{
                    backgroundColor: colors.bg,
                    borderLeft: `3px solid ${colors.border}`,
                  }}
                >
                  <div>
                    <div className="text-sm font-medium" style={{ color: colors.text }}>
                      {plan.userName}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: colors.text, opacity: 0.8 }}>
                      {plan.projectName}
                      {plan.hours != null && ` - ${plan.hours}${t('workload.hoursShort')}`}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {canEdit && (
                      <button
                        type="button"
                        className="inline-flex items-center justify-center w-7 h-7 rounded text-[#5c4a3e] hover:bg-[rgba(34,21,13,0.08)] transition-colors cursor-pointer"
                        onClick={() => onEditPlan(plan)}
                        aria-label={t('common.edit')}
                      >
                        <PencilIcon />
                      </button>
                    )}
                    {canDelete && (
                      <button
                        type="button"
                        className="inline-flex items-center justify-center w-7 h-7 rounded text-[#5c4a3e] hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer"
                        onClick={() => onDeletePlan(plan)}
                        aria-label={t('common.delete')}
                      >
                        <TrashIcon />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Actual section */}
      {actuals.length > 0 && (
        <div className="px-4 py-3 border-b border-[rgba(34,21,13,0.08)]">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#5c4a3e] mb-2">
            {t('workload.actual')} ({actuals.length})
          </h3>
          <div className="space-y-2">
            {actuals.map((actual) => {
              const colors = PLAN_ENTRY_COLORS.actual;

              return (
                <button
                  key={actual.id}
                  type="button"
                  className="w-full text-left p-3 rounded cursor-pointer transition-opacity hover:opacity-80"
                  style={{
                    backgroundColor: colors.bg,
                    borderLeft: `3px solid ${colors.border}`,
                  }}
                  onClick={() => onViewActual(actual)}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium" style={{ color: colors.text }}>
                      {actual.userName}
                    </div>
                    <div className="text-sm font-semibold" style={{ color: colors.text }}>
                      {actual.hoursWorked}{t('workload.hoursShort')}
                    </div>
                  </div>
                  {actual.userText && (
                    <div className="text-xs mt-1" style={{ color: colors.text, opacity: 0.7 }}>
                      {actual.userText}
                    </div>
                  )}
                  {actual.distributions.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {actual.distributions.map((d) => (
                        <span
                          key={d.id}
                          className="text-[0.625rem] px-1.5 py-0.5 rounded bg-[rgba(34,21,13,0.06)]"
                          style={{ color: colors.text }}
                        >
                          {d.projectName} ({d.hours}{t('workload.hoursShort')})
                        </span>
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {plans.length === 0 && actuals.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
          <p className="text-sm text-[#7d6b5d]">{t('workload.noWorkload')}</p>
        </div>
      )}
    </div>
  );
};

export default DayView;
