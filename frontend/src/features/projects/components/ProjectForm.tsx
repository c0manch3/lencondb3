import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Modal, Button, Input, Select, DatePicker } from '@/shared/components';
import type { Project, ProjectType, Company } from '@/shared/types';
import { useCompanies } from '@/features/companies/hooks/useCompanies';
import { useUsers, useProjects } from '../hooks/useProjects';

// ─── Schemas ────────────────────────────────────────────────────────────────

const createProjectSchema = z
  .object({
    name: z
      .string()
      .min(3, 'validation.minLength')
      .max(200, 'validation.maxLength'),
    customerId: z.string().optional(),
    managerId: z.string().min(1, 'validation.required'),
    type: z.enum(['main', 'additional'] as const).default('main'),
    mainProjectId: z.string().optional(),
    contractDate: z.string().min(1, 'validation.required'),
    expirationDate: z.string().min(1, 'validation.required'),
    cost: z
      .union([z.string(), z.number()])
      .optional()
      .transform((val) => {
        if (val === undefined || val === '' || val === null) return undefined;
        const num = typeof val === 'string' ? parseFloat(val) : val;
        return isNaN(num) ? undefined : num;
      }),
  })
  .refine(
    (data) => {
      if (!data.contractDate || !data.expirationDate) return true;
      return data.expirationDate >= data.contractDate;
    },
    {
      message: 'validation.dateAfter',
      path: ['expirationDate'],
    },
  )
  .refine(
    (data) => {
      if (data.type !== 'additional') return true;
      return Boolean(data.mainProjectId);
    },
    {
      message: 'validation.required',
      path: ['mainProjectId'],
    },
  );

const editProjectSchema = z
  .object({
    name: z
      .string()
      .min(3, 'validation.minLength')
      .max(200, 'validation.maxLength'),
    status: z.enum(['Active', 'Completed'] as const),
    contractDate: z.string().min(1, 'validation.required'),
    expirationDate: z.string().min(1, 'validation.required'),
    cost: z
      .union([z.string(), z.number()])
      .optional()
      .transform((val) => {
        if (val === undefined || val === '' || val === null) return undefined;
        const num = typeof val === 'string' ? parseFloat(val) : val;
        return isNaN(num) ? undefined : num;
      }),
  })
  .refine(
    (data) => {
      if (!data.contractDate || !data.expirationDate) return true;
      return data.expirationDate >= data.contractDate;
    },
    {
      message: 'validation.dateAfter',
      path: ['expirationDate'],
    },
  );

type CreateFormValues = z.input<typeof createProjectSchema>;
type EditFormValues = z.input<typeof editProjectSchema>;

// ─── Props ──────────────────────────────────────────────────────────────────

interface ProjectFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitCreate?: (values: {
    name: string;
    customerId?: string;
    managerId: string;
    type?: ProjectType;
    mainProjectId?: string;
    contractDate: string;
    expirationDate: string;
    cost?: number;
  }) => void;
  onSubmitEdit?: (values: {
    name: string;
    status: string;
    contractDate: string;
    expirationDate: string;
    cost?: number;
  }) => void;
  mode: 'create' | 'edit';
  defaultValues?: Project | null;
  loading?: boolean;
}

// ─── Create form body ───────────────────────────────────────────────────────

