import { useEffect, useState, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { api } from '@/services/auth.service';
import toast from 'react-hot-toast';
import type { Expense, ExpenseCategory, PaginatedResponse } from '@/types';
import { useOverdueBadge } from '@/hooks/useOverdueBadge';

const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Salary', 'IncomeTax', 'InsuranceContrib', 'SocialInsurance',
  'SimplifiedTax', 'VAT', 'Penalty', 'IndividualTax',
  'Rent', 'Services', 'Other',
];

const PAGE_LIMIT = 25;

const getMonthKey = (dateStr: string): string => {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

interface ExpenseFormData {
  date: string;
  amount: string;
  vatAmount: string;
  category: ExpenseCategory;
  description: string;
}

const emptyForm: ExpenseFormData = {
  date: '',
  amount: '',
  vatAmount: '',
  category: 'Salary',
  description: '',
};

export default function ExpensesPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'en' ? 'en-US' : 'ru-RU';
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Overdue payments banner (Admin only — hook handles role check)
  const { count: overdueCount, totalAmount: overdueTotalAmount, projects: overdueProjects } = useOverdueBadge();
  const [bannerDismissed, setBannerDismissed] = useState(
    () => sessionStorage.getItem('overdueBannerDismissed') === 'true'
  );

  const formatCurrency = (amount: number): string =>
    new Intl.NumberFormat(locale, { style: 'currency', currency: 'RUB' }).format(amount);

  const formatDate = (date: string): string =>
    new Date(date).toLocaleDateString(locale);

  const formatMonthTitle = (dateStr: string): string => {
    const d = new Date(dateStr);
    const formatted = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(d);
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  };

  // Data state
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Filter state
  const [filterCategory, setFilterCategory] = useState<ExpenseCategory | ''>('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [appliedFilters, setAppliedFilters] = useState<{
    category: ExpenseCategory | '';
    startDate: string;
    endDate: string;
  }>({ category: '', startDate: '', endDate: '' });

  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<ExpenseFormData>(emptyForm);

  const fetchExpenses = async (
    pageNum: number,
    filters = appliedFilters,
  ) => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = {
        page: pageNum,
        limit: PAGE_LIMIT,
      };
      if (filters.category) params.category = filters.category;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;

      const response = await api.get<PaginatedResponse<Expense>>('/expenses', { params });
      setExpenses(response.data.data);
      setTotalPages(response.data.totalPages);
      setTotalCount(response.data.total);
      setPage(response.data.page);
    } catch {
      toast.error(t('expenses.loadError'));
    } finally {
      setLoading(false);
    }
  };

  // Initial data load
  useEffect(() => {
    fetchExpenses(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleApplyFilters = () => {
    const newFilters = {
      category: filterCategory,
      startDate: filterStartDate,
      endDate: filterEndDate,
    };
    setAppliedFilters(newFilters);
    setPage(1);
    fetchExpenses(1, newFilters);
  };

  const handleResetFilters = () => {
    const emptyFilters = { category: '' as const, startDate: '', endDate: '' };
    setFilterCategory('');
    setFilterStartDate('');
    setFilterEndDate('');
    setAppliedFilters(emptyFilters);
    setPage(1);
    fetchExpenses(1, emptyFilters);
  };

  // Group expenses by month
  const groupedExpenses = useMemo(() => {
    const groups: Map<string, { title: string; expenses: Expense[]; total: number }> = new Map();
    for (const expense of expenses) {
      const key = getMonthKey(expense.date);
      if (!groups.has(key)) {
        groups.set(key, { title: formatMonthTitle(expense.date), expenses: [], total: 0 });
      }
      const group = groups.get(key)!;
      group.expenses.push(expense);
      group.total += expense.amount;
    }
    return Array.from(groups.entries()).sort(([a], [b]) => b.localeCompare(a));
  }, [expenses, locale]);

  // Modal handlers
  const handleOpenAddModal = () => {
    setFormData({
      ...emptyForm,
      date: new Date().toISOString().split('T')[0],
    });
    setShowAddModal(true);
  };

  const handleCloseAddModal = () => {
    setShowAddModal(false);
    setFormData(emptyForm);
  };

  const handleOpenEditModal = (expense: Expense) => {
    setSelectedExpense(expense);
    setFormData({
      date: expense.date.split('T')[0],
      amount: String(expense.amount),
      vatAmount: expense.vatAmount != null ? String(expense.vatAmount) : '',
      category: expense.category,
      description: expense.description || '',
    });
    setShowEditModal(true);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setSelectedExpense(null);
    setFormData(emptyForm);
  };

  const handleOpenDeleteModal = (expense: Expense) => {
    setSelectedExpense(expense);
    setShowDeleteModal(true);
  };

  const handleCloseDeleteModal = () => {
    setShowDeleteModal(false);
    setSelectedExpense(null);
  };

  const handleCreate = async () => {
    const amount = parseFloat(formData.amount);
    if (!formData.date || isNaN(amount) || amount <= 0) {
      toast.error(t('expenses.fillRequiredFields'));
      return;
    }
    setIsSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        date: formData.date,
        amount,
        category: formData.category,
      };
      const vat = parseFloat(formData.vatAmount);
      if (!isNaN(vat) && vat >= 0) payload.vatAmount = vat;
      if (formData.description.trim()) payload.description = formData.description.trim();

      await api.post('/expenses/create', payload);
      toast.success(t('expenses.expenseCreated'));
      handleCloseAddModal();
      fetchExpenses(page);
    } catch {
      toast.error(t('expenses.createError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedExpense) return;
    const amount = parseFloat(formData.amount);
    if (!formData.date || isNaN(amount) || amount <= 0) {
      toast.error(t('expenses.fillRequiredFields'));
      return;
    }
    setIsSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        date: formData.date,
        amount,
        category: formData.category,
      };
      const vat = parseFloat(formData.vatAmount);
      payload.vatAmount = !isNaN(vat) && vat >= 0 ? vat : null;
      payload.description = formData.description.trim() || null;

      await api.patch(`/expenses/${selectedExpense.id}`, payload);
      toast.success(t('expenses.expenseUpdated'));
      handleCloseEditModal();
      fetchExpenses(page);
    } catch {
      toast.error(t('expenses.updateError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedExpense) return;
    setIsSubmitting(true);
    try {
      await api.delete(`/expenses/${selectedExpense.id}`);
      toast.success(t('expenses.expenseDeleted'));
      handleCloseDeleteModal();
      fetchExpenses(page);
    } catch {
      toast.error(t('expenses.deleteError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    try {
      const response = await api.post<{ imported: number; errors: { row: number; message: string }[] }>(
        '/expenses/import', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success(t('expenses.importSuccess', { count: response.data.imported }));
      if (response.data.errors?.length > 0) {
        toast.error(t('expenses.importErrors', { count: response.data.errors.length }));
      }
      fetchExpenses(page);
    } catch {
      toast.error(t('expenses.importError'));
    } finally {
      // Reset file input so the same file can be re-imported
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleExport = async () => {
    try {
      const params: Record<string, string> = {};
      if (appliedFilters.category) params.category = appliedFilters.category;
      if (appliedFilters.startDate) params.startDate = appliedFilters.startDate;
      if (appliedFilters.endDate) params.endDate = appliedFilters.endDate;

      const response = await api.get('/expenses/export/excel', {
        params,
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `expenses_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error(t('expenses.exportError'));
    }
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchExpenses(newPage);
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pages: number[] = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, page - Math.floor(maxVisiblePages / 2));
    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return (
      <div className="flex items-center justify-between px-4 py-3 border-t border-brown-200">
        <span className="text-sm text-brown-700">
          {t('expenses.pageOf', { current: page, total: totalPages })}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => handlePageChange(page - 1)}
            disabled={page <= 1}
            className="px-3 py-1 text-sm border border-brown-300 rounded-md hover:bg-cream-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('common.previous')}
          </button>
          {pages.map((p) => (
            <button
              key={p}
              onClick={() => handlePageChange(p)}
              className={`px-3 py-1 text-sm border rounded-md ${
                p === page
                  ? 'bg-brown-600 text-white border-brown-600'
                  : 'border-brown-300 hover:bg-cream-50'
              }`}
            >
              {p}
            </button>
          ))}
          <button
            onClick={() => handlePageChange(page + 1)}
            disabled={page >= totalPages}
            className="px-3 py-1 text-sm border border-brown-300 rounded-md hover:bg-cream-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('common.next')}
          </button>
        </div>
      </div>
    );
  };

  const renderFormModal = (
    title: string,
    onSubmit: () => void,
    onClose: () => void,
  ) => (
    <div className="fixed inset-0 bg-brown-900/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-cream-50 rounded-[0.4rem] shadow-sm w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="text-brown-400 hover:text-brown-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-brown-700 mb-1">{t('expenses.date')} *</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-3 py-2 border border-brown-300 rounded-[0.4rem] focus:ring-2 focus:ring-brown-500 focus:border-brown-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-brown-700 mb-1">{t('expenses.amount')} *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder={t('expenses.enterAmount')}
              className="w-full px-3 py-2 border border-brown-300 rounded-[0.4rem] focus:ring-2 focus:ring-brown-500 focus:border-brown-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-brown-700 mb-1">{t('expenses.vatAmount')}</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.vatAmount}
              onChange={(e) => setFormData({ ...formData, vatAmount: e.target.value })}
              placeholder="0.00"
              className="w-full px-3 py-2 border border-brown-300 rounded-[0.4rem] focus:ring-2 focus:ring-brown-500 focus:border-brown-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-brown-700 mb-1">{t('expenses.category')} *</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value as ExpenseCategory })}
              className="w-full px-3 py-2 border border-brown-300 rounded-[0.4rem] focus:ring-2 focus:ring-brown-500 focus:border-brown-500"
            >
              {EXPENSE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {t(`expenses.categories.${cat}`)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-brown-700 mb-1">{t('expenses.description')}</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder={t('expenses.enterDescription')}
              rows={3}
              className="w-full px-3 py-2 border border-brown-300 rounded-[0.4rem] focus:ring-2 focus:ring-brown-500 focus:border-brown-500 resize-none"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 p-4 border-t">
          <button onClick={onClose} className="px-4 py-2 text-brown-700 hover:bg-cream-100 rounded-[0.4rem]">
            {t('expenses.cancel')}
          </button>
          <button
            onClick={onSubmit}
            disabled={isSubmitting}
            className="btn-primary"
          >
            {isSubmitting ? t('common.saving') : t('expenses.save')}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-3">
        <h1 className="page-title">{t('expenses.title')}</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <button className="btn-primary" onClick={handleOpenAddModal}>
            {t('expenses.addExpense')}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx"
            onChange={handleImport}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 border border-brown-300 rounded-[0.4rem] text-brown-700 hover:bg-cream-50 text-sm font-medium"
          >
            {t('expenses.import')}
          </button>
          <button
            onClick={handleExport}
            className="px-4 py-2 border border-brown-300 rounded-[0.4rem] text-brown-700 hover:bg-cream-50 text-sm font-medium"
          >
            {t('expenses.export')}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="p-4">
          <div className="flex flex-col sm:flex-row items-end gap-4 flex-wrap">
            <div className="w-full sm:w-auto">
              <label className="block text-sm font-medium text-brown-700 mb-1">{t('expenses.filterByCategory')}</label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value as ExpenseCategory | '')}
                className="w-full sm:w-48 px-3 py-2 border border-brown-300 rounded-[0.4rem] focus:ring-2 focus:ring-brown-500 focus:border-brown-500"
              >
                <option value="">{t('expenses.allCategories')}</option>
                {EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {t(`expenses.categories.${cat}`)}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-full sm:w-auto">
              <label className="block text-sm font-medium text-brown-700 mb-1">{t('expenses.startDate')}</label>
              <input
                type="date"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
                className="w-full sm:w-44 px-3 py-2 border border-brown-300 rounded-[0.4rem] focus:ring-2 focus:ring-brown-500 focus:border-brown-500"
              />
            </div>
            <div className="w-full sm:w-auto">
              <label className="block text-sm font-medium text-brown-700 mb-1">{t('expenses.endDate')}</label>
              <input
                type="date"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
                className="w-full sm:w-44 px-3 py-2 border border-brown-300 rounded-[0.4rem] focus:ring-2 focus:ring-brown-500 focus:border-brown-500"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleApplyFilters}
                className="btn-primary"
              >
                {t('expenses.applyFilters')}
              </button>
              <button
                onClick={handleResetFilters}
                className="px-4 py-2 border border-brown-300 rounded-[0.4rem] text-brown-700 hover:bg-cream-50 text-sm font-medium"
              >
                {t('expenses.resetFilters')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Overdue Payments Banner */}
      {overdueCount > 0 && !bannerDismissed && (
        <div className="mb-6 rounded-[0.4rem] border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <svg
                className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.168 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <h3 className="text-sm font-semibold text-amber-800">
                  {t('expenses.overdueBannerTitle', {
                    count: overdueCount,
                    amount: formatCurrency(overdueTotalAmount),
                  })}
                </h3>
                {overdueProjects.length > 0 && (
                  <ul className="mt-1.5 space-y-1">
                    {overdueProjects.map((project) => (
                      <li key={project.projectId} className="text-sm text-amber-700">
                        <Link
                          to={`/projects/${project.projectId}#payments`}
                          className="font-medium underline hover:text-amber-900"
                        >
                          {project.projectName}
                        </Link>
                        {' \u2014 '}
                        {t('expenses.overdueProjectDetail', {
                          count: project.overdueCount,
                          amount: formatCurrency(project.overdueAmount),
                        })}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            <button
              onClick={() => { setBannerDismissed(true); sessionStorage.setItem('overdueBannerDismissed', 'true'); }}
              className="flex-shrink-0 rounded p-2 text-amber-600 hover:bg-amber-100 hover:text-amber-800"
              aria-label={t('common.close')}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card">
        {loading ? (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brown-600 mx-auto"></div>
          </div>
        ) : expenses.length === 0 ? (
          <p className="text-brown-500 text-center py-12">{t('expenses.noExpenses')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-cream-100 border-b border-brown-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-brown-500 uppercase tracking-wider">{t('expenses.date')}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-brown-500 uppercase tracking-wider">{t('expenses.category')}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-brown-500 uppercase tracking-wider">{t('expenses.description')}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-brown-500 uppercase tracking-wider">{t('expenses.amount')}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-brown-500 uppercase tracking-wider">{t('expenses.vatAmount')}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-brown-500 uppercase tracking-wider">{t('expenses.createdBy')}</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-brown-500 uppercase tracking-wider">{t('expenses.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brown-200">
                {groupedExpenses.map(([monthKey, group]) => (
                  <GroupRows
                    key={monthKey}
                    group={group}
                    t={t}
                    formatCurrency={formatCurrency}
                    formatDate={formatDate}
                    onEdit={handleOpenEditModal}
                    onDelete={handleOpenDeleteModal}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
        {renderPagination()}
      </div>

      {/* Add Modal */}
      {showAddModal && renderFormModal(
        t('expenses.addExpense'),
        handleCreate,
        handleCloseAddModal,
      )}

      {/* Edit Modal */}
      {showEditModal && selectedExpense && renderFormModal(
        t('expenses.editExpense'),
        handleUpdate,
        handleCloseEditModal,
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedExpense && (
        <div className="fixed inset-0 bg-brown-900/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-cream-50 rounded-[0.4rem] shadow-sm w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold text-red-600">{t('expenses.deleteExpense')}</h2>
              <button onClick={handleCloseDeleteModal} className="text-brown-400 hover:text-brown-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4">
              <p className="text-brown-700">{t('expenses.confirmDelete')}</p>
              <p className="text-brown-500 text-sm mt-2">{t('common.actionCannotBeUndone')}</p>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t">
              <button onClick={handleCloseDeleteModal} className="px-4 py-2 text-brown-700 hover:bg-cream-100 rounded-[0.4rem]">
                {t('expenses.cancel')}
              </button>
              <button
                onClick={handleDelete}
                disabled={isSubmitting}
                className="px-4 py-2 bg-red-600 text-white rounded-[0.4rem] hover:bg-red-700 disabled:opacity-50"
              >
                {isSubmitting ? t('common.deleting') : t('expenses.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Renders month separator row + expense rows for a single month group */
function GroupRows({
  group,
  t,
  formatCurrency,
  formatDate,
  onEdit,
  onDelete,
}: {
  group: { title: string; expenses: Expense[]; total: number };
  t: (key: string) => string;
  formatCurrency: (amount: number) => string;
  formatDate: (date: string) => string;
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
}) {
  return (
    <>
      <tr className="bg-cream-100">
        <td colSpan={7} className="px-4 py-2 text-sm font-semibold text-brown-700">
          {group.title} &mdash; {formatCurrency(group.total)}
        </td>
      </tr>
      {group.expenses.map((expense) => (
        <tr key={expense.id} className="hover:bg-cream-50">
          <td className="px-4 py-4 whitespace-nowrap text-sm text-brown-900">{formatDate(expense.date)}</td>
          <td className="px-4 py-4 whitespace-nowrap">
            <span className="px-2 py-1 text-xs font-medium rounded-full bg-brown-100 text-brown-800">
              {t(`expenses.categories.${expense.category}`)}
            </span>
          </td>
          <td className="px-4 py-4 text-sm text-brown-600 max-w-xs truncate">{expense.description || '-'}</td>
          <td className="px-4 py-4 whitespace-nowrap text-sm text-brown-900 text-right font-medium">{formatCurrency(expense.amount)}</td>
          <td className="px-4 py-4 whitespace-nowrap text-sm text-brown-600 text-right">
            {expense.vatAmount != null ? formatCurrency(expense.vatAmount) : '-'}
          </td>
          <td className="px-4 py-4 whitespace-nowrap text-sm text-brown-600">
            {expense.createdBy.firstName} {expense.createdBy.lastName}
          </td>
          <td className="px-4 py-4 whitespace-nowrap text-center">
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => onEdit(expense)}
                className="text-brown-600 hover:text-brown-800 text-sm font-medium"
                title={t('expenses.edit')}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button
                onClick={() => onDelete(expense)}
                className="text-red-600 hover:text-red-800 text-sm font-medium"
                title={t('expenses.delete')}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </td>
        </tr>
      ))}
    </>
  );
}
