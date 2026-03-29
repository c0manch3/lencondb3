import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Button, Badge } from '@/shared/components';
import type { WorkloadActualEntry } from '../types';

interface ViewActualModalProps {
  isOpen: boolean;
  onClose: () => void;
  actual: WorkloadActualEntry | null;
}

const ViewActualModal: FC<ViewActualModalProps> = ({ isOpen, onClose, actual }) => {
  const { t } = useTranslation();

  if (!actual) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('workload.workReport')}
      size="md"
      actions={
        <Button variant="ghost" onClick={onClose}>
          {t('common.close')}
        </Button>
      }
    >
      <div className="space-y-4">
        {/* Employee + Date */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-brown-900">{actual.userName}</div>
            <div className="text-xs text-brown-500 mt-0.5">{actual.date}</div>
          </div>
          <Badge variant="success">
            {actual.hoursWorked}{t('workload.hoursShort')}
          </Badge>
        </div>

        {/* Total hours */}
        <div className="flex items-center justify-between py-2 border-t border-b border-brown-100">
          <span className="text-sm text-brown-600">{t('workload.totalHoursWorked')}</span>
          <span className="text-sm font-semibold text-brown-900">
            {actual.hoursWorked} {t('workload.hours').toLowerCase()}
          </span>
        </div>

        {/* Notes */}
        {actual.userText && (
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-brown-500 mb-1">
              {t('workload.notes')}
            </h4>
            <p className="text-sm text-brown-800 whitespace-pre-wrap bg-cream-100 rounded p-3">
              {actual.userText}
            </p>
          </div>
        )}

        {/* Distributions */}
        {actual.distributions.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-brown-500 mb-2">
              {t('workload.projectDistribution')}
            </h4>
            <div className="space-y-2">
              {actual.distributions.map((dist) => (
                <div
                  key={dist.id}
                  className="p-3 rounded bg-[rgba(92,74,62,0.05)] border-l-2 border-[#5c4a3e]"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-brown-900">
                      {dist.projectName}
                    </span>
                    <span className="text-sm font-semibold text-brown-800">
                      {dist.hours}{t('workload.hoursShort')}
                    </span>
                  </div>
                  {dist.description && (
                    <p className="text-xs text-brown-600 mt-1">{dist.description}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No distributions */}
        {actual.distributions.length === 0 && !actual.userText && (
          <p className="text-sm text-brown-400 italic">
            {t('workload.noAdditionalDetails')}
          </p>
        )}
      </div>
    </Modal>
  );
};

export default ViewActualModal;
