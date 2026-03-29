import { useTranslation } from 'react-i18next';
import { Modal, Button, Badge } from '@/shared/components';
import type { Company } from '@/shared/types';

// ─── Props ──────────────────────────────────────────────────────────────────

interface CompanyDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: Company | null;
  isAdmin: boolean;
  onEdit: (company: Company) => void;
  onDelete: (company: Company) => void;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium text-brown-400 uppercase tracking-wider">
        {label}
      </span>
      <span className="text-sm text-brown-900">
        {value || '-'}
      </span>
    </div>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function CompanyDetailModal({
  isOpen,
  onClose,
  company,
  isAdmin,
  onEdit,
  onDelete,
}: CompanyDetailModalProps) {
  const { t } = useTranslation();

  if (!company) return null;

  const typeBadgeVariant = company.type === 'Customer' ? 'customer' : 'contractor';
  const typeLabel = company.type === 'Customer'
    ? t('companies.customer')
    : t('companies.contractor');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('companies.companyDetails')}
      size="md"
      actions={
        <>
          {isAdmin && (
            <>
              <Button
                variant="danger"
                size="sm"
                onClick={() => onDelete(company)}
              >
                {t('common.delete')}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onEdit(company)}
              >
                {t('common.edit')}
              </Button>
            </>
          )}
          <Button variant="ghost" onClick={onClose}>
            {t('common.close')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {/* Name + Type */}
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-brown-900">
            {company.name}
          </h3>
          <Badge variant={typeBadgeVariant}>{typeLabel}</Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <DetailRow
            label={t('companies.contactPerson')}
            value={company.contactPerson}
          />
          <DetailRow
            label={t('companies.email')}
            value={company.email}
          />
          <DetailRow
            label={t('companies.phone')}
            value={company.phone}
          />
          <DetailRow
            label={t('companies.address')}
            value={company.address}
          />
          <DetailRow
            label={t('companies.postalCode')}
            value={company.postalCode}
          />
        </div>
      </div>
    </Modal>
  );
}
