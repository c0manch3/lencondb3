import { type FC, useMemo, useEffect } from 'react';
import { useForm, Controller, useFieldArray, type FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Modal, Button, Input, Select } from '@/shared/components';
import type { User, Project, UserRole } from '@/shared/types';

// ─── Schema ─────────────────────────────────────────────────────────────────

const planRowSchema = z.object({
  projectId: z.string().min(1),
  hours: z
    .union([z.string(), z.number(), z.null()])
    .transform((val) => {
      if (val === '' || val === null || val === undefined) return null;
      return Number(val);
    })
    .pipe(z.number().min(0).max(24).nullable()),
});

const addPlanSchema = z.object({
  userId: z.string().min(1, 'required'),
  plans: z.array(planRowSchema).min(1),
});

type AddPlanFormValues = z.infer<typeof addPlanSchema>;

// ─── Props ──────────────────────────────────────────────────────────────────

interface AddPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (entries: Array<{ userId: string; projectId: string; hours: number | null }>) => void;
  loading: boolean;
  date: string;
  currentUser: User | null;
  employees: User[];
  projects: Project[];
  preselectedProjectId?: string;
  preselectedUserId?: string;
}

// ─── Icons ──────────────────────────────────────────────────────────────────

function PlusIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.519.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
    </svg>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

const AddPlanModal: FC<AddPlanModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  loading,
  date,
  currentUser,
  employees,
  projects,
  preselectedProjectId,
  preselectedUserId,
}) => {
  const { t } = useTranslation();
  const role = currentUser?.role as UserRole | undefined;
  const isManagerOrAdmin = role === 'Admin' || role === 'Manager';

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AddPlanFormValues>({
    resolver: zodResolver(addPlanSchema),
    defaultValues: {
      userId: preselectedUserId || (isManagerOrAdmin ? '' : (currentUser?.id ?? '')),
      plans: [{ projectId: preselectedProjectId ?? '', hours: null as unknown as number }],
    },
  });

  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: 'plans',
  });

  // Reset form when modal opens — replace ensures field array is fully in sync
  useEffect(() => {
    if (isOpen) {
      const defaultPlans = [{ projectId: preselectedProjectId ?? '', hours: null as unknown as number }];
      reset({
        userId: preselectedUserId || (isManagerOrAdmin ? '' : (currentUser?.id ?? '')),
        plans: defaultPlans,
      });
      replace(defaultPlans);
    }
  }, [isOpen, reset, replace, isManagerOrAdmin, currentUser?.id, preselectedProjectId, preselectedUserId]);

  const employeeOptions = useMemo(
    () =>
      employees.map((e) => ({
        value: e.id,
        label: `${e.firstName} ${e.lastName}`,
      })),
    [employees],
  );

  const projectOptions = useMemo(
    () =>
      projects
        .filter((p) => p.status === 'Active')
        .map((p) => ({ value: p.id, label: p.name })),
    [projects],
  );

  const handleFormSubmit = (values: AddPlanFormValues) => {
    const entries = values.plans.map((row) => ({
      userId: values.userId,
      projectId: row.projectId,
      hours: row.hours,
    }));
    onSubmit(entries);
  };

  const handleValidationError = (_fieldErrors: FieldErrors<AddPlanFormValues>) => {
    toast.error(t('common.fixFormErrors'));
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('workload.addWorkloadFor')}
      size="md"
      actions={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit(handleFormSubmit, handleValidationError)}
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
          value={date}
          readOnly
          disabled
        />

        {/* Employee select (managers/admins only) */}
        {isManagerOrAdmin ? (
          <Controller
            name="userId"
            control={control}
            render={({ field }) => (
              <Select
                label={t('workload.employee')}
                options={employeeOptions}
                placeholder={t('workload.selectEmployee')}
                value={field.value}
                onChange={field.onChange}
                error={errors.userId?.message ? t('common.required') : undefined}
              />
            )}
          />
        ) : (
          <Input
            label={t('workload.employee')}
            value={currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : ''}
            readOnly
            disabled
          />
        )}

        {/* Multi-project rows */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-brown-800">
              {t('workload.project')}
            </label>
            <button
              type="button"
              className="inline-flex items-center gap-1 text-xs text-[#b49132] hover:text-[#6b5520] cursor-pointer transition-colors"
              onClick={() => append({ projectId: '', hours: null as unknown as number })}
            >
              <PlusIcon />
              {t('workload.addProject')}
            </button>
          </div>

          {fields.map((field, idx) => (
            <div
              key={field.id}
              className="flex items-start gap-2 p-3 rounded bg-[rgba(34,21,13,0.02)] border border-[rgba(34,21,13,0.08)]"
            >
              <div className="flex-1 space-y-2">
                <Controller
                  name={`plans.${idx}.projectId`}
                  control={control}
                  render={({ field: f }) => (
                    <Select
                      options={projectOptions}
                      placeholder={t('workload.selectProject')}
                      value={f.value}
                      onChange={f.onChange}
                      error={
                        errors.plans?.[idx]?.projectId?.message
                          ? t('workload.selectProjectRequired')
                          : undefined
                      }
                    />
                  )}
                />

                <Controller
                  name={`plans.${idx}.hours`}
                  control={control}
                  render={({ field: f }) => (
                    <Input
                      type="number"
                      placeholder={t('workload.hoursPlaceholder')}
                      min={0}
                      max={24}
                      step={0.5}
                      value={f.value ?? ''}
                      onChange={(e) => f.onChange(e.target.value)}
                      helperText={t('common.optional')}
                    />
                  )}
                />
              </div>

              {fields.length > 1 && (
                <button
                  type="button"
                  className="mt-1 inline-flex items-center justify-center w-7 h-7 rounded text-[#5c4a3e] hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer"
                  onClick={() => remove(idx)}
                  aria-label={t('common.remove')}
                >
                  <TrashIcon />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
};

export default AddPlanModal;