function CreateFormBody({
  isOpen,
  onClose,
  onSubmit,
  loading,
  customerOptions,
  managerOptions,
  mainProjectOptions,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: NonNullable<ProjectFormProps['onSubmitCreate']>;
  loading: boolean;
  customerOptions: { value: string; label: string }[];
  managerOptions: { value: string; label: string }[];
  mainProjectOptions: { value: string; label: string }[];
}) {
  const { t } = useTranslation();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<CreateFormValues>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      name: '',
      customerId: '',
      managerId: '',
      type: 'main' as ProjectType,
      mainProjectId: '',
      contractDate: '',
      expirationDate: '',
      cost: '',
    },
  });

  const watchedType = watch('type');

  useEffect(() => {
    if (isOpen) {
      reset({
        name: '',
        customerId: '',
        managerId: '',
        type: 'main',
        mainProjectId: '',
        contractDate: '',
        expirationDate: '',
        cost: '',
      });
    }
  }, [isOpen, reset]);

  const typeOptions = [
    { value: 'main', label: t('projects.main') },
    { value: 'additional', label: t('projects.additional') },
  ];

  const onFormSubmit = handleSubmit((values) => {
    onSubmit({
      name: values.name,
      customerId: values.customerId || undefined,
      managerId: values.managerId,
      type: values.type,
      mainProjectId:
        values.type === 'additional' ? values.mainProjectId : undefined,
      contractDate: values.contractDate,
      expirationDate: values.expirationDate,
      cost: values.cost as number | undefined,
    });
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('projects.addProject')}
      size="lg"
      actions={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            {t('common.cancel')}
          </Button>
          <Button variant="primary" onClick={onFormSubmit} loading={loading}>
            {t('common.create')}
          </Button>
        </>
      }
    >
      <form
        onSubmit={onFormSubmit}
        className="flex flex-col gap-4"
        noValidate
      >
        <Input
          label={t('projects.projectName')}
          placeholder={t('projects.projectNamePlaceholder')}
          error={
            errors.name?.message
              ? t(errors.name.message, { min: 3, max: 200 })
              : undefined
          }
          {...register('name')}
        />

        <Select
          label={t('projects.customer')}
          placeholder={t('projects.selectCustomer')}
          options={customerOptions}
          error={
            errors.customerId?.message
              ? t(errors.customerId.message)
              : undefined
          }
          {...register('customerId')}
        />

        <Select
          label={t('projects.manager')}
          placeholder={t('projects.selectManager')}
          options={managerOptions}
          error={
            errors.managerId?.message
              ? t(errors.managerId.message)
              : undefined
          }
          {...register('managerId')}
        />

        <Select
          label={t('projects.type')}
          options={typeOptions}
          {...register('type')}
        />

        {watchedType === 'additional' && (
          <Select
            label={t('projects.mainProject')}
            placeholder={t('projects.selectMainProject')}
            options={mainProjectOptions}
            error={
              errors.mainProjectId?.message
                ? t(errors.mainProjectId.message)
                : undefined
            }
            {...register('mainProjectId')}
          />
        )}

        <DatePicker
          label={t('projects.contractDate')}
          error={
            errors.contractDate?.message
              ? t(errors.contractDate.message)
              : undefined
          }
          {...register('contractDate')}
        />

        <DatePicker
          label={t('projects.expirationDate')}
          error={
            errors.expirationDate?.message
              ? t(errors.expirationDate.message, {
                  date: t('projects.contractDate'),
                })
              : undefined
          }
          {...register('expirationDate')}
        />

        <Input
          label={`${t('payments.projectCost')} (RUB)`}
          type="number"
          placeholder="0.00"
          min={0}
          step={0.01}
          {...register('cost')}
        />
      </form>
    </Modal>
  );
}

// ─── Edit form body ─────────────────────────────────────────────────────────

