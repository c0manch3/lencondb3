import { type FC, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Button } from '@/shared/components';
import type {
  CalendarData,
  WorkloadPlanEntry,
  WorkloadActualEntry,
} from '../types';
import { getPlansForDate, getActualsForDate } from '../hooks/useWorkloadData';

// ─── Props ──────────────────────────────────────────────────────────────────

interface DateEmployeesModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  calendarData: CalendarData | undefined;
}

// ─── Employee group ─────────────────────────────────────────────────────────

interface EmployeeGroup {
  userId: string;
  userName: string;
  plans: WorkloadPlanEntry[];
  actuals: WorkloadActualEntry[];
  totalHours: number;
}

// ─── Date formatter ─────────────────────────────────────────────────────────

function formatDateLocalized(dateStr: string, locale: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

// ─── Component ──────────────────────────────────────────────────────────────

const DateEmployeesModal: FC<DateEmployeesModalProps> = ({
  isOpen,
  onClose,
  date,
  calendarData,
}) => {
  const { t, i18n } = useTranslation();

  const formattedDate = useMemo(() => {
    if (!date) return '';
    return formatDateLocalized(date, i18n.language);
  }, [date, i18n.language]);

  const groups = useMemo((): EmployeeGroup[] => {
    const plans = getPlansForDate(calendarData, date);
    const actuals = getActualsForDate(calendarData, date);

    const groupMap = new Map<string, EmployeeGroup>();

    for (const plan of plans) {
      let group = groupMap.get(plan.userId);
      if (!group) {
        group = { userId: plan.userId, userName: plan.userName, plans: [], actuals: [], totalHours: 0 };
        groupMap.set(plan.userId, group);
      }
      group.plans.push(plan);
    }

    for (const actual of actuals) {
      let group = groupMap.get(actual.userId);
      if (!group) {
        group = { userId: actual.userId, userName: actual.userName, plans: [], actuals: [], totalHours: 0 };
        groupMap.set(actual.userId, group);
      }
      group.actuals.push(actual);
      group.totalHours += actual.hoursWorked;
    }

    return Array.from(groupMap.values()).sort((a, b) =>
      a.userName.localeCompare(b.userName),
    );
  }, [calendarData, date]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('workload.workDistributionFor', { date: formattedDate })}
      size="lg"
      actions={
        <div className="flex items-center justify-between w-full">
          <span className="text-sm text-[#7d6b5d]">
            {t('workload.employeeCountLabel', { count: groups.length })}
          </span>
          <Button variant="ghost" onClick={onClose}>
            {t('common.close')}
          </Button>
        </div>
      }
    >
      {groups.length === 0 ? (
        <p className="text-sm text-[#7d6b5d] text-center py-8">
          {t('workload.noEmployeesAssigned')}
        </p>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => {
            // Total hours: sum of all actual hoursWorked for this employee
            const totalHours = group.totalHours;
            // First plan's project (if any)
            const primaryPlan = group.plans.length > 0 ? group.plans[0] : null;

            return (
              <div
                key={group.userId}
                className="border border-[rgba(34,21,13,0.15)] rounded-xl overflow-hidden"
              >
                {/* Employee header */}
                <div className="bg-[#f5ecd4] px-4 py-3">
                  <span className="text-sm font-bold text-[#22150d]">
                    {group.userName}
                  </span>
                </div>

                <div className="px-4 py-3 space-y-3">
                  {/* Total hours row */}
                  {totalHours > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[#5c4a3e]">
                        {t('workload.totalHoursLabel')}:
                      </span>
                      <span className="text-sm font-semibold text-[#22150d]">
                        {totalHours} {t('workload.hoursUnit')}
                      </span>
                    </div>
                  )}

                  {/* Plan box */}
                  <div
                    className="rounded-lg px-3 py-2 border"
                    style={{
                      backgroundColor: 'rgba(180, 145, 50, 0.08)',
                      borderColor: 'rgba(180, 145, 50, 0.2)',
                    }}
                  >
                    {primaryPlan ? (
                      <div className="text-sm text-[#5c4a3e]">
                        <span className="text-[#7d6b5d]">{t('workload.plannedProjectLabel')}: </span>
                        <span className="font-medium text-[#22150d]">
                          {primaryPlan.projectName}
                        </span>
                        {primaryPlan.hours != null && (
                          <span className="ml-2 text-[#7d6b5d]">
                            ({primaryPlan.hours} {t('workload.hoursUnit')})
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-[#7d6b5d] italic">
                        {t('workload.noPlanForDate')}
                      </span>
                    )}
                    {/* Additional plans beyond the first */}
                    {group.plans.length > 1 &&
                      group.plans.slice(1).map((plan) => (
                        <div key={plan.id} className="text-sm text-[#5c4a3e] mt-1">
                          <span className="text-[#7d6b5d]">{t('workload.plannedProjectLabel')}: </span>
                          <span className="font-medium text-[#22150d]">
                            {plan.projectName}
                          </span>
                          {plan.hours != null && (
                            <span className="ml-2 text-[#7d6b5d]">
                              ({plan.hours} {t('workload.hoursUnit')})
                            </span>
                          )}
                        </div>
                      ))}
                  </div>

                  {/* Distribution by projects */}
                  {group.actuals.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-[#5c4a3e] mb-2">
                        {t('workload.projectDistributionLabel')}:
                      </p>
                      <div className="space-y-2">
                        {group.actuals.map((actual) =>
                          actual.distributions.length > 0 ? (
                            actual.distributions.map((dist) => (
                              <div
                                key={dist.id}
                                className="rounded-lg border px-3 py-2"
                                style={{
                                  borderColor: 'rgba(34, 21, 13, 0.12)',
                                }}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium text-[#22150d]">
                                    {dist.projectName}
                                  </span>
                                  <span className="text-sm text-[#5c4a3e]">
                                    {dist.hours} {t('workload.hoursUnit')}
                                  </span>
                                </div>
                                {dist.description && (
                                  <p className="text-xs text-[#7d6b5d] mt-1">
                                    {dist.description}
                                  </p>
                                )}
                              </div>
                            ))
                          ) : (
                            <div
                              key={actual.id}
                              className="rounded-lg border px-3 py-2"
                              style={{
                                borderColor: 'rgba(34, 21, 13, 0.12)',
                              }}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-[#5c4a3e]">
                                  {actual.hoursWorked} {t('workload.hoursUnit')}
                                </span>
                              </div>
                              {actual.userText && (
                                <p className="text-xs text-[#7d6b5d] mt-1">
                                  {actual.userText}
                                </p>
                              )}
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
};

export default DateEmployeesModal;
