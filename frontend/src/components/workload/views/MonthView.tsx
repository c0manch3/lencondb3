import { useTranslation } from 'react-i18next';
import {
  formatDateKey,
  isToday,
  isFutureDate,
  isTodayOrPast,
} from '../types';
import type {
  CalendarDay,
  CalendarData,
  ActualCalendarData,
  WorkloadPlanEntry,
  WorkloadActualEntry,
} from '../types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface MonthViewProps {
  calendarDays: CalendarDay[];
  calendarData: CalendarData;
  actualCalendarData: ActualCalendarData;

  selectedProject: string;
  selectedEmployee: string;

  isEmployee: boolean;
  isOnlyManager: boolean;

  canModifyPlan: (plan: WorkloadPlanEntry) => boolean;
  getActualReportsCountForDate: (dateKey: string) => number;

  onOpenAddModal: (date: string) => void;
  onOpenAddActualModal: (date: string) => void;
  onOpenEditModal: (plan: WorkloadPlanEntry, dateKey: string) => void;
  onDeletePlan: (planId: string, dateKey: string, plan?: WorkloadPlanEntry) => void;
  onOpenDateEmployeesModal: (date: string) => void;
  onViewActualEntry: (entry: WorkloadActualEntry) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function MonthView({
  calendarDays,
  calendarData,
  actualCalendarData,
  selectedProject,
  selectedEmployee,
  isEmployee,
  isOnlyManager,
  canModifyPlan,
  getActualReportsCountForDate,
  onOpenAddModal,
  onOpenAddActualModal,
  onOpenEditModal,
  onDeletePlan,
  onOpenDateEmployeesModal,
  onViewActualEntry,
}: MonthViewProps) {
  const { t } = useTranslation();

  const isAllEmployeesMode = !selectedEmployee;
  const isSingleEmployeeMode = !!(selectedEmployee && selectedProject);
  const isSingleEmployeeAllProjectsMode = !!(selectedEmployee && !selectedProject);

  return (
    <>
      {/* Day-of-week header row */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {[
          t('workload.sun'),
          t('workload.mon'),
          t('workload.tue'),
          t('workload.wed'),
          t('workload.thu'),
          t('workload.fri'),
          t('workload.sat'),
        ].map((day) => (
          <div
            key={day}
            className="text-center text-sm font-medium text-brown-500 py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day, index) => {
          const dateKey = formatDateKey(day.date);
          const dayPlans = calendarData[dateKey] || [];
          const dayActual = actualCalendarData[dateKey];
          const dayIsToday = isToday(day.date);
          const dayIsFuture = isFutureDate(day.date);
          const dayIsPastOrToday = !dayIsFuture;

          // In "All Employees" mode, get actual reports count for past/today dates
          const actualReportsCount = isAllEmployeesMode
            ? getActualReportsCountForDate(dateKey)
            : 0;
          const shouldShowActualCount =
            isAllEmployeesMode && dayIsPastOrToday && actualReportsCount > 0;

          // Feature #323: Future dates with plans should be highlighted in green
          const shouldHighlightGreen = dayIsFuture && dayPlans.length > 0;

          const hasClickableData =
            (isAllEmployeesMode ||
              isSingleEmployeeMode ||
              isSingleEmployeeAllProjectsMode) &&
            (dayPlans.length > 0 || actualReportsCount > 0 || dayActual) &&
            day.isCurrentMonth;

          return (
            <div
              key={index}
              className={`min-h-24 p-2 border rounded-[0.4rem] ${
                day.isCurrentMonth
                  ? shouldHighlightGreen
                    ? 'bg-green-50'
                    : 'bg-cream-50'
                  : 'bg-cream-100'
              } ${
                dayIsToday ? 'border-brown-500 border-2' : 'border-brown-200'
              } ${hasClickableData ? 'cursor-pointer hover:bg-cream-100' : ''}`}
              onClick={(e) => {
                if (e.target !== e.currentTarget) return;
                if (
                  isAllEmployeesMode &&
                  (dayPlans.length > 0 || actualReportsCount > 0) &&
                  day.isCurrentMonth
                ) {
                  onOpenDateEmployeesModal(dateKey);
                } else if (
                  (isSingleEmployeeMode || isSingleEmployeeAllProjectsMode) &&
                  (dayPlans.length > 0 || dayActual) &&
                  day.isCurrentMonth
                ) {
                  onOpenDateEmployeesModal(dateKey);
                }
              }}
            >
              {/* Day number + action buttons */}
              <DayCellHeader
                day={day}
                dateKey={dateKey}
                dayIsToday={dayIsToday}
                dayIsFuture={dayIsFuture}
                dayPlans={dayPlans}
                dayActual={dayActual}
                actualReportsCount={actualReportsCount}
                isAllEmployeesMode={isAllEmployeesMode}
                isSingleEmployeeMode={isSingleEmployeeMode}
                isSingleEmployeeAllProjectsMode={isSingleEmployeeAllProjectsMode}
                isOnlyManager={isOnlyManager}
                isEmployee={isEmployee}
                onOpenAddModal={onOpenAddModal}
                onOpenAddActualModal={onOpenAddActualModal}
                onOpenDateEmployeesModal={onOpenDateEmployeesModal}
                t={t}
              />

              {/* Cell content */}
              <DayCellContent
                day={day}
                dateKey={dateKey}
                dayPlans={dayPlans}
                dayActual={dayActual}
                dayIsFuture={dayIsFuture}
                shouldShowActualCount={shouldShowActualCount}
                actualReportsCount={actualReportsCount}
                isAllEmployeesMode={isAllEmployeesMode}
                isSingleEmployeeMode={isSingleEmployeeMode}
                isSingleEmployeeAllProjectsMode={isSingleEmployeeAllProjectsMode}
                isEmployee={isEmployee}
                canModifyPlan={canModifyPlan}
                onOpenEditModal={onOpenEditModal}
                onDeletePlan={onDeletePlan}
                onOpenDateEmployeesModal={onOpenDateEmployeesModal}
                onViewActualEntry={onViewActualEntry}
                t={t}
              />
            </div>
          );
        })}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Sub-components (file-private)
// ---------------------------------------------------------------------------

interface DayCellHeaderProps {
  day: CalendarDay;
  dateKey: string;
  dayIsToday: boolean;
  dayIsFuture: boolean;
  dayPlans: WorkloadPlanEntry[];
  dayActual: WorkloadActualEntry | undefined;
  actualReportsCount: number;
  isAllEmployeesMode: boolean;
  isSingleEmployeeMode: boolean;
  isSingleEmployeeAllProjectsMode: boolean;
  isOnlyManager: boolean;
  isEmployee: boolean;
  onOpenAddModal: (date: string) => void;
  onOpenAddActualModal: (date: string) => void;
  onOpenDateEmployeesModal: (date: string) => void;
  t: (key: string, options?: Record<string, unknown>) => string;
}

function DayCellHeader({
  day,
  dateKey,
  dayIsToday,
  dayIsFuture,
  dayPlans,
  dayActual,
  actualReportsCount,
  isAllEmployeesMode,
  isSingleEmployeeMode,
  isSingleEmployeeAllProjectsMode,
  isOnlyManager,
  isEmployee,
  onOpenAddModal,
  onOpenAddActualModal,
  onOpenDateEmployeesModal,
  t,
}: DayCellHeaderProps) {
  const canOpenDateModal =
    day.isCurrentMonth &&
    ((isAllEmployeesMode && (dayPlans.length > 0 || actualReportsCount > 0)) ||
      ((isSingleEmployeeMode || isSingleEmployeeAllProjectsMode) &&
        (dayPlans.length > 0 || dayActual)));

  return (
    <div className="flex items-center justify-between mb-1">
      <span
        className={`text-sm font-medium ${
          day.isCurrentMonth ? 'text-brown-900' : 'text-brown-400'
        } ${dayIsToday ? 'text-brown-600' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          if (canOpenDateModal) {
            onOpenDateEmployeesModal(dateKey);
          }
        }}
      >
        {day.date.getDate()}
      </span>

      {/* Add plan "+" button — non-single-employee modes */}
      {(isOnlyManager || isEmployee) &&
        day.isCurrentMonth &&
        dayIsFuture &&
        !isSingleEmployeeMode &&
        !isSingleEmployeeAllProjectsMode && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenAddModal(dateKey);
            }}
            className="text-brown-600 hover:text-brown-800 p-1"
            aria-label={t('workload.addWorkloadFor', { date: dateKey })}
          >
            <PlusIcon />
          </button>
        )}

      {/* Add plan "+" button — single employee modes (multi-project) */}
      {(isOnlyManager || isEmployee) &&
        day.isCurrentMonth &&
        dayIsFuture &&
        (isSingleEmployeeMode || isSingleEmployeeAllProjectsMode) && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenAddModal(dateKey);
            }}
            className="text-brown-600 hover:text-brown-800 p-1"
            aria-label={t('workload.addWorkloadFor', { date: dateKey })}
          >
            <PlusIcon />
          </button>
        )}

      {/* Add actual "+" button */}
      {day.isCurrentMonth &&
        isTodayOrPast(day.date) &&
        !dayActual &&
        (isEmployee ||
          (!isAllEmployeesMode &&
            !isSingleEmployeeMode &&
            !isSingleEmployeeAllProjectsMode)) && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenAddActualModal(dateKey);
            }}
            className="text-green-700 hover:text-green-900 p-1"
            aria-label={t('workload.addHoursFor', { date: dateKey })}
          >
            <PlusIcon />
          </button>
        )}
    </div>
  );
}

// ---------------------------------------------------------------------------

interface DayCellContentProps {
  day: CalendarDay;
  dateKey: string;
  dayPlans: WorkloadPlanEntry[];
  dayActual: WorkloadActualEntry | undefined;
  dayIsFuture: boolean;
  shouldShowActualCount: boolean;
  actualReportsCount: number;
  isAllEmployeesMode: boolean;
  isSingleEmployeeMode: boolean;
  isSingleEmployeeAllProjectsMode: boolean;
  isEmployee: boolean;
  canModifyPlan: (plan: WorkloadPlanEntry) => boolean;
  onOpenEditModal: (plan: WorkloadPlanEntry, dateKey: string) => void;
  onDeletePlan: (planId: string, dateKey: string, plan?: WorkloadPlanEntry) => void;
  onOpenDateEmployeesModal: (date: string) => void;
  onViewActualEntry: (entry: WorkloadActualEntry) => void;
  t: (key: string, options?: Record<string, unknown>) => string;
}

function DayCellContent({
  day,
  dateKey,
  dayPlans,
  dayActual,
  dayIsFuture,
  shouldShowActualCount,
  actualReportsCount,
  isAllEmployeesMode,
  isSingleEmployeeMode,
  isSingleEmployeeAllProjectsMode,
  isEmployee,
  canModifyPlan,
  onOpenEditModal,
  onDeletePlan,
  onOpenDateEmployeesModal,
  onViewActualEntry,
  t,
}: DayCellContentProps) {
  const handleContentAreaClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (
      isAllEmployeesMode &&
      (dayPlans.length > 0 || actualReportsCount > 0) &&
      day.isCurrentMonth
    ) {
      onOpenDateEmployeesModal(dateKey);
    } else if (
      (isSingleEmployeeMode || isSingleEmployeeAllProjectsMode) &&
      (dayPlans.length > 0 || dayActual) &&
      day.isCurrentMonth
    ) {
      onOpenDateEmployeesModal(dateKey);
    }
  };

  return (
    <div className="space-y-1" onClick={handleContentAreaClick}>
      {/* In "All Employees" mode for past/today dates, show count of actual reports */}
      {shouldShowActualCount ? (
        <div className="text-center py-2">
          <div className="text-2xl font-bold text-brown-600">
            {actualReportsCount}
          </div>
          <div className="text-xs text-brown-600">
            {actualReportsCount === 1
              ? t('workload.employeeReport')
              : t('workload.employeeReports')}
          </div>
        </div>
      ) : (
        <>
          {/* Feature #339: In "All Employees" mode, show unique employee count */}
          {isAllEmployeesMode && dayPlans.length > 0 ? (
            (() => {
              const uniqueEmployees = new Set(
                dayPlans.map((p) => p.user?.id),
              ).size;
              return (
                <div className="text-center py-2">
                  <div className="text-2xl font-bold text-green-600">
                    {uniqueEmployees}
                  </div>
                  <div className="text-xs text-brown-600">
                    {uniqueEmployees === 1
                      ? t('workload.employeePlan')
                      : t('workload.employeePlans')}
                  </div>
                </div>
              );
            })()
          ) : (
            <>
              {/* Show plan entries for non-All-Employees modes */}
              {dayPlans.map((plan) => {
                const canModify = canModifyPlan(plan);
                return (
                  <PlanEntryRow
                    key={plan.id}
                    plan={plan}
                    dateKey={dateKey}
                    dayPlans={dayPlans}
                    dayActual={dayActual}
                    dayIsFuture={dayIsFuture}
                    canModify={canModify}
                    isAllEmployeesMode={isAllEmployeesMode}
                    isSingleEmployeeMode={isSingleEmployeeMode}
                    isSingleEmployeeAllProjectsMode={
                      isSingleEmployeeAllProjectsMode
                    }
                    onOpenEditModal={onOpenEditModal}
                    onDeletePlan={onDeletePlan}
                    onOpenDateEmployeesModal={onOpenDateEmployeesModal}
                    t={t}
                  />
                );
              })}
            </>
          )}

          {/* Single employee modes: actual report summary for past/today */}
          {(isSingleEmployeeMode || isSingleEmployeeAllProjectsMode) &&
            isTodayOrPast(day.date) &&
            dayActual && (
              <div
                className="text-xs bg-green-100 text-green-800 p-1 rounded cursor-pointer hover:bg-green-200"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onViewActualEntry(dayActual);
                  }
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenDateEmployeesModal(dateKey);
                }}
              >
                <div className="font-medium">
                  {t('workload.actualHours')}: {dayActual.hoursWorked}{' '}
                  {t('workload.hours')}
                </div>
                {dayActual.distributions &&
                  dayActual.distributions.length > 0 && (
                    <div className="text-xs opacity-75">
                      {dayActual.distributions
                        .map((d) => d.project.name)
                        .join(', ')}
                    </div>
                  )}
              </div>
            )}

          {/* Default mode (own view): actual hours for past/today */}
          {(isEmployee ||
            (!isAllEmployeesMode &&
              !isSingleEmployeeMode &&
              !isSingleEmployeeAllProjectsMode)) &&
            isTodayOrPast(day.date) &&
            dayActual &&
            day.isCurrentMonth && (
              <div
                className="text-xs bg-green-100 text-green-800 p-1 rounded cursor-pointer hover:bg-green-200 transition-colors"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onViewActualEntry(dayActual);
                  }
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onViewActualEntry(dayActual);
                }}
                title={t('common.clickToViewDetails')}
              >
                <div className="font-medium">
                  {t('workload.actualHours')}: {dayActual.hoursWorked}{' '}
                  {t('workload.hours')}
                </div>
                {dayActual.distributions &&
                  dayActual.distributions.length > 0 && (
                    <div className="text-xs opacity-75">
                      {dayActual.distributions
                        .map((d) => d.project.name)
                        .join(', ')}
                    </div>
                  )}
              </div>
            )}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

interface PlanEntryRowProps {
  plan: WorkloadPlanEntry;
  dateKey: string;
  dayPlans: WorkloadPlanEntry[];
  dayActual: WorkloadActualEntry | undefined;
  dayIsFuture: boolean;
  canModify: boolean;
  isAllEmployeesMode: boolean;
  isSingleEmployeeMode: boolean;
  isSingleEmployeeAllProjectsMode: boolean;
  onOpenEditModal: (plan: WorkloadPlanEntry, dateKey: string) => void;
  onDeletePlan: (planId: string, dateKey: string, plan?: WorkloadPlanEntry) => void;
  onOpenDateEmployeesModal: (date: string) => void;
  t: (key: string, options?: Record<string, unknown>) => string;
}

function PlanEntryRow({
  plan,
  dateKey,
  dayPlans,
  dayActual,
  dayIsFuture,
  canModify,
  isAllEmployeesMode,
  isSingleEmployeeMode,
  isSingleEmployeeAllProjectsMode,
  onOpenEditModal,
  onDeletePlan,
  onOpenDateEmployeesModal,
  t,
}: PlanEntryRowProps) {
  const isDirectEditMode =
    !isAllEmployeesMode &&
    !isSingleEmployeeMode &&
    !isSingleEmployeeAllProjectsMode;

  return (
    <div
      className={`text-xs bg-brown-100 text-brown-800 p-1 rounded truncate group relative ${
        canModify && isDirectEditMode
          ? 'cursor-pointer hover:bg-brown-200'
          : ''
      }`}
      title={`${plan.user.firstName} ${plan.user.lastName} - ${plan.project.name}${
        plan.hours != null
          ? ` (${plan.hours}${t('workload.hoursShort')})`
          : ''
      }${canModify && isDirectEditMode ? ` (${t('common.clickToEdit')})` : ''}`}
      onClick={(e) => {
        e.stopPropagation();
        if (canModify && isDirectEditMode) {
          onOpenEditModal(plan, dateKey);
        } else if (isAllEmployeesMode && dayPlans.length > 0) {
          onOpenDateEmployeesModal(dateKey);
        } else if (
          (isSingleEmployeeMode || isSingleEmployeeAllProjectsMode) &&
          (dayPlans.length > 0 || dayActual)
        ) {
          onOpenDateEmployeesModal(dateKey);
        }
      }}
    >
      <span className="font-medium">{plan.user.firstName}</span>
      <span className="text-brown-600">
        {' '}
        - {plan.project.name}
        {plan.hours != null
          ? ` (${plan.hours}${t('workload.hoursShort')})`
          : ''}
      </span>
      {canModify && isDirectEditMode && dayIsFuture && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDeletePlan(plan.id, dateKey, plan);
          }}
          className="absolute right-1 top-1/2 -translate-y-1/2 hidden group-hover:block text-red-600 hover:text-red-800"
          aria-label={t('common.delete')}
        >
          <svg
            className="w-3 h-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared icon
// ---------------------------------------------------------------------------

function PlusIcon() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 4v16m8-8H4"
      />
    </svg>
  );
}
