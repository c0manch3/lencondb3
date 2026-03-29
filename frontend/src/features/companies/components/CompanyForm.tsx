import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Modal, Button, Input, Select } from '@/shared/components';
import type { Company, CompanyType } from '@/shared/types';

// ─── Schema ─────────────────────────────────────────────────────────────────

const companySchema = z.object({
  name: z.string().min(1, 'validation.required'),
  type: z.enum(['Customer', 'Contractor'] as const),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
      { message: 'validation.email' },
    ),
  postalCode: z.string().optional(),
});

type CompanyFormValues = z.infer<typeof companySchema>;

// ─── Props ──────────────────────────────────────────────────────────────────

interface CompanyFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: CompanyFormValues) => void;
  mode: 'create' | 'edit';
  defaultValues?: Company | null;
  loading?: boolean;
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function CompanyForm({
  isOpen,
  onClose,
  onSubmit,
  mode,
  defaultValues,
  loading = false,
}: CompanyFormProps) {
  const { t } = useTranslation();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: '',
      type: 'Customer' as CompanyType,
      address: '',
      phone: '',
      email: '',
      postalCode: '',
    },
  });

  // Reset form when opening or switching between create/edit
  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && defaultValues) {
        reset({
          name: defaultValues.name,
          type: defaultValues.type,
          address: defaultValues.address ?? '',
          phone: defaultValues.phone ?? '',
          email: defaultValues.email ?? '',
          postalCode: defaultValues.postalCode ?? '',
        });
      } else {
        reset({
          name: '',
          type: 'Customer',
          address: '',
          phone: '',
          email: '',
          postalCode: '',
        });
      }
    }
  }, [isOpen, mode, defaultValues, reset]);

  const title = mode === 'create'
    ? t('companies.createCompany')
    : t('companies.editCompany');

  const submitLabel = mode === 'create'
    ? t('common.create')
    : t('common.save');

  const typeOptions = [
    { value: 'Customer', label: t('companies.customer') },
    { value: 'Contractor', label: t('companies.contractor') },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="md"
      actions={
        <>
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={loading}
          >
            {t('common.cancel')}
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit(onSubmit)}
            loading={loading}
          >
            {submitLabel}
          </Button>
        </>
      }
    >
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
        noValidate
      >
        <Input
          label={t('companies.companyName')}
          placeholder={t('companies.companyNamePlaceholder')}
          error={errors.name?.message ? t(errors.name.message) : undefined}
          {...register('name')}
        />

        <Select
          label={t('companies.type')}
          options={typeOptions}
          error={errors.type?.message ? t(errors.type.message) : undefined}
          {...register('type')}
        />

        <Input
          label={t('companies.address')}
          placeholder={t('companies.addressPlaceholder')}
          error={errors.address?.message ? t(errors.address.message) : undefined}
          {...register('address')}
        />

        <Input
          label={t('companies.phone')}
          placeholder={t('companies.phonePlaceholder')}
          error={errors.phone?.message ? t(errors.phone.message) : undefined}
          {...register('phone')}
        />

        <Input
          label={t('companies.email')}
          type="email"
          placeholder={t('companies.emailPlaceholder')}
          error={errors.email?.message ? t(errors.email.message) : undefined}
          {...register('email')}
        />

        {mode === 'edit' && (
          <Input
            label={t('companies.postalCode')}
            placeholder={t('companies.postalCodePlaceholder')}
            error={errors.postalCode?.message ? t(errors.postalCode.message) : undefined}
            {...register('postalCode')}
          />
        )}
      </form>
    </Modal>
  );
}