function EditFormBody({
  isOpen,
  onClose,
  onSubmit,
  loading,
  defaultValues,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: NonNullable<ProjectFormProps['onSubmitEdit']>;
  loading: boolean;
  defaultValues: Project | null | undefined;
}) {
  const { t } = useTranslation();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EditFormValues>({
    resolver: zodResolver(editProjectSchema),
    defaultValues: {
      name: '',
      status: 'Active' as const,
      contractDate: '',
      expirationDate: '',
      cost: '',
    },
  });

  useEffect(() => {
    if (isOpen && defaultValues) {
      reset({
        name: defaultValues.name,
        status: defaultValues.status,
        contractDate: defaultValues.contractDate?.slice(0, 10) ?? '',
        expirationDate: defaultValues.expirationDate?.slice(0, 10) ?? '',
        cost: defaultValues.cost != null ? String(defaultValues.cost) : '',
      });
    }
  }, [isOpen, defaultValues, reset]);

  const statusOptions = [
    { value: 'Active', label: t('projects.active') },
    { value: 'Completed', label: t('projects.completed') },
  ];

  const onFormSubmit = handleSubmit((values) => {
    onSubmit({
      name: values.name,
      status: values.status,
      contractDate: values.contractDate,
      expirationDate: values.expirationDate,
      cost: values.cost as number | undefined,
    });
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('projects.editProject')}
      size="lg"
      actions={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            {t('common.cancel')}
          </Button>
          <Button variant="primary" onClick={onFormSubmit} loading={loading}>
            {t('common.save')}
          </Button>
        </>
      }
    >
      <form
        onSubmit={onFormSubmit}
        className="flex flex-col gap-4"
        noValidate
      >
        <Input
          label={t('projects.projectName')}
          placeholder={t('projects.projectNamePlaceholder')}
          error={
            errors.name?.message
              ? t(errors.name.message, { min: 3, max: 200 })
              : undefined
          }
          {...register('name')}
        />

        <Select
          label={t('projects.status')}
          options={statusOptions}
          {...register('status')}
        />

        <DatePicker
          label={t('projects.contractDate')}
          error={
            errors.contractDate?.message
              ? t(errors.contractDate.message)
              : undefined
          }
          {...register('contractDate')}
        />

        <DatePicker
          label={t('projects.expirationDate')}
          error={
            errors.expirationDate?.message
              ? t(errors.expirationDate.message, {
                  date: t('projects.contractDate'),
                })
              : undefined
          }
          {...register('expirationDate')}
        />

        <Input
          label={`${t('payments.projectCost')} (RUB)`}
          type="number"
          placeholder="0.00"
          min={0}
          step={0.01}
          {...register('cost')}
        />
      </form>
    </Modal>
  );
}

// ─── Main component (delegates to create/edit) ──────────────────────────────

export default function ProjectForm({
  isOpen,
  onClose,
  onSubmitCreate,
  onSubmitEdit,
  mode,
  defaultValues,
  loading = false,
}: ProjectFormProps) {
  // Fetch dropdown data (only used by create form, but safe to call unconditionally)
  const { data: companiesResponse } = useCompanies();
  const { data: usersResponse } = useUsers();
  const { data: projectsResponse } = useProjects();

  const customerOptions = useMemo(() => {
    const companies = companiesResponse?.data ?? [];
    return companies
      .filter((c: Company) => c.type === 'Customer')
      .map((c: Company) => ({ value: c.id, label: c.name }));
  }, [companiesResponse]);

  const managerOptions = useMemo(() => {
    const users = usersResponse?.data ?? [];
    return users
      .filter((u) => u.role === 'Admin' || u.role === 'Manager')
      .map((u) => ({ value: u.id, label: `${u.firstName} ${u.lastName}` }));
  }, [usersResponse]);

  const mainProjectOptions = useMemo(() => {
    const projects = projectsResponse?.data ?? [];
    return projects
      .filter((p: Project) => p.type === 'main')
      .map((p: Project) => ({ value: p.id, label: p.name }));
  }, [projectsResponse]);

  if (mode === 'create') {
    return (
      <CreateFormBody
        isOpen={isOpen}
        onClose={onClose}
        onSubmit={onSubmitCreate ?? (() => {})}
        loading={loading}
        customerOptions={customerOptions}
        managerOptions={managerOptions}
        mainProjectOptions={mainProjectOptions}
      />
    );
  }

  return (
    <EditFormBody
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={onSubmitEdit ?? (() => {})}
      loading={loading}
      defaultValues={defaultValues}
    />
  );
}
