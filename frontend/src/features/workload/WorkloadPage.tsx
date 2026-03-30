import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useAuth } from '@/shared/auth/AuthContext';
import { ConfirmDialog } from '@/shared/components';
import { useCalendarNavigation } from './hooks/useCalendarNavigation';
import {
  useCalendarData,
  useWorkloadEmployees,
  useWorkloadProjects,
  useCreatePlan,
  useUpdatePlan,
  useDeletePlan,
  useLogActual,
} from './hooks/useWorkloadData';
import { useWorkloadExport } from './hooks/useWorkloadExport';
import {
  getWorkloadPermissions,
  type WorkloadPlanEntry,
  type WorkloadActualEntry,
  type ExportFormData,
} from './types';
import WorkloadToolbar from './components/WorkloadToolbar';
import WorkloadFilters from './components/WorkloadFilters';
import MonthView from './components/MonthView';
import WeekView from './components/WeekView';
import DayView from './components/DayView';
import AddPlanModal from './components/AddPlanModal';
import EditPlanModal from './components/EditPlanModal';
import LogActualModal from './components/LogActualModal';
import ViewActualModal from './components/ViewActualModal';
import DateEmployeesModal from './components/DateEmployeesModal';
import ExportModal from './components/ExportModal';

// ─── Title formatter ────────────────────────────────────────────────────────

