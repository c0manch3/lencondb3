import { type FC, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Button, Badge } from '@/shared/components';
import type {
  CalendarData,
  WorkloadPlanEntry,
  WorkloadActualEntry,
  WorkloadPermissions,
} from '../types';
import { PLAN_ENTRY_COLORS } from '../types';
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

// ─── Props ──────────────────────────────────────────────────────────────────

interface DateEmployeesModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  calendarData: CalendarData | undefined;
  permissions: WorkloadPermissions;
  onEditPlan: (plan: WorkloadPlanEntry) => void;
  onDeletePlan: (plan: WorkloadPlanEntry) => void;
  onViewActual: (actual: WorkloadActualEntry) => void;
}

// ─── Employee group ─────────────────────────────────────────────────────────

interface EmployeeGroup {
  userId: string;
  userName: string;
  plans: WorkloadPlanEntry[];
  actuals: WorkloadActualEntry[];
}

// ─── Component ──────────────────────────────────────────────────────────────

const DateEmployeesModal: FC<DateEmployeesModalProps> = ({
  isOpen,
  onClose,
  date,
  calendarData,
  permissions,
  onEditPlan,
  onDeletePlan,
  onViewActual,
}) => {
  const { t } = useTranslation();

  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const isPast = date < todayStr;

  const groups = useMemo((): EmployeeGroup[] => {
    const plans = getPlansForDate(calendarData, date);
    const actuals = getActualsForDate(calendarData, date);

    const groupMap = new Map<string, EmployeeGroup>();

    for (const plan of plans) {
      let group = groupMap.get(plan.userId);
      if (!group) {
        group = { userId: plan.userId, userName: plan.userName, plans: [], actuals: [] };
        groupMap.set(plan.userId, group);
      }
      group.plans.push(plan);
    }

    for (const actual of actuals) {
      let group = groupMap.get(actual.userId);
      if (!group) {
        group = { userId: actual.userId, userName: actual.userName, plans: [], actuals: [] };
        groupMap.set(actual.userId, group);
      }
      group.actuals.push(actual);
    }

    return Array.from(groupMap.values()).sort((a, b) =>
      a.userName.localeCompare(b.userName),
    );
  }, [calendarData, date]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('workload.workAssignmentsFor', { date })}
      size="lg"
      actions={
        <Button variant="ghost" onClick={onClose}>
          {t('common.close')}
        </Button>
      }
    >
      {groups.length === 0 ? (
        <p className="text-sm text-brown-500 text-center py-8">
          {t('workload.noEmployeesAssigned')}
        </p>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <div
              key={group.userId}
              className="border border-brown-100 rounded-xl overflow-hidden"
            >
              {/* Employee header */}
              <div className="bg-[#f5ecd4] px-4 py-2 flex items-center justify-between">
                <span className="text-sm font-semibold text-brown-900">
                  {group.userName}
                </span>
                <div className="flex items-center gap-2">
                  {group.plans.length > 0 && (
                    <Badge variant="manager">
                      {group.plans.length} {group.plans.length === 1 ? t('workload.employeePlan') : t('workload.employeePlans')}
                    </Badge>
                  )}
                  {group.actuals.length > 0 && (
                    <Badge variant="success">
                      {group.actuals.length} {group.actuals.length === 1 ? t('workload.employeeReport') : t('workload.employeeReports')}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Plans */}
              {group.plans.length > 0 && (
                <div className="px-4 py-2 space-y-1.5">
                  {group.plans.map((plan) => {
                    const colors = PLAN_ENTRY_COLORS[isPast ? 'plan-future' : date === todayStr ? 'plan-today' : 'plan-future'];
                    const canEdit = permissions.canEditPlan(plan) && !isPast;
                    const canDelete = permissions.canDeletePlan(plan) && !isPast;

                    return (
                      <div
                        key={plan.id}
                        className="flex items-center justify-between p-2 rounded text-xs"
                        style={{
                          backgroundColor: colors.bg,
                          borderLeft: `2px solid ${colors.border}`,
                        }}
                      >
                        <div>
                          <span className="font-medium" style={{ color: colors.text }}>
                            {plan.projectName}
                          </span>
                          {plan.hours != null && (
                            <span className="ml-2 opacity-70" style={{ color: colors.text }}>
                              {plan.hours}{t('workload.hoursShort')}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {canEdit && (
                            <button
                              type="button"
                              className="inline-flex items-center justify-center w-6 h-6 rounded text-[#5c4a3e] hover:bg-[rgba(34,21,13,0.08)] transition-colors cursor-pointer"
                              onClick={() => onEditPlan(plan)}
                              aria-label={t('common.edit')}
                            >
                              <PencilIcon />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              className="inline-flex items-center justify-center w-6 h-6 rounded text-[#5c4a3e] hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer"
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
              )}

              {/* Actuals */}
              {group.actuals.length > 0 && (
                <div className="px-4 py-2 space-y-1.5 border-t border-brown-50">
                  {group.actuals.map((actual) => {
                    const colors = PLAN_ENTRY_COLORS.actual;

                    return (
                      <button
                        key={actual.id}
                        type="button"
                        className="w-full text-left flex items-center justify-between p-2 rounded text-xs cursor-pointer hover:opacity-80 transition-opacity"
                        style={{
                          backgroundColor: colors.bg,
                          borderLeft: `2px solid ${colors.border}`,
                        }}
                        onClick={() => onViewActual(actual)}
                      >
                        <span className="font-medium" style={{ color: colors.text }}>
                          {actual.hoursWorked}{t('workload.hoursShort')} {t('workload.actual').toLowerCase()}
                        </span>
                        {actual.distributions.length > 0 && (
                          <span className="text-[0.625rem] opacity-60" style={{ color: colors.text }}>
                            {actual.distributions.length} {t('workload.project').toLowerCase()}(s)
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
};

export default DateEmployeesModal;
