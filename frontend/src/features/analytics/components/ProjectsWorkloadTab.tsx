import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { type ColumnDef } from '@tanstack/react-table';
import { Table, Badge, Select, Spinner } from '@/shared/components';
import type { ProjectWorkloadItem, ProjectStatus } from '@/shared/types';
import { useProjectsWorkload, type DateRangeParams } from '../hooks/useAnalytics';

// ─── Types ──────────────────────────────────────────────────────────────────

type StatusFilter = 'All' | ProjectStatus;

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

// ─── Component ──────────────────────────────────────────────────────────────

interface ProjectsWorkloadTabProps {
  dateRange: DateRangeParams;
}

export default function ProjectsWorkloadTab({ dateRange }: ProjectsWorkloadTabProps) {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useProjectsWorkload(dateRange);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('Active');

  // ─── Status badge helper ──────────────────────────────────────────
  const statusBadge = (status: ProjectStatus) => {
    const variant = status === 'Active' ? 'success' : 'neutral';
    const label = status === 'Active' ? t('common.active') : t('common.completed');
    return <Badge variant={variant}>{label}</Badge>;
  };

  const statusOptions = useMemo(
    () => [
      { value: 'All', label: t('common.all') },
      { value: 'Active', label: t('analytics.activeStatus') },
      { value: 'Completed', label: t('analytics.completedStatus') },
    ],
    [t],
  );

  const filteredProjects = useMemo(() => {
    const projects = data?.projects ?? [];
    if (statusFilter === 'All') return projects;
    return projects.filter((p) => p.status === statusFilter);
  }, [data?.projects, statusFilter]);

  const columns = useMemo<ColumnDef<ProjectWorkloadItem, unknown>[]>(
    () => [
      {
        accessorKey: 'projectName',
        header: t('analytics.project'),
        cell: ({ getValue }) => (
          <span className="font-semibold text-brown-900">{getValue<string>()}</span>
        ),
      },
      {
        accessorKey: 'customerName',
        header: t('analytics.customer'),
        cell: ({ getValue }) => (
          <span className="text-brown-600">{getValue<string>()}</span>
        ),
      },
      {
        accessorKey: 'managerName',
        header: t('analytics.manager'),
        cell: ({ getValue }) => (
          <span className="text-brown-600">{getValue<string>()}</span>
        ),
      },
      {
        accessorKey: 'status',
        header: t('analytics.status'),
        size: 120,
        cell: ({ getValue }) => statusBadge(getValue<ProjectStatus>()),
      },
      {
        accessorKey: 'employeeCount',
        header: t('analytics.members'),
        size: 110,
        cell: ({ getValue }) => (
          <span className="font-medium text-brown-900">{getValue<number>()}</span>
        ),
      },
      {
        accessorKey: 'totalHours',
        header: t('analytics.hours'),
        size: 100,
        cell: ({ getValue }) => (
          <span className="font-medium text-brown-900">
            {getValue<number>().toLocaleString('ru-RU')}
          </span>
        ),
      },
    ],
    [t],
  );

  const renderMobileCard = (row: ProjectWorkloadItem) => (
    <div className="bg-cream-50 border border-brown-200 rounded-xl p-4">
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="font-semibold text-brown-900 text-sm">{row.projectName}</span>
        {statusBadge(row.status)}
      </div>
      <p className="text-xs text-brown-600 mb-1">
        {t('analytics.customer')}: {row.customerName}
      </p>
      <p className="text-xs text-brown-600 mb-1">
        {t('analytics.manager')}: {row.managerName}
      </p>
      <div className="flex items-center gap-4 mt-2 pt-2 border-t border-brown-100">
        <span className="text-xs text-brown-500">
          {t('analytics.members')}: <strong className="text-brown-900">{row.employeeCount}</strong>
        </span>
        <span className="text-xs text-brown-500">
          {t('analytics.hours')}: <strong className="text-brown-900">{row.totalHours.toLocaleString('ru-RU')}</strong>
        </span>
      </div>
    </div>
  );

  if (isError) {
    return (
      <div className="text-center py-12 text-brown-500">
        {t('analytics.loadProjectsError')}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard label={t('analytics.totalProjects')} value={data?.totalProjects ?? 0} />
        <SummaryCard label={t('analytics.activeStatus')} value={data?.activeProjects ?? 0} />
        <SummaryCard label={t('analytics.completedStatus')} value={data?.completedProjects ?? 0} />
        <SummaryCard
          label={t('analytics.totalHours')}
          value={(data?.totalHoursWorked ?? 0).toLocaleString('ru-RU')}
        />
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <div className="w-48">
          <Select
            options={statusOptions}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          />
        </div>
        {isLoading && <Spinner size="sm" />}
      </div>

      {/* Table */}
      <Table<ProjectWorkloadItem>
        data={filteredProjects}
        columns={columns}
        isLoading={isLoading}
        sorting
        renderMobileCard={renderMobileCard}
        emptyState={{
          title: t('analytics.noProjectData'),
          description: t('analytics.changeFiltersOrPeriod'),
        }}
      />
    </div>
  );
}
