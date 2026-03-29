import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { type ColumnDef } from '@tanstack/react-table';
import { Table, Badge, Modal, Spinner } from '@/shared/components';
import {
  useProjectWorkload,
  type EmployeeWorkloadEntry,
  type WorkloadReport,
} from '../hooks/useProjects';

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatHours(hours: number): string {
  return `${hours.toFixed(1)}h`;
}

// ─── Props ──────────────────────────────────────────────────────────────────

interface ProjectWorkloadTabProps {
  projectId: string;
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function ProjectWorkloadTab({ projectId }: ProjectWorkloadTabProps) {
  const { t } = useTranslation();
  const { data: workload, isLoading } = useProjectWorkload(projectId);

  // ─── Detail modal state ────────────────────────────────────────────
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeWorkloadEntry | null>(null);

  const handleViewReports = useCallback((employee: EmployeeWorkloadEntry) => {
    setSelectedEmployee(employee);
    setDetailModalOpen(true);
  }, []);

  const employees = workload?.employeeWorkload ?? [];

  // ─── Table columns ────────────────────────────────────────────────
  const columns = useMemo<ColumnDef<EmployeeWorkloadEntry, unknown>[]>(
    () => [
      {
        id: 'name',
        header: t('common.name'),
        accessorFn: (row) => `${row.firstName} ${row.lastName}`,
        cell: ({ getValue }) => (
          <span className="font-medium text-[#22150d]">
            {getValue<string>()}
          </span>
        ),
      },
      {
        accessorKey: 'email',
        header: t('employees.email'),
        cell: ({ getValue }) => (
          <span className="text-[#5c4a3e]">{getValue<string>()}</span>
        ),
      },
      {
        accessorKey: 'totalHours',
        header: t('workload.totalHours'),
        size: 100,
        cell: ({ getValue }) => (
          <span className="text-right tabular-nums font-medium text-[#22150d] block">
            {formatHours(getValue<number>())}
          </span>
        ),
      },
      {
        accessorKey: 'reportsCount',
        header: t('workload.reportsCount'),
        size: 80,
        cell: ({ getValue }) => (
          <span className="text-right tabular-nums text-[#5c4a3e] block">
            {getValue<number>()}
          </span>
        ),
      },
      {
        id: 'actions',
        header: '',
        size: 120,
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[0.4rem] border border-[rgba(34,21,13,0.15)] text-[#5c4a3e] text-xs font-medium hover:bg-[rgba(34,21,13,0.06)] hover:text-[#22150d] transition-colors duration-150 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                handleViewReports(row.original);
              }}
            >
              {t('workload.viewReports')}
            </button>
          </div>
        ),
      },
    ],
    [t, handleViewReports],
  );

  // ─── Mobile card renderer ─────────────────────────────────────────
  const renderMobileCard = useCallback(
    (employee: EmployeeWorkloadEntry) => (
      <div className="bg-[#fdfaf0] border border-[rgba(34,21,13,0.15)] rounded-xl p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <span className="font-medium text-[#22150d] text-sm">
            {employee.firstName} {employee.lastName}
          </span>
          <Badge variant="neutral">
            {employee.reportsCount} {t('workload.reports')}
          </Badge>
        </div>
        <p className="text-xs text-[#5c4a3e] mb-1">{employee.email}</p>
        <p className="text-xs text-[#7d6b5d]">
          {t('workload.totalHours')}: {formatHours(employee.totalHours)}
        </p>
        <div className="mt-3 pt-3 border-t border-[rgba(34,21,13,0.10)]">
          <button
            type="button"
            className="text-xs text-[#5c4a3e] hover:text-[#22150d] transition-colors cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              handleViewReports(employee);
            }}
          >
            {t('workload.viewReports')}
          </button>
        </div>
      </div>
    ),
    [t, handleViewReports],
  );

  // ─── Report detail columns ────────────────────────────────────────
  const reportColumns = useMemo<ColumnDef<WorkloadReport, unknown>[]>(
    () => [
      {
        accessorKey: 'date',
        header: t('common.date'),
        cell: ({ getValue }) => (
          <span className="tabular-nums text-[#5c4a3e]">
            {formatDate(getValue<string>())}
          </span>
        ),
        size: 100,
      },
      {
        accessorKey: 'hoursWorked',
        header: t('workload.hours'),
        size: 80,
        cell: ({ getValue }) => (
          <span className="text-right tabular-nums font-medium text-[#22150d] block">
            {formatHours(getValue<number>())}
          </span>
        ),
      },
      {
        accessorKey: 'description',
        header: t('common.description'),
        cell: ({ getValue }) => (
          <span className="text-sm text-[#5c4a3e]">
            {getValue<string>() || '-'}
          </span>
        ),
      },
    ],
    [t],
  );

  // ─── Render ────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="md" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Summary */}
      {workload && (
        <div className="flex flex-wrap gap-4 text-sm">
          <span className="text-[#5c4a3e]">
            {t('workload.employees')}:{' '}
            <span className="font-semibold text-[#22150d]">
              {workload.employeeCount}
            </span>
          </span>
          <span className="text-[#5c4a3e]">
            {t('workload.totalProjectHours')}:{' '}
            <span className="font-semibold tabular-nums text-[#22150d]">
              {formatHours(workload.totalProjectHours)}
            </span>
          </span>
        </div>
      )}

      {/* Employee workload table */}
      <Table<EmployeeWorkloadEntry>
        data={employees}
        columns={columns}
        sorting
        renderMobileCard={renderMobileCard}
        emptyState={{
          title: t('workload.noReportsYet'),
          description: t('workload.employeesCanLog'),
        }}
      />

      {/* Reports detail modal */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title={
          selectedEmployee
            ? t('workload.reportsByEmployee', {
                name: `${selectedEmployee.firstName} ${selectedEmployee.lastName}`,
              })
            : ''
        }
        size="lg"
      >
        {selectedEmployee && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-4 text-sm">
              <span className="text-[#5c4a3e]">
                {t('workload.totalHoursOnProject')}:{' '}
                <span className="font-semibold tabular-nums text-[#22150d]">
                  {formatHours(selectedEmployee.totalHours)}
                </span>
              </span>
              <span className="text-[#5c4a3e]">
                {t('workload.reportEntries')}:{' '}
                <span className="font-semibold text-[#22150d]">
                  {selectedEmployee.reportsCount}
                </span>
              </span>
            </div>

            {selectedEmployee.reports && selectedEmployee.reports.length > 0 ? (
              <Table<WorkloadReport>
                data={selectedEmployee.reports}
                columns={reportColumns}
                sorting
                emptyState={{ title: t('workload.noReportsYet') }}
              />
            ) : (
              <p className="text-sm text-[#7d6b5d] py-4 text-center">
                {t('workload.noReportsYet')}
              </p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
