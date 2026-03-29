import { useTranslation } from 'react-i18next';
import type {
  CalendarData,
  ActualCalendarData,
  WorkloadPlanEntry,
  WorkloadActualEntry,
} from '@/components/workload/types';
import {
  formatDateKey,
  isToday,
  isFutureDate,
  isTodayOrPast,
} from '@/components/workload/types';

export interface DayViewProps {
  currentDay: Date;
  calendarData: CalendarData;
  actualCalendarData: ActualCalendarData;
  selectedEmployee: string;
  isEmployee: boolean;
  isOnlyManager: boolean;
  canModifyPlan: (plan: WorkloadPlanEntry) => boolean;
  onOpenAddModal: (date: string) => void;
  onOpenAddActualModal: (date: string) => void;
  onOpenEditModal: (plan: WorkloadPlanEntry, dateKey: string) => void;
  onDeletePlan: (planId: string, dateKey: string, plan?: WorkloadPlanEntry) => void;
  onViewActualEntry: (entry: WorkloadActualEntry) => void;
  onOpenDateEmployeesModal: (date: string) => void;
}

export default function DayView({
  currentDay,
  calendarData,
  actualCalendarData,
  selectedEmployee,
  isEmployee,
  isOnlyManager,
  canModifyPlan,
  onOpenAddModal,
  onOpenAddActualModal,
  onOpenEditModal,
  onDeletePlan,
  onViewActualEntry,
  onOpenDateEmployeesModal,
}: DayViewProps) {
  const { t } = useTranslation();

  const dateKey = formatDateKey(currentDay);
  const dayPlans = calendarData[dateKey] || [];
  const dayActual = actualCalendarData[dateKey];
  const dayIsToday = isToday(currentDay);
  const dayIsFuture = isFutureDate(currentDay);
  const isAllEmployeesMode = !selectedEmployee;
  // Feature #323: Future dates with plans should be highlighted in green
  const shouldHighlightGreen = dayIsFuture && dayPlans.length > 0;

  return (
    <div className="min-h-64">
      <div className={`p-4 border rounded-[0.4rem] ${shouldHighlightGreen ? 'bg-green-50' : 'bg-cream-50'} ${dayIsToday ? 'border-brown-500 border-2' : 'border-brown-200'}`}>
        <div className="flex items-center justify-between mb-4">
          <span className={`text-xl font-semibold ${dayIsToday ? 'text-brown-600' : 'text-brown-900'}`}>
            {currentDay.getDate()}
          </span>
          {(isOnlyManager || isEmployee) && dayIsFuture && (
            <button
              onClick={() => onOpenAddModal(dateKey)}
              className="btn-primary text-sm"
              aria-label={t('workload.addWorkloadFor', { date: dateKey })}
            >
              + {t('workload.addPlanned')}
            </button>
          )}
          {(isEmployee || !isAllEmployeesMode) && isTodayOrPast(currentDay) && !dayActual && (
            <button
              onClick={() => onOpenAddActualModal(dateKey)}
              className="btn-primary text-sm !bg-green-600 hover:!bg-green-700"
              aria-label={t('workload.logHoursFor', { date: dateKey })}
            >
              + {t('workload.logHours')}
            </button>
          )}
        </div>
        {dayActual && (
          <div
            className="bg-green-100 text-green-800 p-4 rounded-[0.4rem] cursor-pointer hover:bg-green-200 transition-colors mb-3"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onViewActualEntry(dayActual); } }}
            onClick={() => onViewActualEntry(dayActual)}
            title={t('common.clickToViewDetails')}
          >
            <div className="font-medium text-lg">{dayActual.hoursWorked} {t('workload.hoursWorked')}</div>
            {dayActual.userText && <div className="text-green-600 mt-2">{dayActual.userText}</div>}
            {(dayActual.distributions?.length ?? 0) > 0 && (
              <div className="text-green-600 mt-2 space-y-1">
                {dayActual.distributions!.map((d, i) => (
                  <div key={i}>
                    {d.hours} {t('workload.hours')} - {d.project.name}
                    {d.description && <span className="text-green-500 block text-sm">{d.description}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {dayPlans.length === 0 && !dayActual ? (
          <div className="text-brown-500 text-center py-8">
            {dayIsFuture ? t('workload.noWorkload') : t('workload.noHoursLogged')}
          </div>
        ) : (
          <div className="space-y-3">
            {dayPlans.map((plan) => {
              const canModify = canModifyPlan(plan);
              return (
                <div
                  key={plan.id}
                  className={`bg-brown-100 text-brown-800 p-4 rounded-[0.4rem] group relative ${canModify && !isAllEmployeesMode ? 'cursor-pointer hover:bg-brown-200' : ''}`}
                  title={canModify && !isAllEmployeesMode ? t('common.clickToEdit') : undefined}
                  onClick={() => {
                    if (canModify && !isAllEmployeesMode) {
                      onOpenEditModal(plan, dateKey);
                    } else if (isAllEmployeesMode && dayPlans.length > 0) {
                      onOpenDateEmployeesModal(dateKey);
                    }
                  }}
                >
                  <div className="font-medium text-lg">{plan.user.firstName} {plan.user.lastName}</div>
                  <div className="text-brown-600">
                    {plan.project.name}{plan.hours != null ? ` (${plan.hours}${t('workload.hoursShort')})` : ''}
                  </div>
                  {canModify && !isAllEmployeesMode && dayIsFuture && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeletePlan(plan.id, dateKey, plan);
                      }}
                      className="absolute right-2 top-2 text-red-600 hover:text-red-800 p-2"
                      aria-label={t('common.delete')}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {isAllEmployeesMode && dayPlans.length > 0 && (
          <button
            onClick={() => onOpenDateEmployeesModal(dateKey)}
            className="mt-4 w-full text-center text-brown-600 hover:text-brown-800 text-sm font-medium py-2 border border-brown-200 rounded-[0.4rem] hover:bg-brown-50"
          >
            {t('workload.viewAllEmployeesAssigned', { count: new Set(dayPlans.map(p => p.user?.id)).size })}
          </button>
        )}
      </div>
    </div>
  );
}
