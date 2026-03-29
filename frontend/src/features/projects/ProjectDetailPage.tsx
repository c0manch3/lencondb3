import { useMemo, useCallback, useState } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Button, Badge, Spinner } from '@/shared/components';
import { useAuth } from '@/shared/auth/AuthContext';
import type { Project, ProjectStatus } from '@/shared/types';
import {
  useProject,
  useUpdateProject,
  type UpdateProjectPayload,
} from './hooks/useProjects';
import ProjectForm from './components/ProjectForm';
import PaymentScheduleTab from './components/PaymentScheduleTab';
import ProjectWorkloadTab from './components/ProjectWorkloadTab';
import TeamTab from './components/TeamTab';

// ─── Types ──────────────────────────────────────────────────────────────────

type TabId = 'overview' | 'payments' | 'workload' | 'team';

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatCurrency(amount: number | undefined | null): string {
  if (amount == null) return '-';
  return new Intl.NumberFormat('ru-RU', {
    style: 'decimal',
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  })
    .format(amount)
    .replace(/\s/g, '\u00A0')
    .concat('\u00A0\u0440.');
}

function getTabFromHash(hash: string): TabId {
  const cleaned = hash.replace('#', '');
  if (['overview', 'payments', 'workload', 'team'].includes(cleaned)) {
    return cleaned as TabId;
  }
  return 'overview';
}

// ─── Icons ──────────────────────────────────────────────────────────────────

function ArrowLeftIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

// ─── Tab button ─────────────────────────────────────────────────────────────

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={`
        px-4 py-2 text-sm font-medium transition-colors duration-150
        border-b-2 cursor-pointer whitespace-nowrap
        ${
          active
            ? 'border-[#22150d] text-[#22150d]'
            : 'border-transparent text-[#7d6b5d] hover:text-[#22150d] hover:border-[rgba(34,21,13,0.20)]'
        }
      `}
      onClick={onClick}
      role="tab"
      aria-selected={active}
    >
      {children}
    </button>
  );
}

// ─── Overview info cards ────────────────────────────────────────────────────

function InfoRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
      <span className="text-xs font-medium text-[#7d6b5d] uppercase tracking-wider sm:w-36 shrink-0">
        {label}
      </span>
      <span className="text-sm text-[#22150d]">{children}</span>
    </div>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { user } = useAuth();

  const isAdmin = user?.role === 'Admin';
  const isManager = user?.role === 'Manager';
  const canManage = isAdmin || isManager;

  // ─── Data ───────────────────────────────────────────────────────────
  const { data: project, isLoading, isError } = useProject(id);
  const updateMutation = useUpdateProject();

  // ─── Tab state from URL hash ───────────────────────────────────────
  const activeTab = getTabFromHash(location.hash);

  const setActiveTab = useCallback(
    (tab: TabId) => {
      navigate(`#${tab}`, { replace: true });
    },
    [navigate],
  );

  // ─── Edit form state ──────────────────────────────────────────────
  const [editFormOpen, setEditFormOpen] = useState(false);

  const canEditProject = useMemo(() => {
    if (!project) return false;
    if (isAdmin) return true;
    if (isManager && project.managerId === user?.id) return true;
    return false;
  }, [project, isAdmin, isManager, user?.id]);

  const handleEditSubmit = useCallback(
    (values: {
      name: string;
      status: string;
      contractDate: string;
      expirationDate: string;
      cost?: number;
    }) => {
      if (!project) return;
      updateMutation.mutate(
        {
          id: project.id,
          name: values.name,
          status: values.status as ProjectStatus,
          contractDate: values.contractDate,
          expirationDate: values.expirationDate,
          cost: values.cost ?? null,
        },
        {
          onSuccess: () => {
            setEditFormOpen(false);
            toast.success(t('projects.projectUpdated'));
          },
          onError: () => {
            toast.error(t('common.error'));
          },
        },
      );
    },
    [project, updateMutation, t],
  );

  // ─── Tab visibility ───────────────────────────────────────────────
  const canViewWorkload =
    user?.role === 'Admin' || user?.role === 'Manager' || user?.role === 'Trial';

  // ─── Loading / Error states ───────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError || !project) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h2 className="text-xl font-semibold text-brown-900 mb-2">
          {t('projects.notFound')}
        </h2>
        <p className="text-sm text-[#7d6b5d] mb-6">
          {t('projects.notFoundDescription')}
        </p>
        <Button variant="secondary" onClick={() => navigate('/projects')}>
          {t('projects.backToProjects')}
        </Button>
      </div>
    );
  }

  // ─── Overview tab content ─────────────────────────────────────────
  const renderOverview = () => (
    <div className="flex flex-col gap-6">
      {/* Info cards grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Project Info Card */}
        <div className="bg-[#fdfaf0] border border-[rgba(34,21,13,0.15)] rounded-xl p-6">
          <h3 className="text-sm font-semibold text-[#22150d] uppercase tracking-wider mb-4">
            {t('projects.information')}
          </h3>
          <div className="flex flex-col gap-3">
            <InfoRow label={t('projects.status')}>
              <Badge
                variant={project.status === 'Active' ? 'success' : 'neutral'}
              >
                {project.status === 'Active'
                  ? t('projects.active')
                  : t('projects.completed')}
              </Badge>
            </InfoRow>
            <InfoRow label={t('projects.type')}>
              {project.type === 'main'
                ? t('projects.main')
                : t('projects.additional')}
            </InfoRow>
            <InfoRow label={t('projects.contractDate')}>
              {formatDate(project.contractDate)}
            </InfoRow>
            <InfoRow label={t('projects.expirationDate')}>
              {formatDate(project.expirationDate)}
            </InfoRow>
            {project.cost != null && (
              <InfoRow label={t('payments.projectCost')}>
                <span className="tabular-nums font-medium">
                  {formatCurrency(project.cost)}
                </span>
              </InfoRow>
            )}
          </div>
        </div>

        {/* Customer & Manager Card */}
        <div className="bg-[#fdfaf0] border border-[rgba(34,21,13,0.15)] rounded-xl p-6">
          <h3 className="text-sm font-semibold text-[#22150d] uppercase tracking-wider mb-4">
            {t('projects.customerAndManager')}
          </h3>
          <div className="flex flex-col gap-3">
            <InfoRow label={t('projects.customer')}>
              {project.customer?.name ?? '-'}
            </InfoRow>
            {project.customer?.type && (
              <InfoRow label={t('projects.customerType')}>
                <Badge
                  variant={
                    project.customer.type === 'Customer'
                      ? 'customer'
                      : 'contractor'
                  }
                >
                  {project.customer.type}
                </Badge>
              </InfoRow>
            )}
            <InfoRow label={t('projects.manager')}>
              {project.manager
                ? `${project.manager.firstName} ${project.manager.lastName}`
                : '-'}
            </InfoRow>
            {project.manager?.email && (
              <InfoRow label={t('projects.managerEmail')}>
                <span className="text-[#5c4a3e]">
                  {project.manager.email}
                </span>
              </InfoRow>
            )}
          </div>
        </div>
      </div>

      {/* Main project link (if additional) */}
      {project.mainProject && (
        <div className="bg-[#fdfaf0] border border-[rgba(34,21,13,0.15)] rounded-xl p-6">
          <p className="text-xs text-[#7d6b5d] mb-2">
            {t('projects.additionalProjectLinkedTo')}
          </p>
          <Link
            to={`/projects/${project.mainProject.id}`}
            className="text-sm font-medium text-[#22150d] hover:underline hover:decoration-[rgba(34,21,13,0.30)] underline-offset-2"
          >
            {project.mainProject.name}
          </Link>
        </div>
      )}

      {/* Additional projects list */}
      {project.additionalProjects && project.additionalProjects.length > 0 && (
        <div className="bg-[#fdfaf0] border border-[rgba(34,21,13,0.15)] rounded-xl p-6">
          <h3 className="text-sm font-semibold text-[#22150d] uppercase tracking-wider mb-3">
            {t('projects.additionalProjects')}
          </h3>
          <p className="text-xs text-[#7d6b5d] mb-3">
            {t('projects.supplementaryProjectsLinked')}
          </p>
          <ul className="flex flex-col gap-2">
            {project.additionalProjects.map((ap) => (
              <li key={ap.id} className="flex items-center gap-3">
                <Link
                  to={`/projects/${ap.id}`}
                  className="text-sm font-medium text-[#22150d] hover:underline hover:decoration-[rgba(34,21,13,0.30)] underline-offset-2"
                >
                  {ap.name}
                </Link>
                <Badge
                  variant={ap.status === 'Active' ? 'success' : 'neutral'}
                >
                  {ap.status === 'Active'
                    ? t('projects.active')
                    : t('projects.completed')}
                </Badge>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Team section (Admin/Manager) */}
      {canManage && <TeamTab projectId={project.id} />}
    </div>
  );

  // ─── Render ────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumbs + header */}
      <div>
        <nav className="flex items-center gap-2 text-xs text-[#7d6b5d] mb-3">
          <Link
            to="/projects"
            className="hover:text-[#22150d] transition-colors"
          >
            {t('navigation.projects')}
          </Link>
          <span aria-hidden="true">/</span>
          <span className="text-[#22150d] font-medium truncate max-w-[200px]">
            {project.name}
          </span>
        </nav>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/projects')}
              className="inline-flex items-center justify-center w-8 h-8 rounded text-[#7d6b5d] hover:text-[#22150d] hover:bg-[rgba(34,21,13,0.06)] transition-colors cursor-pointer"
              aria-label={t('projects.backToProjects')}
            >
              <ArrowLeftIcon />
            </button>
            <h1 className="text-xl sm:text-2xl font-bold text-brown-900 truncate">
              {project.name}
            </h1>
          </div>

          {canEditProject && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setEditFormOpen(true)}
            >
              {t('common.edit')}
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div
        className="flex gap-0 border-b border-[rgba(34,21,13,0.15)] overflow-x-auto"
        role="tablist"
        aria-label="Project tabs"
      >
        <TabButton
          active={activeTab === 'overview'}
          onClick={() => setActiveTab('overview')}
        >
          {t('projects.overview')}
        </TabButton>
        <TabButton
          active={activeTab === 'payments'}
          onClick={() => setActiveTab('payments')}
        >
          {t('projects.payments')}
        </TabButton>
        {canViewWorkload && (
          <TabButton
            active={activeTab === 'workload'}
            onClick={() => setActiveTab('workload')}
          >
            {t('workload.projectWorkload')}
          </TabButton>
        )}
        {canManage && (
          <TabButton
            active={activeTab === 'team'}
            onClick={() => setActiveTab('team')}
          >
            {t('analytics.team')}
          </TabButton>
        )}
      </div>

      {/* Tab content */}
      <div role="tabpanel">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'payments' && (
          <PaymentScheduleTab project={project} />
        )}
        {activeTab === 'workload' && canViewWorkload && (
          <ProjectWorkloadTab projectId={project.id} />
        )}
        {activeTab === 'team' && canManage && (
          <TeamTab projectId={project.id} />
        )}
      </div>

      {/* Edit Project Modal */}
      <ProjectForm
        isOpen={editFormOpen}
        onClose={() => setEditFormOpen(false)}
        onSubmitEdit={handleEditSubmit}
        mode="edit"
        defaultValues={project}
        loading={updateMutation.isPending}
      />
    </div>
  );
}
