import { type FC, useMemo, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Modal, Button, Select, DatePicker } from '@/shared/components';
import type { User } from '@/shared/types';
import type { ExportFormData, ExportFormat, ExportType } from '../types';

// ─── Schema ─────────────────────────────────────────────────────────────────

const exportSchema = z.object({
  userId: z.string().default(''),
  type: z.enum(['plan', 'actual']),
  dateFrom: z.string().min(1, 'required'),
  dateTo: z.string().min(1, 'required'),
  format: z.enum(['csv', 'xlsx', 'pdf']),
});

type ExportFormValues = z.infer<typeof exportSchema>;

// ─── Date helpers ───────────────────────────────────────────────────────────

function getFirstDayOfMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

function getLastDayOfMonth(): string {
  const now = new Date();
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, '0')}-${String(last.getDate()).padStart(2, '0')}`;
}

// ─── Props ──────────────────────────────────────────────────────────────────

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (data: ExportFormData) => void;
  loading: boolean;
  employees: User[];
}

// ─── Component ──────────────────────────────────────────────────────────────

const ExportModal: FC<ExportModalProps> = ({
  isOpen,
  onClose,
  onExport,
  loading,
  employees,
}) => {
  const { t } = useTranslation();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ExportFormValues>({
    resolver: zodResolver(exportSchema),
    defaultValues: {
      userId: '',
      type: 'plan',
      dateFrom: getFirstDayOfMonth(),
      dateTo: getLastDayOfMonth(),
      format: 'csv',
    },
  });

  useEffect(() => {
    if (isOpen) {
      reset({
        userId: '',
        type: 'plan',
        dateFrom: getFirstDayOfMonth(),
        dateTo: getLastDayOfMonth(),
        format: 'csv',
      });
    }
  }, [isOpen, reset]);

  const employeeOptions = useMemo(
    () => [
      { value: '', label: t('workload.exportAllEmployees') },
      ...employees.map((e) => ({
        value: e.id,
        label: `${e.firstName} ${e.lastName}`,
      })),
    ],
    [employees, t],
  );

  const typeOptions = useMemo<Array<{ value: ExportType; label: string }>>(
    () => [
      { value: 'plan', label: t('workload.exportTypePlan') },
      { value: 'actual', label: t('workload.exportTypeActual') },
    ],
    [t],
  );

  const formatOptions = useMemo<Array<{ value: ExportFormat; label: string }>>(
    () => [
      { value: 'csv', label: t('workload.exportFormatCsv') },
      { value: 'xlsx', label: t('workload.exportFormatXlsx') },
      { value: 'pdf', label: t('workload.exportFormatPdf') },
    ],
    [t],
  );

  const handleFormSubmit = (values: ExportFormValues) => {
    onExport(values);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('workload.exportTitle')}
      size="md"
      actions={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit(handleFormSubmit)}
            loading={loading}
          >
            {loading ? t('workload.exporting') : t('workload.exportButton')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Employee */}
        <Controller
          name="userId"
          control={control}
          render={({ field }) => (
            <Select
              label={t('workload.exportEmployee')}
              options={employeeOptions}
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />

        {/* Type */}
        <Controller
          name="type"
          control={control}
          render={({ field }) => (
            <Select
              label={t('workload.exportType')}
              options={typeOptions}
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />

        {/* Period */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-brown-800">
            {t('workload.exportPeriod')}
          </label>
          <div className="grid grid-cols-2 gap-3">
            <Controller
              name="dateFrom"
              control={control}
              render={({ field }) => (
                <DatePicker
                  label={t('workload.exportPeriodFrom')}
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.dateFrom?.message ? t('common.required') : undefined}
                />
              )}
            />
            <Controller
              name="dateTo"
              control={control}
              render={({ field }) => (
                <DatePicker
                  label={t('workload.exportPeriodTo')}
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.dateTo?.message ? t('common.required') : undefined}
                />
              )}
            />
          </div>
        </div>

        {/* Format */}
        <Controller
          name="format"
          control={control}
          render={({ field }) => (
            <Select
              label={t('workload.exportFormat')}
              options={formatOptions}
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
      </div>
    </Modal>
  );
};

export default ExportModal;
