import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { type ColumnDef } from '@tanstack/react-table';
import toast from 'react-hot-toast';
import { Table, Button, Badge, Input, Select, ConfirmDialog } from '@/shared/components';
import { useAuth } from '@/shared/auth/AuthContext';
import type { Project, ProjectStatus } from '@/shared/types';
import {
  useProjects,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
  type CreateProjectPayload,
} from './hooks/useProjects';
import ProjectForm from './components/ProjectForm';

// ─── Constants ──────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;
const SESSION_KEY = 'projects-filter-state';

type StatusFilter = 'All' | ProjectStatus;

interface FilterState {
  search: string;
  status: StatusFilter;
  page: number;
}

function loadFilterState(): FilterState {
  try {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<FilterState>;
      return {
        search: parsed.search ?? '',
        status: parsed.status ?? 'Active',
        page: parsed.page ?? 1,
      };
    }
  } catch {
    // Corrupted data in session storage -- ignore
  }
  return { search: '', status: 'Active', page: 1 };
}

function saveFilterState(state: FilterState): void {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(state));
  } catch {
    // Session storage full or unavailable -- ignore
  }
}

// ─── Icons ──────────────────────────────────────────────────────────────────

function PencilIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.519.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
    </svg>
  );
}

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

// ─── Component ──────────────────────────────────────────────────────────────

