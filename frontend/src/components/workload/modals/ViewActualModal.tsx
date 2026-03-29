import { useTranslation } from 'react-i18next';
import type { WorkloadActualEntry } from '@/components/workload/types';

interface ViewActualModalProps {
  isOpen: boolean;
  onClose: () => void;
  entry: WorkloadActualEntry | null;
}

export default function ViewActualModal({
  isOpen,
  onClose,
  entry,
}: ViewActualModalProps) {
  const { t } = useTranslation();

  if (!isOpen || !entry) return null;

  return (
    <div className="fixed inset-0 bg-brown-900/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-cream-50 rounded-[0.4rem] shadow-sm w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">
            {t('workload.workReport')} - {new Date(entry.date).toLocaleDateString('default', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </h2>
          <button
            onClick={onClose}
            className="text-brown-400 hover:text-brown-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-4">
          {/* Total Hours */}
          <div className="bg-green-50 border border-green-200 rounded-[0.4rem] p-4 mb-4">
            <div className="text-sm text-green-600 mb-1">{t('workload.totalHoursWorked')}</div>
            <div className="text-3xl font-bold text-green-800">{entry.hoursWorked} {t('workload.hours')}</div>
          </div>

          {/* Notes */}
          {entry.userText && (
            <div className="mb-4">
              <div className="text-sm font-medium text-brown-700 mb-2">{t('workload.notes')}</div>
              <div className="bg-cream-100 border border-brown-200 rounded-[0.4rem] p-3 text-brown-600">
                {entry.userText}
              </div>
            </div>
          )}

          {/* Project Distributions */}
          {entry.distributions && entry.distributions.length > 0 && (
            <div>
              <div className="text-sm font-medium text-brown-700 mb-2">{t('workload.projectDistribution')}</div>
              <div className="space-y-2">
                {entry.distributions.map((dist, index) => (
                  <div
                    key={index}
                    className="bg-brown-50 border border-brown-200 rounded-[0.4rem] p-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-brown-900">{dist.project.name}</div>
                      <div className="text-brown-700 font-semibold">{dist.hours} {t('workload.hours')}</div>
                    </div>
                    {dist.description && (
                      <div className="text-sm text-brown-500 mt-1">{dist.description}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No distributions message */}
          {(!entry.distributions || entry.distributions.length === 0) && !entry.userText && (
            <div className="text-brown-500 text-center py-4">
              {t('workload.noAdditionalDetails')}
            </div>
          )}
        </div>
        <div className="flex justify-end p-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-brown-700 hover:bg-cream-200 rounded-[0.4rem]"
          >
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  );
}
