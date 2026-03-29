import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '@/services/auth.service';
import { useAuthState } from '@/store/AuthContext';
import toast from 'react-hot-toast';
// jsPDF and XLSX are loaded dynamically in export handlers to reduce initial bundle size

// --- Hooks & types extracted in Phase 5 Wave 1 ---
import { useWorkloadFilters } from '@/components/workload/hooks/useWorkloadFilters';
import { useCalendarNavigation } from '@/components/workload/hooks/useCalendarNavigation';
import { useWorkloadData } from '@/components/workload/hooks/useWorkloadData';
import { useWorkloadExport } from '@/components/workload/hooks/useWorkloadExport';

// --- Components extracted in Phase 5 Wave 2 ---
import WorkloadToolbar from '@/components/workload/WorkloadToolbar';
import WorkloadFilters from '@/components/workload/WorkloadFilters';
import DayView from '@/components/workload/views/DayView';
import WeekView from '@/components/workload/views/WeekView';
import MonthView from '@/components/workload/views/MonthView';

// --- Modals extracted in Phase 5 Wave 3 ---
import ViewActualModal from '@/components/workload/modals/ViewActualModal';
import DateEmployeesModal from '@/components/workload/modals/DateEmployeesModal';
import ExportModal from '@/components/workload/modals/ExportModal';

// --- Modals extracted in Phase 5 Wave 4 ---
import AddPlanModal from '@/components/workload/modals/AddPlanModal';
import EditPlanModal from '@/components/workload/modals/EditPlanModal';
import LogActualModal from '@/components/workload/modals/LogActualModal';

import {
  isFutureDateString,
  isTodayOrPastString,
} from '@/components/workload/types';
import type {
  WorkloadPlanEntry,
  WorkloadActualEntry,
} from '@/components/workload/types';