export default function ProjectsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const isAdmin = user?.role === 'Admin';
  const isManager = user?.role === 'Manager';
  const canCreate = isAdmin || isManager;

  // ─── Data ───────────────────────────────────────────────────────────
  const { data: projectsResponse, isLoading } = useProjects();
  const createMutation = useCreateProject();
  const updateMutation = useUpdateProject();
  const deleteMutation = useDeleteProject();

  // ─── Filter state (persisted in session storage) ────────────────────
  const [filterState, setFilterState] = useState<FilterState>(loadFilterState);

  useEffect(() => {
    saveFilterState(filterState);
  }, [filterState]);

  const setSearchQuery = useCallback((search: string) => {
    setFilterState((prev) => ({ ...prev, search, page: 1 }));
  }, []);

  const setStatusFilter = useCallback((status: StatusFilter) => {
    setFilterState((prev) => ({ ...prev, status, page: 1 }));
  }, []);

  const setPage = useCallback((page: number) => {
    setFilterState((prev) => ({ ...prev, page }));
  }, []);

  // ─── Modal states ──────────────────────────────────────────────────
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  // ─── Filtering & pagination ────────────────────────────────────────
  const projects = projectsResponse?.data ?? [];

  const filteredProjects = useMemo(() => {
    let result = projects;

    // Status filter
    if (filterState.status !== 'All') {
      result = result.filter((p) => p.status === filterState.status);
    }

    // Search filter (name, customer name, manager name)
    if (filterState.search.trim()) {
      const query = filterState.search.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          (p.customer?.name && p.customer.name.toLowerCase().includes(query)) ||
          (p.manager &&
            `${p.manager.firstName} ${p.manager.lastName}`
              .toLowerCase()
              .includes(query)),
      );
    }

    return result;
  }, [projects, filterState.status, filterState.search]);

  // Paginated slice
  const paginatedProjects = useMemo(() => {
    const start = (filterState.page - 1) * PAGE_SIZE;
    return filteredProjects.slice(start, start + PAGE_SIZE);
  }, [filteredProjects, filterState.page]);

  // ─── Row click → navigate ─────────────────────────────────────────
  const handleRowClick = useCallback(
    (project: Project) => {
      navigate(`/projects/${project.id}`);
    },
    [navigate],
  );

  // ─── Form handlers ────────────────────────────────────────────────
  const handleOpenCreate = useCallback(() => {
    setEditingProject(null);
    setFormMode('create');
    setFormOpen(true);
  }, []);

  const handleOpenEdit = useCallback((project: Project) => {
    setEditingProject(project);
    setFormMode('edit');
    setFormOpen(true);
  }, []);

  const handleCreateSubmit = useCallback(
    (values: CreateProjectPayload) => {
      createMutation.mutate(values, {
        onSuccess: () => {
          setFormOpen(false);
          toast.success(t('projects.projectCreated'));
        },
        onError: () => {
          toast.error(t('common.error'));
        },
      });
    },
    [createMutation, t],
  );

  const handleEditSubmit = useCallback(
    (values: {
      name: string;
      status: string;
      contractDate: string;
      expirationDate: string;
      cost?: number;
    }) => {
      if (!editingProject) return;
      updateMutation.mutate(
        {
          id: editingProject.id,
          name: values.name,
          status: values.status as 'Active' | 'Completed',
          contractDate: values.contractDate,
          expirationDate: values.expirationDate,
          cost: values.cost ?? null,
        },
        {
          onSuccess: () => {
            setFormOpen(false);
            toast.success(t('projects.projectUpdated'));
          },
          onError: () => {
            toast.error(t('common.error'));
          },
        },
      );
    },
    [editingProject, updateMutation, t],
  );

  // ─── Delete handlers ──────────────────────────────────────────────
  const handleOpenDelete = useCallback((project: Project) => {
    setProjectToDelete(project);
    setDeleteDialogOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (!projectToDelete) return;
    deleteMutation.mutate(projectToDelete.id, {
      onSuccess: () => {
        setDeleteDialogOpen(false);
        setProjectToDelete(null);
        toast.success(t('projects.projectDeleted'));
      },
      onError: () => {
        toast.error(t('common.error'));
      },
    });
  }, [projectToDelete, deleteMutation, t]);

  // ─── Permission helpers ───────────────────────────────────────────

  /** Can the current user edit this project? */
  const canEditProject = useCallback(
    (project: Project): boolean => {
      if (isAdmin) return true;
      if (isManager && project.managerId === user?.id) return true;
      return false;
    },
    [isAdmin, isManager, user?.id],
  );

  // ─── Status filter options ────────────────────────────────────────
  const statusFilterOptions = useMemo(
    () => [
      { value: 'All', label: t('common.all') },
      { value: 'Active', label: t('projects.active') },
      { value: 'Completed', label: t('projects.completed') },
    ],
    [t],
  );

  // ─── Table columns ────────────────────────────────────────────────
  const columns = useMemo<ColumnDef<Project, unknown>[]>(() => {
    const cols: ColumnDef<Project, unknown>[] = [
      {
        accessorKey: 'name',
        header: t('projects.projectName'),
        cell: ({ getValue }) => (
          <span className="font-medium text-[#22150d] hover:underline hover:decoration-[rgba(34,21,13,0.30)] underline-offset-2">
            {getValue<string>()}
          </span>
        ),
      },
      {
        id: 'customer',
        accessorFn: (row) => row.customer?.name ?? '-',
        header: t('projects.customer'),
        cell: ({ getValue }) => (
          <span className="text-[#5c4a3e]">{getValue<string>()}</span>
        ),
      },
      {
        id: 'manager',
        accessorFn: (row) =>
          row.manager
            ? `${row.manager.firstName} ${row.manager.lastName}`
            : '-',
        header: t('projects.manager'),
        cell: ({ getValue }) => (
          <span className="text-[#5c4a3e]">{getValue<string>()}</span>
        ),
      },
      {
        accessorKey: 'contractDate',
        header: t('projects.contractDate'),
        cell: ({ getValue }) => (
          <span className="text-[#5c4a3e] tabular-nums">
            {formatDate(getValue<string>())}
          </span>
        ),
        size: 110,
      },
      {
        accessorKey: 'status',
        header: t('projects.status'),
        size: 100,
        cell: ({ getValue }) => {
          const status = getValue<ProjectStatus>();
          const variant = status === 'Active' ? 'success' : 'neutral';
          return (
            <Badge variant={variant}>
              {status === 'Active'
                ? t('projects.active')
                : t('projects.completed')}
            </Badge>
          );
        },
      },
    ];

    // Actions column (only for Admin/Manager)
    if (canCreate) {
      cols.push({
        id: 'actions',
        header: t('common.actions'),
        size: 80,
        enableSorting: false,
        cell: ({ row }) => {
          const project = row.original;
          const canEdit = canEditProject(project);

          return (
            <div className="flex items-center justify-end gap-1">
              {canEdit && (
                <button
                  type="button"
                  className="inline-flex items-center justify-center w-8 h-8 rounded text-[#7d6b5d] hover:text-[#22150d] hover:bg-[rgba(34,21,13,0.06)] transition-colors duration-150 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenEdit(project);
                  }}
                  aria-label={t('common.edit')}
                >
                  <PencilIcon />
                </button>
              )}
              {isAdmin && (
                <button
                  type="button"
                  className="inline-flex items-center justify-center w-8 h-8 rounded text-[#7d6b5d] hover:text-[#8b3a2a] hover:bg-[rgba(156,60,40,0.08)] transition-colors duration-150 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenDelete(project);
                  }}
                  aria-label={t('common.delete')}
                >
                  <TrashIcon />
                </button>
              )}
            </div>
          );
        },
      });
    }

    return cols;
  }, [t, canCreate, isAdmin, canEditProject, handleOpenEdit, handleOpenDelete]);

  // ─── Mobile card renderer ─────────────────────────────────────────
  const renderMobileCard = useCallback(
    (project: Project) => {
      const statusVariant = project.status === 'Active' ? 'success' : 'neutral';
      const statusLabel =
        project.status === 'Active'
          ? t('projects.active')
          : t('projects.completed');
      const canEdit = canEditProject(project);

      return (
        <div className="bg-[#fdfaf0] border border-[rgba(34,21,13,0.15)] rounded-xl p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <span className="font-medium text-[#22150d] text-sm">
              {project.name}
            </span>
            <Badge variant={statusVariant}>{statusLabel}</Badge>
          </div>

          {project.customer && (
            <p className="text-xs text-[#5c4a3e] mb-1">
              {project.customer.name}
            </p>
          )}
          {project.manager && (
            <p className="text-xs text-[#7d6b5d] mb-1">
              {t('projects.manager')}:{' '}
              {project.manager.firstName} {project.manager.lastName}
            </p>
          )}
          <p className="text-xs text-[#7d6b5d]">
            {t('projects.contractDate')}: {formatDate(project.contractDate)}
          </p>

          {canCreate && (canEdit || isAdmin) && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[rgba(34,21,13,0.10)]">
              {canEdit && (
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-xs text-[#5c4a3e] hover:text-[#22150d] transition-colors cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenEdit(project);
                  }}
                >
                  <PencilIcon />
                  {t('common.edit')}
                </button>
              )}
              {isAdmin && (
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-xs text-[#8b3a2a] hover:text-red-800 transition-colors cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenDelete(project);
                  }}
                >
                  <TrashIcon />
                  {t('common.delete')}
                </button>
              )}
            </div>
          )}
        </div>
      );
    },
    [t, canCreate, isAdmin, canEditProject, handleOpenEdit, handleOpenDelete],
  );

  // ─── Render ────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-brown-900">
          {t('projects.title')}
        </h1>

        {canCreate && (
          <Button
            variant="primary"
            icon={<PlusIcon />}
            onClick={handleOpenCreate}
          >
            {t('projects.addProject')}
          </Button>
        )}
      </div>

      {/* Toolbar: Search + Status filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            placeholder={t('projects.searchProjects')}
            value={filterState.search}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-48">
          <Select
            options={statusFilterOptions}
            value={filterState.status}
            onChange={(e) =>
              setStatusFilter(e.target.value as StatusFilter)
            }
          />
        </div>
      </div>

      {/* Table */}
      <Table<Project>
        data={paginatedProjects}
        columns={columns}
        isLoading={isLoading}
        sorting
        onRowClick={handleRowClick}
        renderMobileCard={renderMobileCard}
        pagination={{
          page: filterState.page,
          limit: PAGE_SIZE,
          total: filteredProjects.length,
          onPageChange: setPage,
        }}
        emptyState={{
          title: filterState.search.trim()
            ? t('projects.noProjectsMatchingSearch', {
                query: filterState.search,
              })
            : t('projects.noProjects'),
        }}
      />

      {/* Project Form Modal (Create / Edit) */}
      <ProjectForm
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmitCreate={handleCreateSubmit}
        onSubmitEdit={handleEditSubmit}
        mode={formMode}
        defaultValues={editingProject}
        loading={createMutation.isPending || updateMutation.isPending}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        title={t('projects.deleteProject')}
        message={
          projectToDelete
            ? t('projects.deleteConfirmMessage', {
                name: projectToDelete.name,
              })
            : ''
        }
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
