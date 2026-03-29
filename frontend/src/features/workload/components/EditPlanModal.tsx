import { type FC, useMemo, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Modal, Button, Input, Select } from '@/shared/components';
import type { Project } from '@/shared/types';
import type { WorkloadPlanEntry } from '../types';

// ─── Schema ─────────────────────────────────────────────────────────────────

const editPlanSchema = z.object({
  projectId: z.string().min(1, 'required'),
  hours: z
    .union([z.string(), z.number()])
    .transform((val) => {
      if (val === '' || val === null || val === undefined) return null;
      return Number(val);
    })
    .pipe(z.number().min(0).max(24).nullable()),
});

type EditPlanFormValues = z.infer<typeof editPlanSchema>;

// ─── Props ──────────────────────────────────────────────────────────────────

interface EditPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { id: string; projectId: string; hours: number | null }) => void;
  loading: boolean;
  plan: WorkloadPlanEntry | null;
  projects: Project[];
}

// ─── Component ──────────────────────────────────────────────────────────────

const EditPlanModal: FC<EditPlanModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  loading,
  plan,
  projects,
}) => {
  const { t } = useTranslation();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EditPlanFormValues>({
    resolver: zodResolver(editPlanSchema),
    defaultValues: {
      projectId: plan?.projectId ?? '',
      hours: plan?.hours ?? (null as unknown as number),
    },
  });

  useEffect(() => {
    if (isOpen && plan) {
      reset({
        projectId: plan.projectId,
        hours: plan.hours ?? (null as unknown as number),
      });
    }
  }, [isOpen, plan, reset]);

  const projectOptions = useMemo(
    () =>
      projects
        .filter((p) => p.status === 'Active')
        .map((p) => ({ value: p.id, label: p.name })),
    [projects],
  );

  const handleFormSubmit = (values: EditPlanFormValues) => {
    if (!plan) return;
    onSubmit({
      id: plan.id,
      projectId: values.projectId,
      hours: values.hours,
    });
  };

  if (!plan) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('workload.editPlanned')}
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
            {t('common.save')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Date (readonly) */}
        <Input
          label={t('workload.date')}
          value={plan.date}
          readOnly
          disabled
        />

        {/* Employee (readonly) */}
        <Input
          label={t('workload.employee')}
          value={plan.userName}
          readOnly
          disabled
        />

        {/* Project (editable) */}
        <Controller
          name="projectId"
          control={control}
          render={({ field }) => (
            <Select
              label={t('workload.project')}
              options={projectOptions}
              placeholder={t('workload.selectProject')}
              value={field.value}
              onChange={field.onChange}
              error={errors.projectId?.message ? t('workload.selectProjectRequired') : undefined}
            />
          )}
        />

        {/* Hours (editable) */}
        <Controller
          name="hours"
          control={control}
          render={({ field }) => (
            <Input
              label={t('workload.hours')}
              type="number"
              placeholder={t('workload.hoursPlaceholder')}
              min={0}
              max={24}
              step={0.5}
              value={field.value ?? ''}
              onChange={(e) => field.onChange(e.target.value)}
              helperText={t('common.optional')}
            />
          )}
        />
      </div>
    </Modal>
  );
};

export default EditPlanModal;
