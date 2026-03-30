import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { type ColumnDef } from '@tanstack/react-table';
import { Table, Button, Badge, Input, Select, ConfirmDialog } from '@/shared/components';
import { useAuth } from '@/shared/auth/AuthContext';
import type { Company, CompanyType } from '@/shared/types';
import {
  useCompanies,
  useCreateCompany,
  useUpdateCompany,
  useDeleteCompany,
} from './hooks/useCompanies';
import CompanyForm from './components/CompanyForm';
import CompanyDetailModal from './components/CompanyDetailModal';

// ─── Type filter options ────────────────────────────────────────────────────

type TypeFilter = 'All' | CompanyType;

// ─── Icons ──────────────────────────────────────────────────────────────────

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

function PlusIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
    </svg>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function CompaniesPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const canManage = user?.role === 'Admin' || user?.role === 'Manager';

  // ─── Data ───────────────────────────────────────────────────────────
  const { data: companiesResponse, isLoading } = useCompanies();
  const createMutation = useCreateCompany();
  const updateMutation = useUpdateCompany();
  const deleteMutation = useDeleteCompany();

  // ─── UI state ───────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('All');

  // Modal states
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);

  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null);

  // ─── Filtering ──────────────────────────────────────────────────────
  const companies = companiesResponse?.data ?? [];

  const filteredCompanies = useMemo(() => {
    let result = companies;

    // Type filter
    if (typeFilter !== 'All') {
      result = result.filter((c) => c.type === typeFilter);
    }

    // Search filter (name, email)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          (c.email && c.email.toLowerCase().includes(query)),
      );
    }

    return result;
  }, [companies, typeFilter, searchQuery]);

  // ─── Row click ──────────────────────────────────────────────────────
  const handleRowClick = useCallback((company: Company) => {
    setSelectedCompany(company);
    setDetailOpen(true);
  }, []);

  // ─── Form handlers ─────────────────────────────────────────────────
  const handleOpenCreate = useCallback(() => {
    setEditingCompany(null);
    setFormMode('create');
    setFormOpen(true);
  }, []);

  const handleOpenEdit = useCallback((company: Company) => {
    setEditingCompany(company);
    setFormMode('edit');
    setDetailOpen(false);
    setFormOpen(true);
  }, []);

  const handleFormSubmit = useCallback(
    (values: { name: string; type: CompanyType; address?: string; phone?: string; email?: string; postalCode?: string }) => {
      if (formMode === 'create') {
        createMutation.mutate(
          {
            name: values.name,
            type: values.type,
            address: values.address || undefined,
            phone: values.phone || undefined,
            email: values.email || undefined,
          },
          {
            onSuccess: () => setFormOpen(false),
          },
        );
      } else if (editingCompany) {
        updateMutation.mutate(
          {
            id: editingCompany.id,
            name: values.name,
            type: values.type,
            address: values.address || undefined,
            phone: values.phone || undefined,
            email: values.email || undefined,
            postalCode: values.postalCode || undefined,
          },
          {
            onSuccess: () => setFormOpen(false),
          },
        );
      }
    },
    [formMode, editingCompany, createMutation, updateMutation],
  );

  // ─── Delete handlers ───────────────────────────────────────────────
  const handleOpenDelete = useCallback((company: Company) => {
    setCompanyToDelete(company);
    setDetailOpen(false);
    setDeleteDialogOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (!companyToDelete) return;
    deleteMutation.mutate(companyToDelete.id, {
      onSuccess: () => {
        setDeleteDialogOpen(false);
        setCompanyToDelete(null);
      },
    });
  }, [companyToDelete, deleteMutation]);

  // ─── Type filter options ────────────────────────────────────────────
  const typeFilterOptions = useMemo(
    () => [
      { value: 'All', label: t('common.all') },
      { value: 'Customer', label: t('companies.customer') },
      { value: 'Contractor', label: t('companies.contractor') },
    ],
    [t],
  );

  // ─── Table columns ─────────────────────────────────────────────────
  const columns = useMemo<ColumnDef<Company, unknown>[]>(
    () => [
      {
        accessorKey: 'name',
        header: t('companies.companyName'),
        cell: ({ getValue }) => (
          <span className="font-semibold text-brown-900">
            {getValue<string>()}
          </span>
        ),
        size: undefined, // flex: 2 handled by min-width
        meta: { minWidth: 160 },
      },
      {
        accessorKey: 'type',
        header: t('companies.type'),
        size: 110,
        cell: ({ getValue }) => {
          const type = getValue<CompanyType>();
          const variant = type === 'Customer' ? 'customer' : 'contractor';
          const label = type === 'Customer'
            ? t('companies.customer')
            : t('companies.contractor');
          return <Badge variant={variant}>{label}</Badge>;
        },
      },
      {
        accessorKey: 'email',
        header: t('companies.email'),
        cell: ({ getValue }) => (
          <span className="text-brown-600">
            {getValue<string>() || '-'}
          </span>
        ),
        size: undefined,
        meta: { minWidth: 160 },
      },
      {
        accessorKey: 'phone',
        header: t('companies.phone'),
        size: 130,
        enableSorting: false,
        cell: ({ getValue }) => (
          <span className="text-brown-600">
            {getValue<string>() || '-'}
          </span>
        ),
      },
      ...(canManage
        ? [
            {
              id: 'actions',
              header: t('common.actions'),
              size: 80,
              enableSorting: false,
              cell: ({ row }: { row: { original: Company } }) => (
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
            } satisfies ColumnDef<Company, unknown>,
          ]
        : []),
    ],
    [t, canManage, handleOpenEdit, handleOpenDelete],
  );

  // ─── Mobile card renderer ──────────────────────────────────────────
  const renderMobileCard = useCallback(
    (company: Company) => {
      const typeBadgeVariant = company.type === 'Customer' ? 'customer' : 'contractor';
      const typeLabel = company.type === 'Customer'
        ? t('companies.customer')
        : t('companies.contractor');

      return (
        <div className="bg-cream-50 border border-brown-200 rounded-xl p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <span className="font-semibold text-brown-900 text-sm">
              {company.name}
            </span>
            <Badge variant={typeBadgeVariant}>{typeLabel}</Badge>
          </div>

          {company.email && (
            <p className="text-xs text-brown-600 mb-1">{company.email}</p>
          )}
          {company.phone && (
            <p className="text-xs text-brown-600">{company.phone}</p>
          )}

          {canManage && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-brown-100">
              <button
                type="button"
                className="inline-flex items-center gap-1 text-xs text-brown-600 hover:text-brown-900 transition-colors cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenEdit(company);
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
                  handleOpenDelete(company);
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
    [t, canManage, handleOpenEdit, handleOpenDelete],
  );

  // ─── Render ─────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-brown-900">
          {t('companies.title')}
        </h1>

        {canManage && (
          <Button
            variant="primary"
            icon={<PlusIcon />}
            onClick={handleOpenCreate}
          >
            {t('companies.addCompany')}
          </Button>
        )}
      </div>

      {/* Toolbar: Search + Type filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            placeholder={t('companies.searchCompanies')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-48">
          <Select
            options={typeFilterOptions}
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
          />
        </div>
      </div>

      {/* Table */}
      <Table<Company>
        data={filteredCompanies}
        columns={columns}
        isLoading={isLoading}
        sorting
        onRowClick={handleRowClick}
        renderMobileCard={renderMobileCard}
        emptyState={{
          title: searchQuery.trim()
            ? t('companies.noSearchResults')
            : t('companies.noCompanies'),
        }}
      />

      {/* Company Form Modal (Create / Edit) */}
      <CompanyForm
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleFormSubmit}
        mode={formMode}
        defaultValues={editingCompany}
        loading={createMutation.isPending || updateMutation.isPending}
      />

      {/* Company Detail Modal (with actions for Admin and Manager) */}
      <CompanyDetailModal
        isOpen={detailOpen}
        onClose={() => setDetailOpen(false)}
        company={selectedCompany}
        canManage={canManage}
        onEdit={handleOpenEdit}
        onDelete={handleOpenDelete}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        title={t('companies.deleteCompany')}
        message={
          companyToDelete
            ? t('companies.confirmDelete', { name: companyToDelete.name })
            : ''
        }
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
