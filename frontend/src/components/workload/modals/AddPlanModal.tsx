import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '@/services/auth.service';
import toast from 'react-hot-toast';
import type { Project, Employee } from '@/components/workload/types';

interface AddPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string;
  selectedProject: string;
  projects: Project[];
  managedProjects: Project[];
  isEmployee: boolean;
  user: { id: string; role: string } | null;
  getAvailableEmployeesForDate: (date: string) => Employee[];
  onSuccess: () => void;
}

export default function AddPlanModal({
  isOpen,
  onClose,
  selectedDate,
  selectedProject,
  projects,
  managedProjects,
  isEmployee,
  user,
  getAvailableEmployeesForDate,
  onSuccess,
}: AddPlanModalProps) {
  const { t } = useTranslation();

  const [newPlanEmployee, setNewPlanEmployee] = useState('');
  const [newPlanProject, setNewPlanProject] = useState(selectedProject || '');
  const [newPlanHours, setNewPlanHours] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleCreate = async () => {
    // For employees, userId is automatically set to their own ID by backend
    // For managers, they must select an employee
    if (!isEmployee && !newPlanEmployee) {
      toast.error(t('workload.selectEmployeeAndProject'));
      return;
    }

    if (!newPlanProject || !selectedDate) {
      toast.error(t('workload.selectEmployeeAndProject'));
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/workload-plan/create', {
        userId: isEmployee ? user?.id : newPlanEmployee,
        projectId: newPlanProject,
        date: selectedDate,
        ...(newPlanHours != null ? { hours: newPlanHours } : {}),
      });
      toast.success(t('workload.workloadSaved'));
      onClose();
      onSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('workload.createFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const availableEmployees = getAvailableEmployeesForDate(selectedDate);
  const projectDropdownList = isEmployee ? projects : managedProjects;

  return (
    <div className="fixed inset-0 bg-brown-900/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-cream-50 rounded-[0.4rem] shadow-sm w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">{t('workload.addPlanned')}</h2>
          <button
            onClick={onClose}
            className="text-brown-400 hover:text-brown-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-brown-700 mb-1">
              {t('workload.date')}
            </label>
            <input
              type="text"
              value={selectedDate}
              disabled
              className="w-full px-3 py-2 border border-brown-300 rounded-[0.4rem] bg-cream-100"
            />
          </div>
          {/* Only managers/admins select employees, employees create plans for themselves */}
          {!isEmployee && (
            <div>
              <label className="block text-sm font-medium text-brown-700 mb-1">
                {t('workload.employee')} *
              </label>
              <select
                value={newPlanEmployee}
                onChange={(e) => setNewPlanEmployee(e.target.value)}
                className="w-full px-3 py-2 border border-brown-300 rounded-[0.4rem] focus:ring-2 focus:ring-brown-500 focus:border-brown-500"
              >
                <option value="">{t('workload.selectEmployee')}</option>
                {availableEmployees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.firstName} {employee.lastName}
                  </option>
                ))}
              </select>
              {availableEmployees.length === 0 && (
                <p className="text-sm text-amber-600 mt-1">
                  {t('workload.allEmployeesAssigned')}
                </p>
              )}
            </div>
          )}
          {/* Only show project selection if no project is pre-selected from filter */}
          {!selectedProject && (
            <div>
              <label className="block text-sm font-medium text-brown-700 mb-1">
                {t('workload.project')} *
              </label>
              <select
                value={newPlanProject}
                onChange={(e) => setNewPlanProject(e.target.value)}
                className="w-full px-3 py-2 border border-brown-300 rounded-[0.4rem] focus:ring-2 focus:ring-brown-500 focus:border-brown-500"
              >
                <option value="">{t('workload.selectProject')}</option>
                {projectDropdownList.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
              {projectDropdownList.length === 0 && (
                <p className="text-sm text-amber-600 mt-1">
                  {t('workload.noManagedProjects')}
                </p>
              )}
            </div>
          )}
          {/* Show selected project name when project is pre-selected from filter */}
          {selectedProject && (
            <div>
              <label className="block text-sm font-medium text-brown-700 mb-1">
                {t('workload.project')}
              </label>
              <input
                type="text"
                value={projects.find(p => p.id === selectedProject)?.name || ''}
                disabled
                className="w-full px-3 py-2 border border-brown-300 rounded-[0.4rem] bg-cream-100"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-brown-700 mb-1">
              {t('workload.planHours')} ({t('common.optional')})
            </label>
            <input
              type="number"
              min="0"
              max="24"
              step="0.5"
              value={newPlanHours ?? ''}
              onChange={(e) => setNewPlanHours(e.target.value ? parseFloat(e.target.value) : null)}
              className="w-full px-3 py-2 border border-brown-300 rounded-[0.4rem] focus:ring-2 focus:ring-brown-500 focus:border-brown-500"
              placeholder={t('workload.hoursPlaceholder')}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 p-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-brown-700 hover:bg-cream-200 rounded-[0.4rem]"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleCreate}
            disabled={isSubmitting}
            className="btn-primary"
          >
            {isSubmitting ? t('common.creating') : t('common.create')}
          </button>
        </div>
      </div>
    </div>
  );
}
