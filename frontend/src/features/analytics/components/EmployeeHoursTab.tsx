import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { type ColumnDef } from '@tanstack/react-table';
import { Table, Modal, Spinner } from '@/shared/components';
import type { EmployeeWorkHoursItem, WorkloadActual } from '@/shared/types';
import {
  useEmployeeWorkHours,
  useEmployeeReports,
  type DateRangeParams,
} from '../hooks/useAnalytics';

// ─── Deviation color helper ─────────────────────────────────────────────────

function deviationClass(value: number): string {
  if (value > 0) return 'text-[#3d5a2a]';
  if (value < 0) return 'text-[#8b3a2a]';
  return 'text-brown-500';
}

function deviationPrefix(value: number): string {
  if (value > 0) return '+';
  return '';
}

// ─── Summary card ───────────────────────────────────────────────────────────

function SummaryCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-cream-50 border border-brown-200 rounded-xl p-4">
      <p className="text-xs font-medium text-brown-500 uppercase tracking-wider">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold text-brown-900">{value}</p>
    </div>
  );
}

// ─── Employee reports modal ─────────────────────────────────────────────────

interface ReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: EmployeeWorkHoursItem | null;
  dateRange: DateRangeParams;
}

function EmployeeReportsModal({
  isOpen,
  onClose,
  employee,
  dateRange,
}: ReportsModalProps) {
  const { t } = useTranslation();
  const { data: reports, isLoading } = useEmployeeReports({
    userId: employee?.userId ?? '',
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  });

  const title = employee
    ? t('analytics.reportsModalTitle', { name: `${employee.firstName} ${employee.lastName}` })
    : t('analytics.reportsModalTitleGeneric');

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="lg">
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : !reports || reports.length === 0 ? (
        <p className="text-center text-brown-500 py-8">{t('analytics.noReportsForPeriod')}</p>
      ) : (
        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {reports.map((report: WorkloadActual) => (
            <div
              key={report.id}
              className="border border-brown-200 rounded p-3"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-brown-900">
                  {new Date(report.date).toLocaleDateString('ru-RU')}
                </span>
                <span className="text-sm font-medium text-brown-700">
                  {report.hoursWorked}{t('workload.hoursShort')}
                </span>
              </div>

              {report.userText && (
                <p className="text-xs text-brown-600 mb-2 italic">{report.userText}</p>
              )}

              {report.distributions && report.distributions.length > 0 && (
                <div className="space-y-1">
                  {report.distributions.map((dist) => (
                    <div
                      key={dist.id}
                      className="flex items-center justify-between text-xs bg-cream-200 rounded px-2 py-1"
                    >
                      <span className="text-brown-800">
                        {dist.project?.name ?? t('common.project')}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-brown-900">{dist.hours}{t('workload.hoursShort')}</span>
                        {dist.description && (
                          <span className="text-brown-500 truncate max-w-[150px]">
                            {dist.description}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

interface EmployeeHoursTabProps {
  dateRange: DateRangeParams;
}

export default function EmployeeHoursTab({ dateRange }: EmployeeHoursTabProps) {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useEmployeeWorkHours(dateRange);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeWorkHoursItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const handleRowClick = useCallback((employee: EmployeeWorkHoursItem) => {
    setSelectedEmployee(employee);
    setModalOpen(true);
  }, []);

  const columns = useMemo<ColumnDef<EmployeeWorkHoursItem, unknown>[]>(
    () => [
      {
        id: 'name',
        header: t('analytics.employee'),
        accessorFn: (row) => `${row.firstName} ${row.lastName}`,
        cell: ({ getValue }) => (
          <span className="font-semibold text-brown-900">{getValue<string>()}</span>
        ),
      },
      {
        accessorKey: 'email',
        header: t('analytics.email'),
        cell: ({ getValue }) => (
          <span className="text-brown-600">{getValue<string>()}</span>
        ),
      },
      {
        accessorKey: 'hoursWorked',
        header: t('analytics.hoursWorked'),
        size: 110,
        cell: ({ getValue }) => (
          <span className="font-medium text-brown-900">
            {getValue<number>().toLocaleString('ru-RU')}{t('workload.hoursShort')}
          </span>
        ),
      },
      {
        accessorKey: 'expectedHours',
        header: t('analytics.expected'),
        size: 110,
        cell: ({ getValue }) => (
          <span className="text-brown-600">{getValue<number>().toLocaleString('ru-RU')}{t('workload.hoursShort')}</span>
        ),
      },
      {
        accessorKey: 'deviation',
        header: t('analytics.deviation'),
        size: 120,
        cell: ({ getValue }) => {
          const val = getValue<number>();
          return (
            <span className={`font-medium ${deviationClass(val)}`}>
              {deviationPrefix(val)}{val.toLocaleString('ru-RU')}{t('workload.hoursShort')}
            </span>
          );
        },
      },
      {
        accessorKey: 'deviationPercent',
        header: '%',
        size: 80,
        cell: ({ getValue }) => {
          const val = getValue<number>();
          return (
            <span className={`font-medium ${deviationClass(val)}`}>
              {deviationPrefix(val)}{val.toFixed(1)}%
            </span>
          );
        },
      },
    ],
    [t],
  );

  const renderMobileCard = (row: EmployeeWorkHoursItem) => (
    <div className="bg-cream-50 border border-brown-200 rounded-xl p-4">
      <div className="flex items-start justify-between gap-2 mb-1">
        <span className="font-semibold text-brown-900 text-sm">
          {row.firstName} {row.lastName}
        </span>
        <span className={`text-xs font-medium ${deviationClass(row.deviation)}`}>
          {deviationPrefix(row.deviation)}{row.deviation.toLocaleString('ru-RU')}{t('workload.hoursShort')}
          ({deviationPrefix(row.deviationPercent)}{row.deviationPercent.toFixed(1)}%)
        </span>
      </div>
      <p className="text-xs text-brown-500 mb-2">{row.email}</p>
      <div className="flex items-center gap-4 text-xs">
        <span className="text-brown-500">
          {t('analytics.hoursWorked')}: <strong className="text-brown-900">{row.hoursWorked}{t('workload.hoursShort')}</strong>
        </span>
        <span className="text-brown-500">
          {t('analytics.expected')}: <strong className="text-brown-900">{row.expectedHours}{t('workload.hoursShort')}</strong>
        </span>
      </div>
    </div>
  );

  if (isError) {
    return (
      <div className="text-center py-12 text-brown-500">
        {t('analytics.loadEmployeesError')}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Period info + summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard label={t('analytics.totalEmployees')} value={data?.totalEmployees ?? 0} />
        <SummaryCard
          label={t('analytics.averageHours')}
          value={(data?.averageHours ?? 0).toFixed(1)}
        />
        <SummaryCard label={t('analytics.underworking')} value={data?.underworkingCount ?? 0} />
        <SummaryCard label={t('analytics.overworking')} value={data?.overworkingCount ?? 0} />
      </div>

      {data && (
        <p className="text-xs text-brown-500">
          {t('analytics.workingDaysInfo')}: <strong>{data.workingDays}</strong> | {t('analytics.expectedPerEmployee')}:{' '}
          <strong>{data.expectedHoursPerEmployee}{t('workload.hoursShort')}</strong>
        </p>
      )}

      {/* Table */}
      <Table<EmployeeWorkHoursItem>
        data={data?.employees ?? []}
        columns={columns}
        isLoading={isLoading}
        sorting
        onRowClick={handleRowClick}
        renderMobileCard={renderMobileCard}
        emptyState={{
          title: t('analytics.noEmployeeData'),
          description: t('analytics.changePeriod'),
        }}
      />

      {/* Employee reports modal */}
      <EmployeeReportsModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        employee={selectedEmployee}
        dateRange={dateRange}
      />
    </div>
  );
}