function formatTitle(
  viewMode: string,
  currentMonth: Date,
  currentDay: Date,
  weekStart: Date,
): string {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  switch (viewMode) {
    case 'month':
      return `${monthNames[currentMonth.getMonth()]} ${currentMonth.getFullYear()}`;
    case 'week': {
      const endOfWeek = new Date(weekStart);
      endOfWeek.setDate(endOfWeek.getDate() + 6);
      const sM = weekStart.getDate();
      const eM = endOfWeek.getDate();
      return `${sM} - ${eM} ${monthNames[endOfWeek.getMonth()]} ${endOfWeek.getFullYear()}`;
    }
    case 'day':
      return currentDay.toLocaleDateString(undefined, {
        weekday: 'short',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    default:
      return '';
  }
}

// ─── Page component ─────────────────────────────────────────────────────────

export default function WorkloadPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const permissions = useMemo(() => getWorkloadPermissions(user), [user]);

  // ─── Navigation ─────────────────────────────────────────────────
  const nav = useCalendarNavigation();

  // ─── Filters ────────────────────────────────────────────────────
  const [projectFilter, setProjectFilter] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('');

  // ─── Data ───────────────────────────────────────────────────────
  const isAllEmployeesMode = permissions.canViewAllEmployees && !employeeFilter;

  // Security: For employees who can't view all, scope to their own data
  const effectiveUserId = permissions.canFilterByEmployee
    ? (employeeFilter || undefined)
    : user?.id;

  const { data: calendarData, isLoading } = useCalendarData(
    nav.rangeStart,
    nav.rangeEnd,
    projectFilter || undefined,
    effectiveUserId,
    permissions.canViewAllEmployees,
  );
  const { data: employees = [] } = useWorkloadEmployees();
  const { data: projects = [] } = useWorkloadProjects();

  // ─── Mutations ──────────────────────────────────────────────────
  const createPlan = useCreatePlan();
  const updatePlan = useUpdatePlan();
  const deletePlan = useDeletePlan();
  const logActual = useLogActual();
  const { isExporting, exportWorkload } = useWorkloadExport();

  // ─── Modal states ───────────────────────────────────────────────
  const [addPlanOpen, setAddPlanOpen] = useState(false);
  const [addPlanDate, setAddPlanDate] = useState('');

  const [editPlanOpen, setEditPlanOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<WorkloadPlanEntry | null>(null);

  const [logActualOpen, setLogActualOpen] = useState(false);
  const [logActualDate, setLogActualDate] = useState('');

  const [viewActualOpen, setViewActualOpen] = useState(false);
  const [viewingActual, setViewingActual] = useState<WorkloadActualEntry | null>(null);

  const [dateEmployeesOpen, setDateEmployeesOpen] = useState(false);
  const [dateEmployeesDate, setDateEmployeesDate] = useState('');

  const [exportOpen, setExportOpen] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<WorkloadPlanEntry | null>(null);

  // ─── Handlers ───────────────────────────────────────────────────
  const handleAddPlan = useCallback((date: string) => {
    setAddPlanDate(date);
    setAddPlanOpen(true);
  }, []);

  const handleEditPlan = useCallback((plan: WorkloadPlanEntry) => {
    setEditingPlan(plan);
    setEditPlanOpen(true);
  }, []);

  const handleDeletePlan = useCallback((plan: WorkloadPlanEntry) => {
    setPlanToDelete(plan);
    setDeleteDialogOpen(true);
  }, []);

  const handleViewActual = useCallback((actual: WorkloadActualEntry) => {
    setViewingActual(actual);
    setViewActualOpen(true);
  }, []);

  const handleLogActual = useCallback((date: string) => {
    setLogActualDate(date);
    setLogActualOpen(true);
  }, []);

  const handleViewDateEmployees = useCallback((date: string) => {
    setDateEmployeesDate(date);
    setDateEmployeesOpen(true);
  }, []);

  // ─── Mutation callbacks ─────────────────────────────────────────
  const handleCreatePlanSubmit = useCallback(
    (entries: Array<{ userId: string; projectId: string; hours: number | null }>) => {
      // Create plans sequentially (one per project row)
      const promises = entries.map((entry) =>
        createPlan.mutateAsync({
          userId: entry.userId,
          projectId: entry.projectId,
          date: addPlanDate,
          hours: entry.hours,
        }),
      );

      Promise.all(promises)
        .then(() => {
          toast.success(t('workload.workloadSaved'));
          setAddPlanOpen(false);
        })
        .catch((error) => {
          if (error?.response?.status === 409) {
            toast.error(t('workload.planAlreadyExists'));
          } else {
            toast.error(t('workload.createFailed'));
          }
        });
    },
    [addPlanDate, createPlan, t],
  );

  const handleEditPlanSubmit = useCallback(
    (data: { id: string; projectId: string; hours: number | null }) => {
      updatePlan.mutate(
        { id: data.id, projectId: data.projectId, hours: data.hours },
        {
          onSuccess: () => {
            toast.success(t('workload.workloadSaved'));
            setEditPlanOpen(false);
          },
          onError: () => {
            toast.error(t('workload.updateFailed'));
          },
        },
      );
    },
    [updatePlan, t],
  );

  const handleConfirmDelete = useCallback(() => {
    if (!planToDelete) return;
    deletePlan.mutate(planToDelete.id, {
      onSuccess: () => {
        toast.success(t('workload.workloadDeleted'));
        setDeleteDialogOpen(false);
        setPlanToDelete(null);
      },
      onError: () => {
        toast.error(t('workload.deleteFailed'));
      },
    });
  }, [planToDelete, deletePlan, t]);

  const handleLogActualSubmit = useCallback(
    (data: {
      date: string;
      hoursWorked: number;
      userText?: string;
      distributions?: Array<{ projectId: string; hours: number; description?: string }>;
    }) => {
      logActual.mutate(data, {
        onSuccess: () => {
          toast.success(t('workload.hoursLoggedSuccess'));
          setLogActualOpen(false);
        },
        onError: () => {
          toast.error(t('workload.logHoursFailed'));
        },
      });
    },
    [logActual, t],
  );

  const handleExport = useCallback(
    (data: ExportFormData) => {
      exportWorkload(data).then(() => setExportOpen(false));
    },
    [exportWorkload],
  );

  // ─── Title ──────────────────────────────────────────────────────
  const title = formatTitle(nav.viewMode, nav.currentMonth, nav.currentDay, nav.weekStart);

  // ─── Render ─────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-brown-900">{t('workload.title')}</h1>

      <WorkloadToolbar
        viewMode={nav.viewMode}
        onViewModeChange={nav.setViewMode}
        onPrevious={nav.goToPrevious}
        onNext={nav.goToNext}
        onToday={nav.goToToday}
        onThisWeek={nav.goToThisWeek}
        onExport={() => setExportOpen(true)}
        canExport={permissions.canExport}
        title={title}
      />

      <WorkloadFilters
        projects={projects}
        employees={employees}
        selectedProjectId={projectFilter}
        selectedEmployeeId={employeeFilter}
        onProjectChange={setProjectFilter}
        onEmployeeChange={setEmployeeFilter}
        showEmployeeFilter={permissions.canFilterByEmployee}
      />

      {/* Calendar view (touch-swipeable) */}
      <div ref={nav.touchRef}>
        {nav.viewMode === 'month' && (
          <MonthView
            weekDays={nav.weekDays}
            calendarDays={nav.calendarDays}
            calendarData={calendarData}
            isLoading={isLoading}
            permissions={permissions}
            isAllEmployeesMode={isAllEmployeesMode}
            projectFilter={projectFilter || undefined}
            onAddPlan={handleAddPlan}
            onEditPlan={handleEditPlan}
            onViewActual={handleViewActual}
            onLogActual={handleLogActual}
            onViewDateEmployees={handleViewDateEmployees}
            onSelectDate={nav.selectDate}
          />
        )}

        {nav.viewMode === 'week' && (
          <WeekView
            weekDays={nav.weekDays}
            calendarDays={nav.calendarDays}
            calendarData={calendarData}
            isLoading={isLoading}
            permissions={permissions}
            isAllEmployeesMode={isAllEmployeesMode}
            projectFilter={projectFilter || undefined}
            onAddPlan={handleAddPlan}
            onEditPlan={handleEditPlan}
            onViewActual={handleViewActual}
            onLogActual={handleLogActual}
            onViewDateEmployees={handleViewDateEmployees}
            onSelectDate={nav.selectDate}
          />
        )}

        {nav.viewMode === 'day' && (
          <DayView
            calendarDays={nav.calendarDays}
            calendarData={calendarData}
            isLoading={isLoading}
            permissions={permissions}
            onAddPlan={handleAddPlan}
            onEditPlan={handleEditPlan}
            onDeletePlan={handleDeletePlan}
            onViewActual={handleViewActual}
            onLogActual={handleLogActual}
          />
        )}
      </div>

      {/* ─── Modals ──────────────────────────────────────────────── */}
      <AddPlanModal
        isOpen={addPlanOpen}
        onClose={() => setAddPlanOpen(false)}
        onSubmit={handleCreatePlanSubmit}
        loading={createPlan.isPending}
        date={addPlanDate}
        currentUser={user}
        employees={employees}
        projects={projects}
        preselectedProjectId={projectFilter || undefined}
        preselectedUserId={employeeFilter || undefined}
      />

      <EditPlanModal
        isOpen={editPlanOpen}
        onClose={() => setEditPlanOpen(false)}
        onSubmit={handleEditPlanSubmit}
        loading={updatePlan.isPending}
        plan={editingPlan}
        projects={projects}
      />

      <LogActualModal
        isOpen={logActualOpen}
        onClose={() => setLogActualOpen(false)}
        onSubmit={handleLogActualSubmit}
        loading={logActual.isPending}
        date={logActualDate}
        projects={projects}
      />

      <ViewActualModal
        isOpen={viewActualOpen}
        onClose={() => setViewActualOpen(false)}
        actual={viewingActual}
      />

      <DateEmployeesModal
        isOpen={dateEmployeesOpen}
        onClose={() => setDateEmployeesOpen(false)}
        date={dateEmployeesDate}
        calendarData={calendarData}
      />

      <ExportModal
        isOpen={exportOpen}
        onClose={() => setExportOpen(false)}
        onExport={handleExport}
        loading={isExporting}
        employees={employees}
      />

      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        title={t('common.delete')}
        message={t('common.actionCannotBeUndone')}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        loading={deletePlan.isPending}
      />
    </div>
  );
}