export default function WorkloadPage() {
  const { t } = useTranslation();
  const { user } = useAuthState();
  const isManager = user?.role === 'Admin' || user?.role === 'Manager';
  const isEmployee = user?.role === 'Employee';
  const isOnlyManager = user?.role === 'Manager'; // Only Manager, not Admin

  // Feature #325: Helper function to check if current user can modify a workload plan
  // Admin can modify any plan
  // Manager can only modify plans they created
  // Feature #336: Employee can only modify plans they created (for themselves)
  // Other roles cannot modify plans
  // Feature #326: Added null/undefined check for plan.manager to prevent crash
  const canModifyPlan = (plan: WorkloadPlanEntry): boolean => {
    if (!user) return false;
    if (user.role === 'Admin') return true;
    if (user.role === 'Manager' || user.role === 'Employee') {
      return plan.manager?.id === user.id;
    }
    return false;
  };

  // ---- Hook: filters ----
  const {
    selectedProject,
    setSelectedProject,
    selectedEmployee,
    setSelectedEmployee,
  } = useWorkloadFilters();

  // ---- Hook: calendar navigation ----
  const {
    currentMonth,
    currentDay,
    viewMode,
    handlePrevMonth,
    handleNextMonth,
    handlePrevDay,
    handleNextDay,
    handlePrevWeek,
    handleNextWeek,
    goToToday,
    goToThisWeek,
    setViewDay,
    setViewWeek,
    setViewMonth,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    weekDays,
    calendarDays,
  } = useCalendarNavigation();

  // ---- Hook: data fetching ----
  const {
    projects,
    managedProjects,
    employees,
    loading,
    calendarData,
    actualCalendarData,
    fetchCalendarData,
    fetchActualCalendarData,
    fetchAllEmployeesActualData,
    getEmployeesForDate,
    getActualReportsCountForDate,
    getAvailableEmployeesForDate,
  } = useWorkloadData({
    currentMonth,
    selectedProject,
    selectedEmployee,
    user,
    isEmployee: !!isEmployee,
    isManager: !!isManager,
  });

  // ---- Hook: export ----
  const {
    showExportModal,
    setShowExportModal,
    exportEmployee,
    setExportEmployee,
    exportType,
    setExportType,
    exportDateFrom,
    setExportDateFrom,
    exportDateTo,
    setExportDateTo,
    exportFormat,
    setExportFormat,
    isExporting,
    handleExportSubmit,
  } = useWorkloadExport({ t });

  // Filter projects based on user role: Managers see only their managed projects, Admins see all
  const projectsForDropdown = isOnlyManager ? managedProjects : projects;

  // Add workload modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');

  // Modal to show employees with work on a specific date (All Employees mode)
  const [showDateEmployeesModal, setShowDateEmployeesModal] = useState(false);
  const [dateEmployeesModalDate, setDateEmployeesModalDate] = useState<string>('');

  // Edit workload modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<WorkloadPlanEntry | null>(null);
  const [editingPlanDate, setEditingPlanDate] = useState<string>('');

  // Add actual hours modal state
  const [showAddActualModal, setShowAddActualModal] = useState(false);
  const [actualDate, setActualDate] = useState<string>('');

  // View actual hours report modal state
  const [showViewActualModal, setShowViewActualModal] = useState(false);
  const [viewingActualEntry, setViewingActualEntry] = useState<WorkloadActualEntry | null>(null);

  const handleOpenAddModal = (date: string) => {
    // Workload plan can only be added for current and future dates (not past)
    if (!isFutureDateString(date)) {
      toast.error(t('workload.futureDatesOnly'));
      return;
    }
    setSelectedDate(date);
    setShowAddModal(true);
  };

  const handleDeleteWorkloadPlan = async (planId: string, dateKey: string, plan?: WorkloadPlanEntry) => {
    // Workload plan can only be deleted for current and future dates (not past)
    if (!isFutureDateString(dateKey)) {
      toast.error(t('workload.cannotDeletePast'));
      return;
    }

    // Feature #336: Only the creator (manager/employee) or Admin can delete it
    if (plan && (user?.role === 'Manager' || user?.role === 'Employee') && plan.manager?.id !== user.id) {
      toast.error(t('workload.onlyManagerCanDelete'));
      return;
    }

    try {
      await api.delete(`/workload-plan/${planId}`);
      toast.success(t('workload.workloadDeleted'));
      fetchCalendarData();
    } catch (error) {
      toast.error(t('workload.deleteFailed'));
    }
  };

  const handleOpenEditModal = (plan: WorkloadPlanEntry, dateKey: string) => {
    // Workload plan can only be edited for current and future dates (not past)
    if (!isFutureDateString(dateKey)) {
      toast.error(t('workload.cannotEditPast'));
      return;
    }

    // Feature #336: Only the creator (manager/employee) or Admin can edit it
    if ((user?.role === 'Manager' || user?.role === 'Employee') && plan.manager?.id !== user.id) {
      toast.error(t('workload.onlyManagerCanEdit'));
      return;
    }

    setEditingPlan(plan);
    setEditingPlanDate(dateKey);
    setShowEditModal(true);
  };

  // Actual hours handlers
  const handleOpenAddActualModal = (date: string) => {
    // Prevent adding hours for future dates (allow today)
    if (!isTodayOrPastString(date)) {
      toast.error(t('workload.cannotLogFutureHours'));
      return;
    }
    setActualDate(date);
    setShowAddActualModal(true);
  };

  // Handle viewing an existing actual hours entry
  const handleViewActualEntry = (entry: WorkloadActualEntry) => {
    setViewingActualEntry(entry);
    setShowViewActualModal(true);
  };

  // Open modal to show employees with work on a specific date (All Employees mode)
  const handleOpenDateEmployeesModal = (date: string) => {
    setDateEmployeesModalDate(date);
    setShowDateEmployeesModal(true);
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6">
        <div className="flex items-center justify-center min-h-64">
          <div className="text-brown-500">{t('common.loading')}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-title">{t('workload.title')}</h1>
        {isManager && (
          <button
            onClick={() => setShowExportModal(true)}
            className="px-4 py-2 text-sm font-medium text-brown-700 bg-cream-50 border border-brown-300 rounded-[0.4rem] hover:bg-cream-100 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {t('common.export')}
          </button>
        )}
      </div>


      {/* Filters */}
      <WorkloadFilters
        selectedProject={selectedProject}
        setSelectedProject={setSelectedProject}
        selectedEmployee={selectedEmployee}
        setSelectedEmployee={setSelectedEmployee}
        projects={projectsForDropdown}
        employees={employees}
        isEmployee={!!isEmployee}
      />

      {/* Workload Calendar */}
      <div
        className="card"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <WorkloadToolbar
          viewMode={viewMode}
          currentDay={currentDay}
          currentMonth={currentMonth}
          weekDays={weekDays}
          handlePrevMonth={handlePrevMonth}
          handleNextMonth={handleNextMonth}
          handlePrevDay={handlePrevDay}
          handleNextDay={handleNextDay}
          handlePrevWeek={handlePrevWeek}
          handleNextWeek={handleNextWeek}
          goToToday={goToToday}
          goToThisWeek={goToThisWeek}
          setViewDay={setViewDay}
          setViewWeek={setViewWeek}
          setViewMonth={setViewMonth}
        />

        {/* Calendar Grid */}
        <div className="p-4">
          {/* Day View - Mobile */}
          {viewMode === 'day' && (
            <DayView
              currentDay={currentDay}
              calendarData={calendarData}
              actualCalendarData={actualCalendarData}
              selectedEmployee={selectedEmployee}
              isEmployee={!!isEmployee}
              isOnlyManager={!!isOnlyManager}
              canModifyPlan={canModifyPlan}
              onOpenAddModal={handleOpenAddModal}
              onOpenAddActualModal={handleOpenAddActualModal}
              onOpenEditModal={handleOpenEditModal}
              onDeletePlan={handleDeleteWorkloadPlan}
              onViewActualEntry={handleViewActualEntry}
              onOpenDateEmployeesModal={handleOpenDateEmployeesModal}
            />
          )}


          {/* Week View - Tablet */}
          {viewMode === 'week' && (
            <WeekView
              weekDays={weekDays}
              calendarData={calendarData}
              actualCalendarData={actualCalendarData}
              selectedEmployee={selectedEmployee}
              isEmployee={!!isEmployee}
              isOnlyManager={!!isOnlyManager}
              canModifyPlan={canModifyPlan}
              onOpenAddModal={handleOpenAddModal}
              onOpenAddActualModal={handleOpenAddActualModal}
              onOpenEditModal={handleOpenEditModal}
              onDeletePlan={handleDeleteWorkloadPlan}
              onViewActualEntry={handleViewActualEntry}
              onOpenDateEmployeesModal={handleOpenDateEmployeesModal}
            />
          )}

          {/* Month View - Desktop */}
          {viewMode === 'month' && (
            <MonthView
              calendarDays={calendarDays}
              calendarData={calendarData}
              actualCalendarData={actualCalendarData}
              selectedProject={selectedProject}
              selectedEmployee={selectedEmployee}
              isEmployee={!!isEmployee}
              isOnlyManager={!!isOnlyManager}
              canModifyPlan={canModifyPlan}
              getActualReportsCountForDate={getActualReportsCountForDate}
              onOpenAddModal={handleOpenAddModal}
              onOpenAddActualModal={handleOpenAddActualModal}
              onOpenEditModal={handleOpenEditModal}
              onDeletePlan={handleDeleteWorkloadPlan}
              onOpenDateEmployeesModal={handleOpenDateEmployeesModal}
              onViewActualEntry={handleViewActualEntry}
            />
          )}
        </div>
      </div>

      {/* Add Workload Plan Modal */}
      <AddPlanModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        selectedDate={selectedDate}
        selectedProject={selectedProject}
        projects={projects}
        managedProjects={managedProjects}
        isEmployee={!!isEmployee}
        user={user}
        getAvailableEmployeesForDate={getAvailableEmployeesForDate}
        onSuccess={fetchCalendarData}
      />

      {/* Edit Workload Plan Modal */}
      {editingPlan && (
        <EditPlanModal
          isOpen={showEditModal}
          onClose={() => { setShowEditModal(false); setEditingPlan(null); }}
          plan={editingPlan}
          dateKey={editingPlanDate}
          projectsForDropdown={projectsForDropdown}
          onSuccess={fetchCalendarData}
        />
      )}

      {/* Log Actual Hours Modal */}
      <LogActualModal
        isOpen={showAddActualModal}
        onClose={() => setShowAddActualModal(false)}
        actualDate={actualDate}
        projectsForDropdown={projectsForDropdown}
        onSuccess={() => { fetchActualCalendarData(); fetchAllEmployeesActualData(); }}
      />

      <DateEmployeesModal
        isOpen={showDateEmployeesModal}
        onClose={() => setShowDateEmployeesModal(false)}
        dateKey={dateEmployeesModalDate}
        employeesData={getEmployeesForDate(dateEmployeesModalDate)}
        calendarData={calendarData}
        canModifyPlan={canModifyPlan}
        isFutureDateString={isFutureDateString}
        onEditPlan={handleOpenEditModal}
        onDeletePlan={handleDeleteWorkloadPlan}
        employeesCount={getEmployeesForDate(dateEmployeesModalDate).length}
      />

      <ViewActualModal
        isOpen={showViewActualModal}
        onClose={() => setShowViewActualModal(false)}
        entry={viewingActualEntry}
      />

      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        employees={employees}
        exportState={{
          exportEmployee,
          setExportEmployee,
          exportType,
          setExportType,
          exportDateFrom,
          setExportDateFrom,
          exportDateTo,
          setExportDateTo,
          exportFormat,
          setExportFormat,
          isExporting,
        }}
        onSubmit={handleExportSubmit}
      />
    </div>
  );
}
