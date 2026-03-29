import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Modal, Button, Input, Select, DatePicker } from '@/shared/components';
import type { Expense, ExpenseCategory } from '@/shared/types';

// ─── Constants ───────────────────────────────────────────────────────────────

const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Salary',
  'IncomeTax',
  'InsuranceContrib',
  'SocialInsurance',
  'SimplifiedTax',
  'VAT',
  'Penalty',
  'IndividualTax',
  'Rent',
  'Services',
  'Other',
] as const;

// ─── Schema ──────────────────────────────────────────────────────────────────

const expenseSchema = z.object({
  date: z.string().min(1, 'validation.required'),
  amount: z
    .number({ invalid_type_error: 'validation.number' })
    .positive('validation.positive'),
  vatAmount: z
    .number({ invalid_type_error: 'validation.number' })
    .min(0, 'validation.positive')
    .nullable()
    .optional()
    .transform((v) => v ?? null),
  category: z.enum([
    'Salary',
    'IncomeTax',
    'InsuranceContrib',
    'SocialInsurance',
    'SimplifiedTax',
    'VAT',
    'Penalty',
    'IndividualTax',
    'Rent',
    'Services',
    'Other',
  ] as const),
  description: z.string().optional(),
});

export type ExpenseFormValues = z.infer<typeof expenseSchema>;

// ─── Props ───────────────────────────────────────────────────────────────────

interface ExpenseFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: ExpenseFormValues) => void;
  mode: 'create' | 'edit';
  defaultValues?: Expense | null;
  loading?: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ExpenseForm({
  isOpen,
  onClose,
  onSubmit,
  mode,
  defaultValues,
  loading = false,
}: ExpenseFormProps) {
  const { t } = useTranslation();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      date: todayISO(),
      amount: 0,
      vatAmount: null,
      category: 'Salary' as ExpenseCategory,
      description: '',
    },
  });

  // Reset form when opening or switching between create/edit
  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && defaultValues) {
        reset({
          date: defaultValues.date.slice(0, 10),
          amount: defaultValues.amount,
          vatAmount: defaultValues.vatAmount,
          category: defaultValues.category,
          description: defaultValues.description ?? '',
        });
      } else {
        reset({
          date: todayISO(),
          amount: 0,
          vatAmount: null,
          category: 'Salary',
          description: '',
        });
      }
    }
  }, [isOpen, mode, defaultValues, reset]);

  const title =
    mode === 'create'
      ? t('expenses.addExpense')
      : t('expenses.editExpense');

  const submitLabel =
    mode === 'create' ? t('common.create') : t('common.save');

  const categoryOptions = EXPENSE_CATEGORIES.map((cat) => ({
    value: cat,
    label: t(`expenses.categories.${cat}`),
  }));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="md"
      actions={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
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
        <DatePicker
          label={t('expenses.date')}
          error={errors.date?.message ? t(errors.date.message) : undefined}
          {...register('date')}
        />

        <Input
          label={t('expenses.amount')}
          type="number"
          step="0.01"
          min="0"
          placeholder={t('expenses.enterAmount')}
          error={errors.amount?.message ? t(errors.amount.message) : undefined}
          {...register('amount', { valueAsNumber: true })}
        />

        <Input
          label={t('expenses.vatAmount')}
          type="number"
          step="0.01"
          min="0"
          placeholder={t('common.optional')}
          error={
            errors.vatAmount?.message ? t(errors.vatAmount.message) : undefined
          }
          {...register('vatAmount', { valueAsNumber: true })}
        />

        <Select
          label={t('expenses.category')}
          options={categoryOptions}
          error={
            errors.category?.message ? t(errors.category.message) : undefined
          }
          {...register('category')}
        />

        <div className="flex flex-col gap-1">
          <label
            htmlFor="expense-description"
            className="text-sm font-medium text-brown-800"
          >
            {t('expenses.description')}
          </label>
          <textarea
            id="expense-description"
            rows={3}
            placeholder={t('expenses.enterDescription')}
            className="
              bg-cream-50 border border-brown-200 rounded px-3 py-2
              text-brown-900 text-sm
              placeholder:text-brown-400
              transition-colors duration-200
              focus:border-brown-500 focus:ring-1 focus:ring-brown-500
              focus:outline-none
              resize-none
            "
            {...register('description')}
          />
        </div>
      </form>
    </Modal>
  );
}
