import { useState, useMemo, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { type ColumnDef } from '@tanstack/react-table';
import toast from 'react-hot-toast';
import {
  Table,
  Badge,
  Button,
  Modal,
  Input,
  Select,
  DatePicker,
  ConfirmDialog,
} from '@/shared/components';
import { useAuth } from '@/shared/auth/AuthContext';
import type { Project, PaymentSchedule, PaymentType } from '@/shared/types';
import {
  usePayments,
  useCreatePayment,
  useMarkPaid,
  useDeletePayment,
  type CreatePaymentPayload,
} from '../hooks/usePayments';

// ─── Schema ─────────────────────────────────────────────────────────────────

const paymentSchema = z.object({
  type: z.enum(['Advance', 'MainPayment', 'FinalPayment', 'Other'] as const),
  name: z.string().min(1, 'payments.nameRequired'),
  amount: z
    .union([z.string(), z.number()])
    .transform((val) => {
      const num = typeof val === 'string' ? parseFloat(val) : val;
      return isNaN(num) ? 0 : num;
    })
    .pipe(z.number().positive('payments.amountPositive')),
  expectedDate: z.string().min(1, 'payments.expectedDateRequired'),
  description: z.string().optional(),
});

type PaymentFormValues = z.input<typeof paymentSchema>;

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return '--';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '--';
  return d.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'decimal',
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  })
    .format(amount)
    .replace(/\s/g, '\u00A0')
    .concat('\u00A0\u0440.');
}

function isOverdue(payment: PaymentSchedule): boolean {
  if (payment.isPaid) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expected = new Date(payment.expectedDate);
  expected.setHours(0, 0, 0, 0);
  return expected < today;
}

// ─── Icons ──────────────────────────────────────────────────────────────────

function CheckCircleIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.519.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
    </svg>
  );
}

// ─── Payment type badge variant ─────────────────────────────────────────────

function paymentTypeBadgeVariant(type: PaymentType): 'info' | 'warning' | 'success' | 'neutral' {
  switch (type) {
    case 'Advance':
      return 'warning';
    case 'MainPayment':
      return 'info';
    case 'FinalPayment':
      return 'success';
    case 'Other':
      return 'neutral';
  }
}

// ─── Props ──────────────────────────────────────────────────────────────────

