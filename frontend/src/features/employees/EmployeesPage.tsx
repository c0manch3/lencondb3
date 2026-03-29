import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { type ColumnDef, createColumnHelper } from '@tanstack/react-table';
import toast from 'react-hot-toast';

import { Table, Badge, Button, ConfirmDialog } from '@/shared/components';
import type { User, UserRole } from '@/shared/types';
import { useAuth } from '@/shared/auth/AuthContext';
import { useEmployees, useDeleteEmployee } from './hooks/useEmployees';
import EmployeeForm from './components/EmployeeForm';
import EmployeeDetailModal from './components/EmployeeDetailModal';

// ─── Constants ──────────────────────────────────────────────────────────────

const ROLE_BADGE_VARIANT: Record<UserRole, 'admin' | 'manager' | 'employee' | 'trial'> = {
  Admin: 'admin',
  Manager: 'manager',
  Employee: 'employee',
  Trial: 'trial',
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatSalary(salary?: number): string {
  if (salary == null) return '\u2014';
  return salary.toLocaleString('ru-RU').replace(/,/g, ' ') + ' \u0440.';
}

function getInitials(user: User): string {
  return (
    (user.firstName?.[0] ?? '') + (user.lastName?.[0] ?? '')
  ).toUpperCase();
}

const columnHelper = createColumnHelper<User>();

// ─── Component ──────────────────────────────────────────────────────────────

export default function EmployeesPage() {
  const { t } = useTranslation();
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'Admin';

  // ─── Data ───────────────────────────────────────────────────────────────
  const { data: response, isLoading } = useEmployees();
  const deleteMutation = useDeleteEmployee();

  // ─── Local state ────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editEmployee, setEditEmployee] = useState<User | null>(null);
  const [detailEmployee, setDetailEmployee] = useState<User | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

  // ─── Filtered data ──────────────────────────────────────────────────────
  const employees = response?.data ?? [];

  const filteredEmployees = useMemo(() => {
    if (!search.trim()) return employees;

    const query = search.toLowerCase().trim();
    return employees.filter((emp) => {
      const fullName = `${emp.firstName} ${emp.lastName}`.toLowerCase();
      return (
        fullName.includes(query) ||
        emp.email.toLowerCase().includes(query) ||
        (emp.phone && emp.phone.toLowerCase().includes(query))
      );
    });
  }, [employees, search]);

  // ─── Handlers ───────────────────────────────────────────────────────────

  const handleRowClick = useCallback((employee: User) => {
    setDetailEmployee(employee);
  }, []);

  const handleOpenCreate = useCallback(() => {
    setEditEmployee(null);
    setFormOpen(true);
  }, []);

  const handleOpenEdit = useCallback((employee: User) => {
    setEditEmployee(employee);
    setFormOpen(true);
  }, []);

  const handleCloseForm = useCallback(() => {
    setFormOpen(false);
    setEditEmployee(null);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast.success(t('employees.employeeDeleted'));
    } catch {
      toast.error(t('employees.deleteError'));
    } finally {
      setDeleteTarget(null);
    }
  }, [deleteTarget, deleteMutation, t]);

  const handleRequestDelete = useCallback(
    (employee: User) => {
      setDeleteTarget(employee);
    },
    [],
  );

  // ─── Columns ────────────────────────────────────────────────────────────

  const columns = useMemo<ColumnDef<User, unknown>[]>(() => {
    const cols: ColumnDef<User, unknown>[] = [
      columnHelper.accessor(
        (row) => `${row.firstName} ${row.lastName}`,
        {
          id: 'name',
          header: t('employees.name'),
          enableSorting: true,
          cell: ({ row }) => {
            const user = row.original;
            return (
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-cream-200 text-brown-700 text-xs font-semibold shrink-0">
                  {getInitials(user)}
                </div>
                <span className="font-medium text-[#22150d] truncate">
                  {user.firstName} {user.lastName}
                </span>
              </div>
            );
          },
        },
      ) as ColumnDef<User, unknown>,

      columnHelper.accessor('email', {
        header: t('employees.email'),
        enableSorting: true,
        cell: ({ getValue }) => (
          <span className="text-[#5c4a3e] truncate">{getValue()}</span>
        ),
      }) as ColumnDef<User, unknown>,

      columnHelper.accessor('phone', {
        header: t('employees.phone'),
        enableSorting: false,
        cell: ({ getValue }) => (
          <span className="text-[#5c4a3e]">{getValue() || '\u2014'}</span>
        ),
      }) as ColumnDef<User, unknown>,

      columnHelper.accessor('role', {
        header: t('employees.role'),
        enableSorting: true,
        size: 100,
        cell: ({ getValue }) => {
          const role = getValue() as UserRole;
          return (
            <Badge variant={ROLE_BADGE_VARIANT[role]}>
              {t(`employees.role${role}`)}
            </Badge>
          );
        },
      }) as ColumnDef<User, unknown>,

      columnHelper.accessor('salary', {
        header: t('employees.salary'),
        enableSorting: true,
        size: 110,
        cell: ({ getValue }) => (
          <span className="text-right tabular-nums font-medium block">
            {formatSalary(getValue() as number | undefined)}
          </span>
        ),
      }) as ColumnDef<User, unknown>,
    ];

    // Admin-only columns: Status + Actions
    if (isAdmin) {
      cols.push(
        columnHelper.display({
          id: 'status',
          header: t('common.status'),
          size: 120,
          cell: ({ row }) => {
            const isPending = row.original.createdAt === row.original.updatedAt;
            return (
              <Badge variant={isPending ? 'warning' : 'success'}>
                {isPending ? (
                  <span className="inline-flex items-center gap-1">
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
                      />
                    </svg>
                    {t('employees.statusPending')}
                  </span>
                ) : (
                  t('employees.statusActive')
                )}
              </Badge>
            );
          },
        }) as ColumnDef<User, unknown>,

        columnHelper.display({
          id: 'actions',
          header: '',
          size: 80,
          enableSorting: false,
          cell: ({ row }) => {
            const employee = row.original;
            const isSelf = currentUser?.id === employee.id;
            return (
              <div className="flex items-center justify-end gap-1">
                <button
                  type="button"
                  className="inline-flex items-center justify-center w-8 h-8 rounded text-brown-400 hover:text-red-700 hover:bg-cream-200 transition-colors duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  disabled={isSelf}
                  title={isSelf ? t('employees.cannotDeleteSelf') : t('common.delete')}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isSelf) setDeleteTarget(employee);
                  }}
                  aria-label={`${t('common.delete')} ${employee.firstName} ${employee.lastName}`}
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                    />
                  </svg>
                </button>
              </div>
            );
          },
        }) as ColumnDef<User, unknown>,
      );
    }

    return cols;
  }, [isAdmin, currentUser?.id, t]);

  // ─── Mobile card renderer ───────────────────────────────────────────────

  const renderMobileCard = useCallback(
    (employee: User) => {
      const isPending = employee.createdAt === employee.updatedAt;
      return (
        <div className="bg-[#fdfaf0] border border-[rgba(34,21,13,0.15)] rounded-xl p-4">
          {/* Top row: badges + actions */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Badge variant={ROLE_BADGE_VARIANT[employee.role]}>
                {t(`employees.role${employee.role}`)}
              </Badge>
              {isAdmin && (
                <Badge variant={isPending ? 'warning' : 'success'}>
                  {isPending ? t('employees.statusPending') : t('employees.statusActive')}
                </Badge>
              )}
            </div>
            {isAdmin && currentUser?.id !== employee.id && (
              <button
                type="button"
                className="inline-flex items-center justify-center w-8 h-8 rounded text-brown-400 hover:text-red-700 hover:bg-cream-200 transition-colors duration-150 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteTarget(employee);
                }}
                aria-label={`${t('common.delete')} ${employee.firstName} ${employee.lastName}`}
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                  />
                </svg>
              </button>
            )}
          </div>

          {/* Name */}
          <div className="flex items-center gap-2 mb-1">
            <div className="flex items-center justify-center w-7 h-7 rounded-full bg-cream-200 text-brown-700 text-[10px] font-semibold shrink-0">
              {getInitials(employee)}
            </div>
            <span className="font-medium text-[#22150d] truncate">
              {employee.firstName} {employee.lastName}
            </span>
          </div>

          {/* Secondary info */}
          <div className="space-y-0.5 text-xs text-[#7d6b5d] ml-9">
            <p className="truncate">{employee.email}</p>
            {employee.phone && <p>{employee.phone}</p>}
            {employee.salary != null && (
              <p className="tabular-nums font-medium">
                {formatSalary(employee.salary)}
              </p>
            )}
          </div>
        </div>
      );
    },
    [isAdmin, currentUser?.id, t],
  );

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brown-900">
          {t('employees.title')}
        </h1>
        {isAdmin && (
          <Button
            onClick={handleOpenCreate}
            icon={
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            }
          >
            {t('employees.addEmployee')}
          </Button>
        )}
      </div>

      {/* Search toolbar + Table wrapper */}
      <div>
        {/* Search bar */}
        <div className="flex items-center gap-3 p-4 bg-[#fdfaf0] border border-[rgba(34,21,13,0.15)] border-b-0 rounded-t-xl flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7d6b5d] pointer-events-none"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
              />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('employees.searchEmployees')}
              className="w-full h-9 pl-9 pr-3 border border-[rgba(34,21,13,0.15)] rounded-[0.4rem] bg-transparent text-sm text-[#22150d] placeholder:text-[rgba(34,21,13,0.4)] focus:border-[rgba(34,21,13,0.40)] focus:outline-2 focus:outline-[#FFFF8B] focus:outline-offset-2"
              aria-label={t('employees.searchEmployees')}
            />
          </div>
        </div>

        {/* Table */}
        <div className="[&>div]:rounded-t-none [&>div]:border-t-0">
          <Table<User>
            data={filteredEmployees}
            columns={columns}
            isLoading={isLoading}
            sorting
            onRowClick={handleRowClick}
            renderMobileCard={renderMobileCard}
            emptyState={{
              title: t('employees.noEmployees'),
              description: search ? t('common.noData') : undefined,
            }}
          />
        </div>
      </div>

      {/* Employee form modal (create/edit) */}
      <EmployeeForm
        isOpen={formOpen}
        onClose={handleCloseForm}
        employee={editEmployee}
      />

      {/* Employee detail modal */}
      <EmployeeDetailModal
        isOpen={Boolean(detailEmployee)}
        onClose={() => setDetailEmployee(null)}
        employee={detailEmployee}
        onEdit={handleOpenEdit}
        onDelete={handleRequestDelete}
      />

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title={t('employees.deleteEmployee')}
        message={
          deleteTarget
            ? t('employees.confirmDeleteMessage', {
                name: `${deleteTarget.firstName} ${deleteTarget.lastName}`,
              })
            : ''
        }
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
