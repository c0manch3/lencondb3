import { type FC, useMemo, useEffect } from 'react';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Modal, Button, Input, Select } from '@/shared/components';
import type { Project } from '@/shared/types';

// ─── Schema ─────────────────────────────────────────────────────────────────

const distributionSchema = z.object({
  projectId: z.string().min(1, 'required'),
  hours: z.coerce.number().min(0.5, 'min'),
  description: z.string().optional().default(''),
});

const logActualSchema = z
  .object({
    hoursWorked: z.coerce.number().positive('positive').max(24, 'max24'),
    userText: z.string().optional().default(''),
    distributions: z.array(distributionSchema),
  })
  .refine(
    (data) => {
      if (data.distributions.length === 0) return true;
      const sum = data.distributions.reduce((acc, d) => acc + d.hours, 0);
      return sum <= data.hoursWorked;
    },
    {
      message: 'distributionExceedsTotal',
      path: ['distributions'],
    },
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
}

// ─── Component ──────────────────────────────────────────────────────────────

const LogActualModal: FC<LogActualModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  loading,
  date,
  projects,
}) => {
  const { t } = useTranslation();

  const {
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<LogActualFormValues>({
    resolver: zodResolver(logActualSchema),
    defaultValues: {
      hoursWorked: 0,
      userText: '',
      distributions: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'distributions',
  });

  useEffect(() => {
    if (isOpen) {
      reset({
        hoursWorked: 0,
        userText: '',
        distributions: [],
      });
    }
  }, [isOpen, reset]);

  const projectOptions = useMemo(
    () =>
      projects
        .filter((p) => p.status === 'Active')
        .map((p) => ({ value: p.id, label: p.name })),
    [projects],
  );

  const hoursWorked = watch('hoursWorked');
  const distributions = watch('distributions');

  const distributedHours = distributions.reduce(
    (sum, d) => sum + (Number(d.hours) || 0),
    0,
  );
  const remainingHours = Math.max(0, (Number(hoursWorked) || 0) - distributedHours);

  const handleFormSubmit = (values: LogActualFormValues) => {
    onSubmit({
      date,
      hoursWorked: values.hoursWorked,
      userText: values.userText || undefined,
      distributions:
        values.distributions.length > 0
          ? values.distributions.map((d) => ({
              projectId: d.projectId,
              hours: d.hours,
              description: d.description || undefined,
            }))
          : undefined,
    });
  };

  // Map error messages to translated strings
  const hoursError = errors.hoursWorked?.message;
  const getHoursErrorText = () => {
    if (!hoursError) return undefined;
    if (hoursError === 'positive') return t('workload.hoursPositiveRequired');
    if (hoursError === 'max24') return t('workload.hoursExceed24');
    return t('workload.enterHoursRequired');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('workload.logHoursFor', { date })}
      size="lg"
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
        <Input label={t('workload.date')} value={date} readOnly disabled />

        {/* Total hours */}
        <Controller
          name="hoursWorked"
          control={control}
          render={({ field }) => (
            <Input
              label={t('workload.totalHours')}
              type="number"
              min={0}
              max={24}
              step={0.5}
              placeholder="8"
              value={field.value || ''}
              onChange={(e) => field.onChange(e.target.value)}
              error={getHoursErrorText()}
            />
          )}
        />

        {/* Notes */}
        <Controller
          name="userText"
          control={control}
          render={({ field }) => (
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-brown-800">
                {t('workload.notes')}
              </label>
              <textarea
                className="bg-cream-50 border border-brown-200 rounded px-3 py-2 text-brown-900 text-sm transition-colors duration-200 focus:border-brown-500 focus:ring-1 focus:ring-brown-500 focus:outline-none min-h-[80px] resize-y"
                placeholder={t('workload.notesPlaceholder')}
                value={field.value}
                onChange={field.onChange}
              />
            </div>
          )}
        />

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

          {/* Remaining hours indicator */}
          {fields.length > 0 && (
            <div className="text-xs text-[#5c4a3e]">
              {t('workload.remainingHours')}: {remainingHours.toFixed(1)}{t('workload.hoursShort')}
            </div>
          )}

          {/* Distribution error */}
          {errors.distributions?.root?.message === 'distributionExceedsTotal' && (
            <p className="text-xs text-red-600" role="alert">
              {t('workload.distributionExceedsTotal')}
            </p>
          )}

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
                        options={projectOptions}
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
                  className="mt-1 inline-flex items-center justify-center w-7 h-7 rounded text-[#5c4a3e] hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer"
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
