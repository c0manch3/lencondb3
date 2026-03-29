import { useState, useMemo, useCallback, useRef, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { type ColumnDef } from '@tanstack/react-table';
import toast from 'react-hot-toast';

import {
  Table,
  Button,
  Badge,
  Select,
  DatePicker,
  Pagination,
  ConfirmDialog,
} from '@/shared/components';
import type { Expense, ExpenseCategory } from '@/shared/types';
import {
  useExpenses,
  useCreateExpense,
  useUpdateExpense,
  useDeleteExpense,
  useImportExpenses,
  useExportExpenses,
  useOverdueSummary,
  type ExpenseFilters,
} from './hooks/useExpenses';
import ExpenseForm, { type ExpenseFormValues } from './components/ExpenseForm';
import OverdueBanner from './components/OverdueBanner';

// ─── Constants ───────────────────────────────────────────────────────────────

const PAGE_SIZE = 25;

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
];

/**
 * Category-to-badge variant mapping.
 * Uses the warm palette from the design system with appropriate semantic tones.
 */
const CATEGORY_BADGE_VARIANT: Record<ExpenseCategory, string> = {
  Salary: 'warning',          // warm gold
  IncomeTax: 'danger',        // warm red
  InsuranceContrib: 'warning',// amber
  SocialInsurance: 'info',    // teal-ish warm
  SimplifiedTax: 'neutral',   // muted brown
  VAT: 'danger',              // red (tax)
  Penalty: 'danger',          // red (penalty)
  IndividualTax: 'neutral',   // muted brown
  Rent: 'info',               // teal warm
  Services: 'info',           // teal warm
  Other: 'neutral',           // muted
} as const;

// ─── Icons ───────────────────────────────────────────────────────────────────

function PlusIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(value: number | null | undefined): string {
  if (value == null) return '\u2014';
  return value.toLocaleString('ru-RU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }) + ' \u0440.';
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Groups expenses by month (YYYY-MM) and computes monthly totals.
 * Returns the groups in the same order they appear in the data (server sorts by date desc).
 */
interface MonthGroup {
  key: string;       // e.g. "2026-03"
  label: string;     // e.g. "Март 2026"
  total: number;
  expenses: Expense[];
}

function groupByMonth(expenses: Expense[]): MonthGroup[] {
  const map = new Map<string, MonthGroup>();

  for (const expense of expenses) {
    const date = new Date(expense.date);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    if (!map.has(key)) {
      const label = date.toLocaleDateString('ru-RU', {
        month: 'long',
        year: 'numeric',
      });
      // Capitalize first letter
      map.set(key, {
        key,
        label: label.charAt(0).toUpperCase() + label.slice(1),
        total: 0,
        expenses: [],
      });
    }

    const group = map.get(key)!;
    group.total += expense.amount;
    group.expenses.push(expense);
  }

  return Array.from(map.values());
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ExpensesPage() {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Filter state (applied on "Apply") ─────────────────────────────
  const [page, setPage] = useState(1);
  const [filterCategory, setFilterCategory] = useState<ExpenseCategory | ''>('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // Draft filters (before "Apply")
  const [draftCategory, setDraftCategory] = useState<ExpenseCategory | ''>('');
  const [draftStartDate, setDraftStartDate] = useState('');
  const [draftEndDate, setDraftEndDate] = useState('');

  const filters: ExpenseFilters = useMemo(
    () => ({
      page,
      limit: PAGE_SIZE,
      category: filterCategory || undefined,
      startDate: filterStartDate || undefined,
      endDate: filterEndDate || undefined,
    }),
    [page, filterCategory, filterStartDate, filterEndDate],
  );

  // ─── Data ──────────────────────────────────────────────────────────
  const { data: expensesResponse, isLoading } = useExpenses(filters);
  const createMutation = useCreateExpense();
  const updateMutation = useUpdateExpense();
  const deleteMutation = useDeleteExpense();
  const importMutation = useImportExpenses();
  const exportMutation = useExportExpenses();
  const { data: overdueSummary, isLoading: overdueLoading } = useOverdueSummary();

  const expenses = expensesResponse?.data ?? [];
  const total = expensesResponse?.total ?? 0;

  // ─── Month grouping ────────────────────────────────────────────────
  const monthGroups = useMemo(() => groupByMonth(expenses), [expenses]);

  // ─── Modal state ───────────────────────────────────────────────────
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);

  // ─── Filter handlers ───────────────────────────────────────────────
  const handleApplyFilters = useCallback(() => {
    setFilterCategory(draftCategory);
    setFilterStartDate(draftStartDate);
    setFilterEndDate(draftEndDate);
    setPage(1);
  }, [draftCategory, draftStartDate, draftEndDate]);

  const handleResetFilters = useCallback(() => {
    setDraftCategory('');
    setDraftStartDate('');
    setDraftEndDate('');
    setFilterCategory('');
    setFilterStartDate('');
    setFilterEndDate('');
    setPage(1);
  }, []);

  // ─── Form handlers ────────────────────────────────────────────────
  const handleOpenCreate = useCallback(() => {
    setEditingExpense(null);
    setFormMode('create');
    setFormOpen(true);
  }, []);

  const handleOpenEdit = useCallback((expense: Expense) => {
    setEditingExpense(expense);
    setFormMode('edit');
    setFormOpen(true);
  }, []);

  const handleFormSubmit = useCallback(
    (values: ExpenseFormValues) => {
      if (formMode === 'create') {
        createMutation.mutate(
          {
            date: values.date,
            amount: values.amount,
            vatAmount: values.vatAmount,
            category: values.category,
            description: values.description || undefined,
          },
          {
            onSuccess: () => {
              setFormOpen(false);
              toast.success(t('expenses.expenseCreated'));
            },
            onError: () => {
              toast.error(t('expenses.createError'));
            },
          },
        );
      } else if (editingExpense) {
        updateMutation.mutate(
          {
            id: editingExpense.id,
            date: values.date,
            amount: values.amount,
            vatAmount: values.vatAmount,
            category: values.category,
            description: values.description || undefined,
          },
          {
            onSuccess: () => {
              setFormOpen(false);
              toast.success(t('expenses.expenseUpdated'));
            },
            onError: () => {
              toast.error(t('expenses.updateError'));
            },
          },
        );
      }
    },
    [formMode, editingExpense, createMutation, updateMutation, t],
  );

  // ─── Delete handlers ──────────────────────────────────────────────
  const handleOpenDelete = useCallback((expense: Expense) => {
    setExpenseToDelete(expense);
    setDeleteDialogOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (!expenseToDelete) return;
    deleteMutation.mutate(expenseToDelete.id, {
      onSuccess: () => {
        setDeleteDialogOpen(false);
        setExpenseToDelete(null);
        toast.success(t('expenses.expenseDeleted'));
      },
      onError: () => {
        toast.error(t('expenses.deleteError'));
      },
    });
  }, [expenseToDelete, deleteMutation, t]);

  // ─── Import handler ────────────────────────────────────────────────
  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      importMutation.mutate(file, {
        onSuccess: (result) => {
          const parts: string[] = [];
          if (result.imported > 0) {
            parts.push(t('expenses.importSuccess', { count: result.imported }));
          }
          if (result.errors.length > 0) {
            parts.push(
              t('expenses.importErrors', { count: result.errors.length }),
            );
          }
          toast.success(parts.join('. ') || t('common.success'));
        },
        onError: () => {
          toast.error(t('expenses.importError'));
        },
      });

      // Reset input so the same file can be re-selected
      e.target.value = '';
    },
    [importMutation, t],
  );

  // ─── Export handler ────────────────────────────────────────────────
  const handleExport = useCallback(() => {
    exportMutation.mutate(
      {
        category: filterCategory || undefined,
        startDate: filterStartDate || undefined,
        endDate: filterEndDate || undefined,
      },
      {
        onError: () => {
          toast.error(t('expenses.exportError'));
        },
      },
    );
  }, [exportMutation, filterCategory, filterStartDate, filterEndDate, t]);

  // ─── Category filter options ───────────────────────────────────────
  const categoryFilterOptions = useMemo(
    () => [
      { value: '', label: t('expenses.allCategories') },
      ...EXPENSE_CATEGORIES.map((cat) => ({
        value: cat,
        label: t(`expenses.categories.${cat}`),
      })),
    ],
    [t],
  );

  // ─── Table columns ────────────────────────────────────────────────
  const columns = useMemo<ColumnDef<Expense, unknown>[]>(
    () => [
      {
        accessorKey: 'date',
        header: t('expenses.date'),
        size: 100,
        cell: ({ getValue }) => (
          <span className="text-[#22150d] tabular-nums">
            {formatDate(getValue<string>())}
          </span>
        ),
      },
      {
        accessorKey: 'amount',
        header: t('expenses.amount'),
        size: 120,
        cell: ({ getValue }) => (
          <span className="text-right tabular-nums font-medium block text-[#22150d]">
            {formatCurrency(getValue<number>())}
          </span>
        ),
      },
      {
        accessorKey: 'vatAmount',
        header: t('expenses.vatAmount'),
        size: 90,
        enableSorting: false,
        cell: ({ getValue }) => (
          <span className="text-right tabular-nums block text-[#5c4a3e]">
            {formatCurrency(getValue<number | null>())}
          </span>
        ),
      },
      {
        accessorKey: 'category',
        header: t('expenses.category'),
        size: 110,
        cell: ({ getValue }) => {
          const category = getValue<ExpenseCategory>();
          const variant = CATEGORY_BADGE_VARIANT[category] as
            | 'warning'
            | 'danger'
            | 'info'
            | 'neutral';
          return (
            <Badge variant={variant}>
              {t(`expenses.categories.${category}`)}
            </Badge>
          );
        },
      },
      {
        accessorKey: 'description',
        header: t('expenses.description'),
        enableSorting: false,
        cell: ({ getValue }) => (
          <span className="text-[#5c4a3e] truncate block max-w-[240px]">
            {getValue<string | null>() || '\u2014'}
          </span>
        ),
      },
      {
        id: 'actions',
        header: t('expenses.actions'),
        size: 80,
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1">
            <button
              type="button"
              className="inline-flex items-center justify-center w-8 h-8 rounded text-brown-400 hover:text-brown-900 hover:bg-cream-200 transition-colors cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenEdit(row.original);
              }}
              aria-label={t('common.edit')}
            >
              <PencilIcon />
            </button>
            <button
              type="button"
              className="inline-flex items-center justify-center w-8 h-8 rounded text-brown-400 hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenDelete(row.original);
              }}
              aria-label={t('common.delete')}
            >
              <TrashIcon />
            </button>
          </div>
        ),
      },
    ],
    [t, handleOpenEdit, handleOpenDelete],
  );

  // ─── Mobile card renderer ──────────────────────────────────────────
  const renderMobileCard = useCallback(
    (expense: Expense) => {
      const variant = CATEGORY_BADGE_VARIANT[expense.category] as
        | 'warning'
        | 'danger'
        | 'info'
        | 'neutral';
      return (
        <div className="bg-cream-50 border border-brown-200 rounded-xl p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <span className="text-sm font-semibold text-brown-900 tabular-nums">
                {formatCurrency(expense.amount)}
              </span>
              <span className="text-xs text-[#7d6b5d] ml-2 tabular-nums">
                {formatDate(expense.date)}
              </span>
            </div>
            <Badge variant={variant}>
              {t(`expenses.categories.${expense.category}`)}
            </Badge>
          </div>

          {expense.vatAmount != null && (
            <p className="text-xs text-[#7d6b5d] mb-1">
              {t('expenses.vatAmount')}: {formatCurrency(expense.vatAmount)}
            </p>
          )}

          {expense.description && (
            <p className="text-xs text-[#5c4a3e] truncate">{expense.description}</p>
          )}

          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-brown-100">
            <button
              type="button"
              className="inline-flex items-center gap-1 text-xs text-brown-600 hover:text-brown-900 transition-colors cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenEdit(expense);
              }}
            >
              <PencilIcon />
              {t('common.edit')}
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-800 transition-colors cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenDelete(expense);
              }}
            >
              <TrashIcon />
              {t('common.delete')}
            </button>
          </div>
        </div>
      );
    },
    [t, handleOpenEdit, handleOpenDelete],
  );

  // ─── Render ────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6">
      {/* Overdue banner */}
      <OverdueBanner summary={overdueSummary} isLoading={overdueLoading} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-brown-900">
          {t('expenses.title')}
        </h1>

        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="primary" icon={<PlusIcon />} onClick={handleOpenCreate}>
            {t('expenses.addExpense')}
          </Button>
          <Button
            variant="secondary"
            icon={<UploadIcon />}
            onClick={handleImportClick}
            loading={importMutation.isPending}
          >
            {t('expenses.import')}
          </Button>
          <Button
            variant="secondary"
            icon={<DownloadIcon />}
            onClick={handleExport}
            loading={exportMutation.isPending}
          >
            {t('expenses.export')}
          </Button>
        </div>

        {/* Hidden file input for import */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={handleFileChange}
          className="hidden"
          aria-hidden="true"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-end gap-3">
        <div className="w-full sm:w-48">
          <Select
            label={t('expenses.category')}
            options={categoryFilterOptions}
            value={draftCategory}
            onChange={(e) => setDraftCategory(e.target.value as ExpenseCategory | '')}
          />
        </div>
        <div className="w-full sm:w-44">
          <DatePicker
            label={t('expenses.startDate')}
            value={draftStartDate}
            onChange={(e) => setDraftStartDate(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-44">
          <DatePicker
            label={t('expenses.endDate')}
            value={draftEndDate}
            onChange={(e) => setDraftEndDate(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="primary" size="md" onClick={handleApplyFilters}>
            {t('expenses.applyFilters')}
          </Button>
          <Button variant="ghost" size="md" onClick={handleResetFilters}>
            {t('expenses.resetFilters')}
          </Button>
        </div>
      </div>

      {/* Table with month grouping */}
      <div className="bg-[#fdfaf0] border border-[rgba(34,21,13,0.15)] rounded-xl overflow-hidden">
        {/* Desktop view */}
        <div className="hidden md:block overflow-x-auto">
          {isLoading ? (
            <Table<Expense>
              data={[]}
              columns={columns}
              isLoading
            />
          ) : expenses.length === 0 ? (
            <Table<Expense>
              data={[]}
              columns={columns}
              emptyState={{ title: t('expenses.noExpenses') }}
            />
          ) : (
            <div>
              {monthGroups.map((group) => (
                <div key={group.key}>
                  {/* Month header (sticky) */}
                  <div
                    className="bg-[#f0e7d0] px-4 py-2 text-[0.8125rem] font-semibold text-[#22150d] border-b border-[rgba(34,21,13,0.15)] flex justify-between items-center sticky top-0 z-[1]"
                  >
                    <span>{group.label}</span>
                    <span className="text-[#5c4a3e] font-medium">
                      {t('common.total')}: {formatCurrency(group.total)}
                    </span>
                  </div>

                  {/* Expense rows for this month */}
                  <table className="w-full">
                    <thead className="sr-only">
                      <tr>
                        {columns.map((col, i) => (
                          <th key={i}>
                            {typeof col.header === 'string' ? col.header : ''}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {group.expenses.map((expense) => (
                        <tr
                          key={expense.id}
                          className="border-b border-[rgba(34,21,13,0.10)] last:border-b-0 hover:bg-[rgba(34,21,13,0.04)] transition-colors duration-150"
                        >
                          <td className="px-4 py-3 text-sm align-middle" style={{ width: 100 }}>
                            <span className="text-[#22150d] tabular-nums">
                              {formatDate(expense.date)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm align-middle" style={{ width: 120 }}>
                            <span className="text-right tabular-nums font-medium block text-[#22150d]">
                              {formatCurrency(expense.amount)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm align-middle" style={{ width: 90 }}>
                            <span className="text-right tabular-nums block text-[#5c4a3e]">
                              {formatCurrency(expense.vatAmount)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm align-middle" style={{ width: 110 }}>
                            <Badge
                              variant={
                                CATEGORY_BADGE_VARIANT[expense.category] as
                                  | 'warning'
                                  | 'danger'
                                  | 'info'
                                  | 'neutral'
                              }
                            >
                              {t(`expenses.categories.${expense.category}`)}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-sm align-middle">
                            <span className="text-[#5c4a3e] truncate block max-w-[240px]">
                              {expense.description || '\u2014'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm align-middle" style={{ width: 80 }}>
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                className="inline-flex items-center justify-center w-8 h-8 rounded text-brown-400 hover:text-brown-900 hover:bg-cream-200 transition-colors cursor-pointer"
                                onClick={() => handleOpenEdit(expense)}
                                aria-label={t('common.edit')}
                              >
                                <PencilIcon />
                              </button>
                              <button
                                type="button"
                                className="inline-flex items-center justify-center w-8 h-8 rounded text-brown-400 hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer"
                                onClick={() => handleOpenDelete(expense)}
                                aria-label={t('common.delete')}
                              >
                                <TrashIcon />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Mobile view */}
        <div className="md:hidden">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[80, 65, 90, 55, 75].map((w, i) => (
                <div
                  key={i}
                  className="bg-[#fdfaf0] border border-[rgba(34,21,13,0.15)] rounded-xl p-4"
                >
                  <div
                    className="h-4 rounded bg-[rgba(34,21,13,0.06)] animate-pulse mb-2"
                    style={{ width: `${w}%` }}
                  />
                  <div className="h-3 rounded bg-[rgba(34,21,13,0.06)] animate-pulse w-1/2" />
                </div>
              ))}
            </div>
          ) : expenses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
              <p className="text-lg font-medium text-[#22150d]">
                {t('expenses.noExpenses')}
              </p>
            </div>
          ) : (
            <div className="p-3 space-y-2">
              {monthGroups.map((group) => (
                <div key={group.key}>
                  <div className="bg-[#f0e7d0] px-3 py-2 text-[0.8125rem] font-semibold text-[#22150d] rounded-[0.4rem] flex justify-between items-center mb-2">
                    <span>{group.label}</span>
                    <span className="text-[#5c4a3e] font-medium text-xs">
                      {formatCurrency(group.total)}
                    </span>
                  </div>
                  <div className="space-y-2 mb-4">
                    {group.expenses.map((expense) => (
                      <div key={expense.id}>
                        {renderMobileCard(expense)}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Server-side pagination */}
        {!isLoading && expenses.length > 0 && (
          <Pagination
            currentPage={page}
            totalItems={total}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
          />
        )}
      </div>

      {/* Expense Form Modal (Create / Edit) */}
      <ExpenseForm
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleFormSubmit}
        mode={formMode}
        defaultValues={editingExpense}
        loading={createMutation.isPending || updateMutation.isPending}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        title={t('expenses.deleteExpense')}
        message={t('expenses.confirmDelete')}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
