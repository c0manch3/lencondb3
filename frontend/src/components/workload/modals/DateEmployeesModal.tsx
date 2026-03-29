import { useTranslation } from 'react-i18next';
import type {
  WorkloadPlanEntry,
  WorkloadActualEntryWithUser,
  CalendarData,
} from '@/components/workload/types';

interface DateEmployeesModalProps {
  isOpen: boolean;
  onClose: () => void;
  dateKey: string;
  employeesData: (WorkloadPlanEntry | WorkloadActualEntryWithUser)[];
  calendarData: CalendarData;
  canModifyPlan: (plan: WorkloadPlanEntry) => boolean;
  isFutureDateString: (dateStr: string) => boolean;
  onEditPlan: (plan: WorkloadPlanEntry, dateKey: string) => void;
  onDeletePlan: (planId: string, dateKey: string, plan?: WorkloadPlanEntry) => void;
  employeesCount: number;
}

export default function DateEmployeesModal({
  isOpen,
  onClose,
  dateKey,
  employeesData,
  calendarData,
  canModifyPlan,
  isFutureDateString,
  onEditPlan,
  onDeletePlan,
  employeesCount,
}: DateEmployeesModalProps) {
  const { t } = useTranslation();

  if (!isOpen) return null;

  // Check if data contains actual reports (has 'distributions' field) or plans (has 'project' field)
  const isActualData = employeesData.length > 0 && 'distributions' in employeesData[0];

  return (
    <div className="fixed inset-0 bg-brown-900/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-cream-50 rounded-[0.4rem] shadow-sm w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">
            {t('workload.workAssignmentsFor', { date: new Date(dateKey).toLocaleDateString('default', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) })}
          </h2>
          <button
            onClick={onClose}
            className="text-brown-400 hover:text-brown-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-4">
          {employeesData.length === 0 ? (
            <div className="text-brown-500 text-center py-8">
              {t('workload.noEmployeesAssigned')}
            </div>
          ) : (
            <div className="space-y-3">
              {isActualData ? (
                // Display actual workload reports
                (employeesData as WorkloadActualEntryWithUser[]).map((actualEntry) => {
                  // Get the plan for this user on this date if it exists
                  const planForUser = calendarData[dateKey]?.find(
                    p => p.user.id === actualEntry.user.id
                  );

                  return (
                    <div
                      key={actualEntry.id}
                      className="bg-green-50 border border-green-200 rounded-[0.4rem] p-4"
                    >
                      <div className="font-medium text-brown-900 mb-2">
                        {actualEntry.user.firstName} {actualEntry.user.lastName}
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-brown-600">{t('workload.totalHours')}:</span>
                          <span className="font-semibold">{actualEntry.hoursWorked} {t('workload.hours')}</span>
                        </div>

                        {planForUser && (
                          <div className="text-xs bg-cream-200 border border-brown-200 rounded p-2">
                            <span className="text-brown-600">{t('workload.plannedProject')}:</span>
                            <span className="text-brown-700 font-medium ml-1">{planForUser.project.name}</span>
                          </div>
                        )}

                        {!planForUser && (
                          <div className="text-xs bg-cream-100 border border-brown-200 rounded p-2 text-brown-500">
                            {t('workload.noPlanForThisDate')}
                          </div>
                        )}

                        {actualEntry.distributions && actualEntry.distributions.length > 0 && (
                          <div className="mt-2">
                            <div className="text-xs font-medium text-brown-700 mb-1">{t('workload.projectDistribution')}:</div>
                            {actualEntry.distributions.map((dist) => (
                              <div key={dist.id} className="text-xs bg-brown-50 border border-brown-200 rounded p-2 mb-1">
                                <div className="flex justify-between">
                                  <span className="text-brown-700 font-medium">{dist.project.name}</span>
                                  <span className="text-brown-600 font-semibold">{dist.hours} {t('workload.hours')}</span>
                                </div>
                                {dist.description && (
                                  <div className="text-brown-600 mt-1">{dist.description}</div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {actualEntry.userText && (
                          <div className="mt-2">
                            <div className="text-xs font-medium text-brown-700">{t('workload.notes')}:</div>
                            <div className="text-xs text-brown-600 mt-1">{actualEntry.userText}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                // Display workload plans
                (employeesData as WorkloadPlanEntry[]).map((plan) => {
                  const canModify = canModifyPlan(plan);
                  return (
                  <div
                    key={plan.id}
                    className="bg-brown-50 border border-brown-200 rounded-[0.4rem] p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-brown-900">
                          {plan.user.firstName} {plan.user.lastName}
                        </div>
                        <div className="text-sm text-brown-600">
                          {plan.project.name}{plan.hours != null ? ` (${plan.hours}${t('workload.hoursShort')})` : ''}
                        </div>
                      </div>
                      {canModify && isFutureDateString(dateKey) && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              onClose();
                              onEditPlan(plan, dateKey);
                            }}
                            className="text-brown-600 hover:text-brown-800 p-2"
                            title={t('common.edit')}
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => {
                              onDeletePlan(plan.id, dateKey, plan);
                              onClose();
                            }}
                            className="text-red-600 hover:text-red-800 p-2"
                            title={t('common.delete')}
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  );
                })
              )}
            </div>
          )}
        </div>
        <div className="flex justify-between items-center p-4 border-t">
          <div className="text-sm text-brown-500">
            {t('workload.employeesAssignedCount', { count: employeesCount })}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-brown-700 hover:bg-cream-200 rounded-[0.4rem]"
          >
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  );
}
