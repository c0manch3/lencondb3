import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '@/services/auth.service';
import toast from 'react-hot-toast';
import type { WorkloadPlanEntry, Project } from '@/components/workload/types';

interface EditPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: WorkloadPlanEntry;
  dateKey: string;
  projectsForDropdown: Project[];
  onSuccess: () => void;
}

export default function EditPlanModal({
  isOpen,
  onClose,
  plan,
  dateKey,
  projectsForDropdown,
  onSuccess,
}: EditPlanModalProps) {
  const { t } = useTranslation();

  const [editPlanProject, setEditPlanProject] = useState(plan.project.id);
  const [editPlanHours, setEditPlanHours] = useState<number | null>(plan.hours ?? null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleUpdate = async () => {
    if (!editPlanProject) {
      toast.error(t('workload.selectProjectRequired'));
      return;
    }

    setIsSubmitting(true);
    try {
      await api.patch(`/workload-plan/${plan.id}`, {
        projectId: editPlanProject,
        hours: editPlanHours,
      });
      toast.success(t('workload.workloadSaved'));
      onClose();
      onSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('workload.updateFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-brown-900/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-cream-50 rounded-[0.4rem] shadow-sm w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">{t('workload.editPlanned')}</h2>
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
              value={dateKey}
              disabled
              className="w-full px-3 py-2 border border-brown-300 rounded-[0.4rem] bg-cream-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-brown-700 mb-1">
              {t('workload.employee')}
            </label>
            <input
              type="text"
              value={`${plan.user.firstName} ${plan.user.lastName}`}
              disabled
              className="w-full px-3 py-2 border border-brown-300 rounded-[0.4rem] bg-cream-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-brown-700 mb-1">
              {t('workload.project')} *
            </label>
            <select
              value={editPlanProject}
              onChange={(e) => setEditPlanProject(e.target.value)}
              className="w-full px-3 py-2 border border-brown-300 rounded-[0.4rem] focus:ring-2 focus:ring-brown-500 focus:border-brown-500"
            >
              <option value="">{t('workload.selectProject')}</option>
              {projectsForDropdown.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-brown-700 mb-1">
              {t('workload.planHours')} ({t('common.optional')})
            </label>
            <input
              type="number"
              min="0"
              max="24"
              step="0.5"
              value={editPlanHours ?? ''}
              onChange={(e) => setEditPlanHours(e.target.value ? parseFloat(e.target.value) : null)}
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
            onClick={handleUpdate}
            disabled={isSubmitting}
            className="btn-primary"
          >
            {isSubmitting ? t('common.saving') : t('common.save')}
          </button>
        </div>
      </div>
    </div>
  );
}
