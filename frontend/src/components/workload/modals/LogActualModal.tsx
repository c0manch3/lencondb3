import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '@/services/auth.service';
import toast from 'react-hot-toast';
import type { Project, ActualDistribution } from '@/components/workload/types';

interface LogActualModalProps {
  isOpen: boolean;
  onClose: () => void;
  actualDate: string;
  projectsForDropdown: Project[];
  onSuccess: () => void;
}

export default function LogActualModal({
  isOpen,
  onClose,
  actualDate,
  projectsForDropdown,
  onSuccess,
}: LogActualModalProps) {
  const { t } = useTranslation();

  const [actualHours, setActualHours] = useState('8');
  const [actualNotes, setActualNotes] = useState('');
  const [actualDistributions, setActualDistributions] = useState<ActualDistribution[]>([
    { projectId: '', hours: '8', description: '' },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleAddDistribution = () => {
    setActualDistributions([...actualDistributions, { projectId: '', hours: '', description: '' }]);
  };

  const handleRemoveDistribution = (index: number) => {
    setActualDistributions(actualDistributions.filter((_, i) => i !== index));
  };

  const handleDistributionChange = (index: number, field: keyof ActualDistribution, value: string) => {
    const updated = [...actualDistributions];
    updated[index] = { ...updated[index], [field]: value };
    setActualDistributions(updated);
  };

  const handleCreate = async () => {
    if (!actualDate || !actualHours) {
      toast.error(t('workload.enterHoursRequired'));
      return;
    }

    const totalDistHours = actualDistributions.reduce((sum, d) => sum + (parseFloat(d.hours) || 0), 0);
    const totalHours = parseFloat(actualHours);

    if (totalHours <= 0) {
      toast.error(t('workload.hoursPositiveRequired'));
      return;
    }

    if (totalHours > 24) {
      toast.error(t('workload.hoursExceed24'));
      return;
    }

    if (totalDistHours > totalHours) {
      toast.error(t('workload.distributionExceedsTotal'));
      return;
    }

    setIsSubmitting(true);
    try {
      const distributions = actualDistributions
        .filter(d => d.projectId && d.hours)
        .map(d => ({
          projectId: d.projectId,
          hours: parseFloat(d.hours),
          description: d.description || undefined,
        }));

      await api.post('/workload-actual/create', {
        date: actualDate,
        hoursWorked: totalHours,
        userText: actualNotes || undefined,
        distributions: distributions.length > 0 ? distributions : undefined,
      });

      toast.success(t('workload.hoursLoggedSuccess'));
      onClose();
      onSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('workload.logHoursFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-brown-900/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-cream-50 rounded-[0.4rem] shadow-sm w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">{t('workload.logHours')}</h2>
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
              value={actualDate}
              disabled
              className="w-full px-3 py-2 border border-brown-300 rounded-[0.4rem] bg-cream-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-brown-700 mb-1">
              {t('workload.totalHours')} *
            </label>
            <input
              type="number"
              min="0"
              max="24"
              step="0.5"
              value={actualHours}
              onChange={(e) => setActualHours(e.target.value)}
              className="w-full px-3 py-2 border border-brown-300 rounded-[0.4rem] focus:ring-2 focus:ring-brown-500 focus:border-brown-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-brown-700 mb-1">
              {t('workload.notes')} ({t('common.optional')})
            </label>
            <textarea
              value={actualNotes}
              onChange={(e) => setActualNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-brown-300 rounded-[0.4rem] focus:ring-2 focus:ring-brown-500 focus:border-brown-500"
              placeholder={t('workload.notesPlaceholder')}
            />
          </div>

          {/* Project Distributions */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-brown-700">
                {t('workload.distributeToProjects')}
              </label>
              <button
                type="button"
                onClick={handleAddDistribution}
                className="text-brown-600 hover:text-brown-800 text-sm font-medium"
              >
                + {t('workload.addProject')}
              </button>
            </div>
            <div className="space-y-3">
              {actualDistributions.map((dist, index) => (
                <div key={index} className="border border-brown-200 rounded-[0.4rem] p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-brown-600">{t('workload.project')} {index + 1}</span>
                    {actualDistributions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveDistribution(index)}
                        className="text-red-600 hover:text-red-800 text-xs"
                      >
                        {t('common.remove')}
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={dist.projectId}
                      onChange={(e) => handleDistributionChange(index, 'projectId', e.target.value)}
                      className="px-3 py-2 border border-brown-300 rounded-[0.4rem] text-sm focus:ring-2 focus:ring-brown-500 focus:border-brown-500"
                    >
                      <option value="">{t('workload.selectProject')}</option>
                      {projectsForDropdown.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      placeholder={t('workload.hours')}
                      value={dist.hours}
                      onChange={(e) => handleDistributionChange(index, 'hours', e.target.value)}
                      className="px-3 py-2 border border-brown-300 rounded-[0.4rem] text-sm focus:ring-2 focus:ring-brown-500 focus:border-brown-500"
                    />
                  </div>
                  <input
                    type="text"
                    placeholder={t('workload.descriptionOptional')}
                    value={dist.description}
                    onChange={(e) => handleDistributionChange(index, 'description', e.target.value)}
                    className="mt-2 w-full px-3 py-2 border border-brown-300 rounded-[0.4rem] text-sm focus:ring-2 focus:ring-brown-500 focus:border-brown-500"
                  />
                </div>
              ))}
            </div>
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
            {isSubmitting ? t('common.saving') : t('workload.logHours')}
          </button>
        </div>
      </div>
    </div>
  );
}