interface PaymentScheduleTabProps {
  project: Project;
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function PaymentScheduleTab({ project }: PaymentScheduleTabProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const canManage = user?.role === 'Admin' || user?.role === 'Manager';

  // ─── Data ───────────────────────────────────────────────────────────
  const { data: paymentsResponse, isLoading } = usePayments(project.id);
  const createMutation = useCreatePayment();
  const markPaidMutation = useMarkPaid();
  const deleteMutation = useDeletePayment();

  const payments = paymentsResponse?.data ?? [];

  // ─── Modal states ──────────────────────────────────────────────────
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<PaymentSchedule | null>(null);

  // ─── Add payment form ─────────────────────────────────────────────
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      type: 'Advance' as PaymentType,
      name: '',
      amount: '',
      expectedDate: '',
      description: '',
    },
  });

  const handleOpenAdd = useCallback(() => {
    reset({
      type: 'Advance',
      name: '',
      amount: '',
      expectedDate: '',
      description: '',
    });
    setAddModalOpen(true);
  }, [reset]);

  const handleAddSubmit = handleSubmit((values) => {
    const payload: CreatePaymentPayload = {
      projectId: project.id,
      type: values.type as PaymentType,
      name: values.name as string,
      amount: values.amount as number,
      expectedDate: values.expectedDate as string,
      description: (values.description as string) || undefined,
    };

    createMutation.mutate(payload, {
      onSuccess: () => {
        setAddModalOpen(false);
        toast.success(t('payments.addSuccess'));
      },
      onError: () => {
        toast.error(t('payments.addError'));
      },
    });
  });

  // ─── Mark paid ────────────────────────────────────────────────────
  const handleMarkPaid = useCallback(
    (payment: PaymentSchedule) => {
      markPaidMutation.mutate(
        { paymentId: payment.id, projectId: project.id },
        {
          onSuccess: () => toast.success(t('payments.markPaidSuccess')),
          onError: () => toast.error(t('payments.markPaidError')),
        },
      );
    },
    [markPaidMutation, project.id, t],
  );

  // ─── Delete ───────────────────────────────────────────────────────
  const handleOpenDelete = useCallback((payment: PaymentSchedule) => {
    setPaymentToDelete(payment);
    setDeleteDialogOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (!paymentToDelete) return;
    deleteMutation.mutate(
      { paymentId: paymentToDelete.id, projectId: project.id },
      {
        onSuccess: () => {
          setDeleteDialogOpen(false);
          setPaymentToDelete(null);
          toast.success(t('payments.deleteSuccess'));
        },
        onError: () => {
          toast.error(t('payments.deleteError'));
        },
      },
    );
  }, [paymentToDelete, deleteMutation, project.id, t]);

  // ─── Summary ──────────────────────────────────────────────────────
  const summary = useMemo(() => {
    const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);
    const totalPercentage =
      project.cost && project.cost > 0
        ? (totalAmount / project.cost) * 100
        : 0;
    return { totalAmount, totalPercentage };
  }, [payments, project.cost]);

  // ─── Type select options ──────────────────────────────────────────
  const typeOptions = [
    { value: 'Advance', label: t('payments.types.advance') },
    { value: 'MainPayment', label: t('payments.types.mainpayment') },
    { value: 'FinalPayment', label: t('payments.types.finalpayment') },
    { value: 'Other', label: t('payments.types.other') },
  ];

  // ─── Table columns ────────────────────────────────────────────────
  const columns = useMemo<ColumnDef<PaymentSchedule, unknown>[]>(() => {
    const cols: ColumnDef<PaymentSchedule, unknown>[] = [
      {
        accessorKey: 'type',
        header: t('payments.type'),
        size: 90,
        cell: ({ getValue }) => {
          const type = getValue<PaymentType>();
          const typeKey = type.toLowerCase() as keyof typeof t;
          return (
            <Badge variant={paymentTypeBadgeVariant(type)}>
              {t(`payments.types.${type.toLowerCase()}`)}
            </Badge>
          );
        },
      },
      {
        accessorKey: 'name',
        header: t('payments.name'),
        cell: ({ row }) => (
          <div>
            <span className="font-medium text-[#22150d]">
              {row.original.name}
            </span>
            {row.original.description && (
              <p className="text-xs text-[#7d6b5d] mt-0.5 truncate max-w-[200px]">
                {row.original.description}
              </p>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'amount',
        header: t('payments.amount'),
        size: 120,
        cell: ({ row }) => {
          const payment = row.original;
          const percentage =
            project.cost && project.cost > 0
              ? ((payment.amount / project.cost) * 100).toFixed(1)
              : null;
          return (
            <div className="text-right tabular-nums">
              <span className="font-medium">
                {formatCurrency(payment.amount)}
              </span>
              {percentage && (
                <span className="text-xs text-[#7d6b5d] ml-1">
                  ({percentage}%)
                </span>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: 'expectedDate',
        header: t('payments.expectedDate'),
        size: 110,
        cell: ({ row }) => {
          const payment = row.original;
          const overdue = isOverdue(payment);
          return (
            <div>
              <span
                className={`tabular-nums ${
                  overdue ? 'text-[#8b3a2a] font-medium' : 'text-[#5c4a3e]'
                }`}
              >
                {formatDate(payment.expectedDate)}
              </span>
              {payment.isPaid && payment.actualDate && (
                <p className="text-xs text-[#7d6b5d] mt-0.5 tabular-nums">
                  {t('payments.paidDate')}: {formatDate(payment.actualDate)}
                </p>
              )}
            </div>
          );
        },
      },
      {
        id: 'status',
        header: t('payments.status'),
        size: 100,
        cell: ({ row }) => {
          const payment = row.original;
          if (payment.isPaid) {
            return <Badge variant="success">{t('payments.paid')}</Badge>;
          }
          if (isOverdue(payment)) {
            return <Badge variant="danger">{t('payments.overdue')}</Badge>;
          }
          return <Badge variant="warning">{t('payments.pending')}</Badge>;
        },
        accessorFn: (row) => {
          if (row.isPaid) return 'Paid';
          if (isOverdue(row)) return 'Overdue';
          return 'Pending';
        },
      },
    ];

    // Actions column (Admin/Manager only)
    if (canManage) {
      cols.push({
        id: 'actions',
        header: t('common.actions'),
        size: 100,
        enableSorting: false,
        cell: ({ row }) => {
          const payment = row.original;
          return (
            <div className="flex items-center justify-end gap-1">
              {/* Mark as Paid button */}
              {!payment.isPaid && (
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[0.4rem] border border-[rgba(75,108,56,0.25)] text-[#3d5a2a] text-xs font-medium hover:bg-[rgba(75,108,56,0.08)] hover:border-[rgba(75,108,56,0.40)] transition-colors duration-150 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMarkPaid(payment);
                  }}
                  disabled={markPaidMutation.isPending}
                >
                  <CheckCircleIcon />
                  {t('payments.markPaid')}
                </button>
              )}
              {/* Delete button */}
              <button
                type="button"
                className="inline-flex items-center justify-center w-8 h-8 rounded text-[#7d6b5d] hover:text-[#8b3a2a] hover:bg-[rgba(156,60,40,0.08)] transition-colors duration-150 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenDelete(payment);
                }}
                aria-label={t('common.delete')}
              >
                <TrashIcon />
              </button>
            </div>
          );
        },
      });
    }

    return cols;
  }, [t, canManage, project.cost, handleMarkPaid, handleOpenDelete, markPaidMutation.isPending]);

  // ─── Mobile card renderer ─────────────────────────────────────────
  const renderMobileCard = useCallback(
    (payment: PaymentSchedule) => {
      const overdue = isOverdue(payment);
      const statusVariant = payment.isPaid
        ? 'success'
        : overdue
          ? 'danger'
          : 'warning';
      const statusLabel = payment.isPaid
        ? t('payments.paid')
        : overdue
          ? t('payments.overdue')
          : t('payments.pending');

      return (
        <div
          className={`bg-[#fdfaf0] border rounded-xl p-4 ${
            overdue && !payment.isPaid
              ? 'border-[rgba(156,60,40,0.25)]'
              : 'border-[rgba(34,21,13,0.15)]'
          }`}
        >
          <div className="flex items-start justify-between gap-2 mb-2">
            <Badge variant={paymentTypeBadgeVariant(payment.type)}>
              {t(`payments.types.${payment.type.toLowerCase()}`)}
            </Badge>
            <Badge variant={statusVariant}>{statusLabel}</Badge>
          </div>
          <p className="font-medium text-[#22150d] text-sm mb-1">
            {payment.name}
          </p>
          <p className="text-sm font-medium tabular-nums text-[#22150d] mb-1">
            {formatCurrency(payment.amount)}
          </p>
          <p
            className={`text-xs tabular-nums ${
              overdue ? 'text-[#8b3a2a] font-medium' : 'text-[#7d6b5d]'
            }`}
          >
            {t('payments.expectedDate')}: {formatDate(payment.expectedDate)}
          </p>
          {payment.isPaid && payment.actualDate && (
            <p className="text-xs text-[#7d6b5d] tabular-nums">
              {t('payments.paidDate')}: {formatDate(payment.actualDate)}
            </p>
          )}

          {canManage && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[rgba(34,21,13,0.10)]">
              {!payment.isPaid && (
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-xs text-[#3d5a2a] hover:text-green-800 transition-colors cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMarkPaid(payment);
                  }}
                >
                  <CheckCircleIcon />
                  {t('payments.markPaid')}
                </button>
              )}
              <button
                type="button"
                className="inline-flex items-center gap-1 text-xs text-[#8b3a2a] hover:text-red-800 transition-colors cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenDelete(payment);
                }}
              >
                <TrashIcon />
                {t('common.delete')}
              </button>
            </div>
          )}
        </div>
      );
    },
    [t, canManage, handleMarkPaid, handleOpenDelete],
  );

  // ─── Render ────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4">
      {/* Header with Add button */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-[#22150d]">
          {t('payments.schedule')}
        </h3>
        {canManage && (
          <Button
            variant="primary"
            size="sm"
            icon={<PlusIcon />}
            onClick={handleOpenAdd}
          >
            {t('payments.addPayment')}
          </Button>
        )}
      </div>

      {/* Payment table */}
      <Table<PaymentSchedule>
        data={payments}
        columns={columns}
        isLoading={isLoading}
        sorting
        renderMobileCard={renderMobileCard}
        emptyState={{
          title: t('payments.noPayments'),
        }}
      />

      {/* Summary row */}
      {payments.length > 0 && (
        <div className="bg-[#f5ecd4] border border-[rgba(34,21,13,0.15)] rounded-xl px-4 py-3 flex flex-wrap items-center justify-end gap-6 text-sm">
          {project.cost != null && (
            <span className="text-[#5c4a3e]">
              {t('payments.projectCost')}:{' '}
              <span className="font-semibold tabular-nums text-[#22150d]">
                {formatCurrency(project.cost)}
              </span>
            </span>
          )}
          <span className="text-[#5c4a3e]">
            {t('payments.totalAmount')}:{' '}
            <span className="font-semibold tabular-nums text-[#22150d]">
              {formatCurrency(summary.totalAmount)}
            </span>
          </span>
          {project.cost != null && project.cost > 0 && (
            <span className="text-[#5c4a3e]">
              {t('payments.totalPercentage')}:{' '}
              <span className="font-semibold tabular-nums text-[#22150d]">
                {summary.totalPercentage.toFixed(1)}%
              </span>
            </span>
          )}
        </div>
      )}

      {/* Add Payment Modal */}
      <Modal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title={t('payments.addPayment')}
        size="md"
        actions={
          <>
            <Button
              variant="ghost"
              onClick={() => setAddModalOpen(false)}
              disabled={createMutation.isPending}
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="primary"
              onClick={handleAddSubmit}
              loading={createMutation.isPending}
            >
              {t('common.create')}
            </Button>
          </>
        }
      >
        <form
          onSubmit={handleAddSubmit}
          className="flex flex-col gap-4"
          noValidate
        >
          <Select
            label={t('payments.paymentType')}
            options={typeOptions}
            {...register('type')}
          />
          <Input
            label={t('payments.paymentName')}
            placeholder={t('payments.paymentNamePlaceholder')}
            error={
              errors.name?.message ? t(errors.name.message) : undefined
            }
            {...register('name')}
          />
          <Input
            label={`${t('payments.amount')} (RUB)`}
            type="number"
            placeholder={t('payments.amountPlaceholder')}
            min={0}
            step={0.01}
            error={
              errors.amount?.message ? t(errors.amount.message) : undefined
            }
            {...register('amount')}
          />
          <DatePicker
            label={t('payments.expectedDate')}
            error={
              errors.expectedDate?.message
                ? t(errors.expectedDate.message)
                : undefined
            }
            {...register('expectedDate')}
          />
          <div className="flex flex-col gap-1">
            <label
              htmlFor="payment-description"
              className="text-sm font-medium text-brown-800"
            >
              {t('payments.description')}
            </label>
            <textarea
              id="payment-description"
              className="bg-cream-50 border border-brown-200 rounded px-3 py-2 text-brown-900 text-sm placeholder:text-brown-400 transition-colors duration-200 min-h-[80px] focus:border-brown-500 focus:ring-1 focus:ring-brown-500 focus:outline-none resize-y"
              placeholder={t('payments.descriptionPlaceholder')}
              {...register('description')}
            />
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        title={t('payments.deletePayment')}
        message={t('payments.deleteConfirm')}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
