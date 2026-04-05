import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Button, Badge } from '@/shared/components';
import type { WorkloadActualEntry } from '../types';

function PencilIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
    </svg>
  );
}

interface ViewActualModalProps {
  isOpen: boolean;
  onClose: () => void;
  actual: WorkloadActualEntry | null;
  canEdit?: boolean;
  onEdit?: () => void;
}

const ViewActualModal: FC<ViewActualModalProps> = ({ isOpen, onClose, actual, canEdit, onEdit }) => {
  const { t } = useTranslation();

  if (!actual) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('workload.workReport')}
      size="md"
      actions={
        <div className="flex items-center gap-2">
          {canEdit && onEdit && (
            <Button variant="primary" onClick={onEdit}>
              <span className="inline-flex items-center gap-1.5">
                <PencilIcon />
                {t('workload.editReport')}
              </span>
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>
            {t('common.close')}
          </Button>
        </div>
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
