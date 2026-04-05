import { type FC, useEffect, useMemo } from 'react';
import { useForm, Controller, useFieldArray, type FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Modal, Button, Input, Select } from '@/shared/components';
import type { Project } from '@/shared/types';

// ─── Schema ─────────────────────────────────────────────────────────────────

const distributionSchema = z.object({
  projectId: z.string().min(1, 'required'),
  hours: z.coerce.number().min(0.5, 'min').max(24, 'max'),
  description: z.string().optional().default(''),
});

const logActualSchema = z.object({
  distributions: z.array(distributionSchema).min(1, 'atLeastOne'),
}).refine(
  (data) => data.distributions.reduce((sum, d) => sum + (d.hours || 0), 0) <= 24,
  { message: 'totalExceeds24', path: ['distributions'] },
);

type LogActualFormValues = z.infer<typeof logActualSchema>;

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

// ─── Props ──────────────────────────────────────────────────────────────────

export interface EditingActual {
  id: string;
  distributions: Array<{
    projectId: string;
    hours: number;
    description: string;
  }>;
}

interface LogActualModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    date: string;
    hoursWorked: number;
    userText?: string;
    distributions?: Array<{ projectId: string; hours: number; description?: string }>;
  }) => void;
  loading: boolean;
  date: string;
  projects: Project[];
  editingActual?: EditingActual | null;
}

// ─── Component ──────────────────────────────────────────────────────────────

const LogActualModal: FC<LogActualModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  loading,
  date,
  projects,
  editingActual,
}) => {
  const { t } = useTranslation();

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<LogActualFormValues>({
    resolver: zodResolver(logActualSchema),
    defaultValues: {
      distributions: [{ projectId: '', hours: 0, description: '' }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'distributions',
  });

  useEffect(() => {
    if (isOpen) {
      if (editingActual && editingActual.distributions.length > 0) {
        reset({
          distributions: editingActual.distributions.map((d) => ({
            projectId: d.projectId,
            hours: d.hours,
            description: d.description,
          })),
        });
      } else {
        reset({
          distributions: [{ projectId: '', hours: 0, description: '' }],
        });
      }
    }
  }, [isOpen, reset, editingActual]);

  const projectOptions = useMemo(
    () =>
      projects
        .filter((p) => p.status === 'Active')
        .map((p) => ({ value: p.id, label: p.name })),
    [projects],
  );

  const watchedDistributions = watch('distributions');

  const handleFormSubmit = (values: LogActualFormValues) => {
    const totalHours = values.distributions.reduce((sum, d) => sum + (d.hours || 0), 0);
    onSubmit({
      date,
      hoursWorked: totalHours,
      userText: '',
      distributions: values.distributions.map((d) => ({
        projectId: d.projectId,
        hours: d.hours,
        description: d.description || undefined,
      })),
    });
  };

  const handleValidationError = (fieldErrors: FieldErrors<LogActualFormValues>) => {
    const rootDistError = fieldErrors.distributions?.root?.message ?? fieldErrors.distributions?.message;
    if (rootDistError === 'totalExceeds24') {
      toast.error(t('workload.totalExceeds24'));
    } else {
      toast.error(t('common.fixFormErrors'));
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingActual ? t('workload.editHoursFor', { date }) : t('workload.logHoursFor', { date })}
      size="lg"
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
        <Input label={t('workload.date')} value={date} readOnly disabled />

        {/* Distributions section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-brown-800">
              {t('workload.distributeToProjects')}
            </label>
            <button
              type="button"
              className="inline-flex items-center gap-1 text-xs text-[#b49132] hover:text-[#6b5520] cursor-pointer transition-colors"
              onClick={() => append({ projectId: '', hours: 0, description: '' })}
            >
              <PlusIcon />
              {t('workload.addProject')}
            </button>
          </div>

          {fields.map((field, idx) => (
            <div
              key={field.id}
              className="p-3 rounded bg-[rgba(34,21,13,0.02)] border border-[rgba(34,21,13,0.08)] space-y-2"
            >
              <div className="flex items-start gap-2">
                <div className="flex-1 space-y-2">
                  <Controller
                    name={`distributions.${idx}.projectId`}
                    control={control}
                    render={({ field: f }) => (
                      <Select
                        options={projectOptions.filter(
                          (p) =>
                            p.value === watchedDistributions?.[idx]?.projectId ||
                            !watchedDistributions?.some(
                              (d, i) => i !== idx && d.projectId === p.value,
                            ),
                        )}
                        placeholder={t('workload.selectProject')}
                        value={f.value}
                        onChange={f.onChange}
                        error={
                          errors.distributions?.[idx]?.projectId?.message
                            ? t('workload.selectProjectRequired')
                            : undefined
                        }
                      />
                    )}
                  />

                  <Controller
                    name={`distributions.${idx}.hours`}
                    control={control}
                    render={({ field: f }) => (
                      <Input
                        type="number"
                        placeholder={t('workload.hoursPlaceholder')}
                        min={0}
                        max={24}
                        step={0.5}
                        value={f.value || ''}
                        onChange={(e) => f.onChange(e.target.value)}
                        error={
                          errors.distributions?.[idx]?.hours?.message
                            ? t('workload.enterHoursRequired')
                            : undefined
                        }
                      />
                    )}
                  />

                  <Controller
                    name={`distributions.${idx}.description`}
                    control={control}
                    render={({ field: f }) => (
                      <Input
                        placeholder={t('workload.descriptionOptional')}
                        value={f.value}
                        onChange={f.onChange}
                      />
                    )}
                  />
                </div>

                <button
                  type="button"
                  disabled={fields.length <= 1}
                  className={`mt-1 inline-flex items-center justify-center w-7 h-7 rounded text-[#5c4a3e] transition-colors ${fields.length <= 1 ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer hover:text-red-700 hover:bg-red-50'}`}
                  onClick={() => remove(idx)}
                  aria-label={t('common.remove')}
                >
                  <TrashIcon />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
};

export default LogActualModal;
