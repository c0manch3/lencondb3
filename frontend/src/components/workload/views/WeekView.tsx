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

export interface WeekViewProps {
  weekDays: Date[];
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

export default function WeekView({
  weekDays,
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
}: WeekViewProps) {
  const { t } = useTranslation();

  const isAllEmployeesMode = !selectedEmployee;

  return (
    <>
      <div className="grid grid-cols-7 gap-1 mb-2">
        {[t('workload.sun'), t('workload.mon'), t('workload.tue'), t('workload.wed'), t('workload.thu'), t('workload.fri'), t('workload.sat')].map((day) => (
          <div key={day} className="text-center text-sm font-medium text-brown-500 py-2">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {weekDays.map((day, index) => {
          const dateKey = formatDateKey(day);
          const dayPlans = calendarData[dateKey] || [];
          const dayActual = actualCalendarData[dateKey];
          const dayIsToday = isToday(day);
          const dayIsFuture = isFutureDate(day);
          // Feature #323: Future dates with plans should be highlighted in green
          const shouldHighlightGreen = dayIsFuture && dayPlans.length > 0;

          return (
            <div
              key={index}
              className={`min-h-32 p-2 border rounded-[0.4rem] ${shouldHighlightGreen ? 'bg-green-50' : 'bg-cream-50'} ${dayIsToday ? 'border-brown-500 border-2' : 'border-brown-200'} ${
                isAllEmployeesMode && dayPlans.length > 0 ? 'cursor-pointer hover:bg-cream-100' : ''
              }`}
              onClick={(e) => {
                if (isAllEmployeesMode && dayPlans.length > 0 && e.target === e.currentTarget) {
                  onOpenDateEmployeesModal(dateKey);
                }
              }}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`text-sm font-medium ${dayIsToday ? 'text-brown-600' : 'text-brown-900'}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isAllEmployeesMode && dayPlans.length > 0) {
                      onOpenDateEmployeesModal(dateKey);
                    }
                  }}
                >
                  {day.getDate()}
                </span>
                {(isOnlyManager || isEmployee) && dayIsFuture && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenAddModal(dateKey);
                    }}
                    className="text-brown-600 hover:text-brown-800 p-1"
                    aria-label={t('workload.addWorkloadFor', { date: dateKey })}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                )}
                {(isEmployee || !isAllEmployeesMode) && isTodayOrPast(day) && !dayActual && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenAddActualModal(dateKey);
                    }}
                    className="text-green-700 hover:text-green-900 p-1"
                    aria-label={t('workload.addHoursFor', { date: dateKey })}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                )}
              </div>
              <div
                className="space-y-1"
                onClick={(e) => {
                  e.stopPropagation();
                  if (isAllEmployeesMode && dayPlans.length > 0) {
                    onOpenDateEmployeesModal(dateKey);
                  }
                }}
              >
                {/* Feature #339: In "All Employees" mode, show unique employee count instead of total plans */}
                {isAllEmployeesMode && dayPlans.length > 0 ? (() => {
                  const uniqueEmployees = new Set(dayPlans.map(p => p.user?.id)).size;
                  return (
                    <div className="text-center py-2">
                      <div className="text-2xl font-bold text-green-600">{uniqueEmployees}</div>
                      <div className="text-xs text-brown-600">
                        {uniqueEmployees === 1 ? t('workload.employeePlan') : t('workload.employeePlans')}
                      </div>
                    </div>
                  );
                })() : (
                  dayPlans.map((plan) => {
                    const canModify = canModifyPlan(plan);
                    return (
                      <div
                        key={plan.id}
                        className={`text-xs bg-brown-100 text-brown-800 p-1 rounded truncate group relative ${canModify && !isAllEmployeesMode ? 'cursor-pointer hover:bg-brown-200' : ''}`}
                        title={`${plan.user.firstName} ${plan.user.lastName} - ${plan.project.name}${plan.hours != null ? ` (${plan.hours}${t('workload.hoursShort')})` : ''}${canModify && !isAllEmployeesMode ? ` (${t('common.clickToEdit')})` : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (canModify && !isAllEmployeesMode) {
                            onOpenEditModal(plan, dateKey);
                          } else if (isAllEmployeesMode && dayPlans.length > 0) {
                            onOpenDateEmployeesModal(dateKey);
                          }
                        }}
                      >
                        <span className="font-medium">{plan.user.firstName}</span>
                        <span className="text-brown-600"> - {plan.project.name}{plan.hours != null ? ` (${plan.hours}${t('workload.hoursShort')})` : ''}</span>
                      </div>
                    );
                  })
                )}
                {dayActual && (
                  <div
                    className="text-xs bg-green-100 text-green-800 p-1 rounded cursor-pointer hover:bg-green-200 transition-colors"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onViewActualEntry(dayActual); } }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewActualEntry(dayActual);
                    }}
                    title={t('common.clickToViewDetails')}
                  >
                    <div className="font-medium">{dayActual.hoursWorked} {t('workload.hours')}</div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
