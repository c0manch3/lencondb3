import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';

import { Modal, Badge, Button } from '@/shared/components';
import type { User, UserRole } from '@/shared/types';
import { useAuth } from '@/shared/auth/AuthContext';
import { useResendInvite, useInitiateReset } from '../hooks/useEmployees';

// ─── Helpers ────────────────────────────────────────────────────────────────

const ROLE_BADGE_VARIANT: Record<UserRole, 'admin' | 'manager' | 'employee' | 'trial'> = {
  Admin: 'admin',
  Manager: 'manager',
  Employee: 'employee',
  Trial: 'trial',
};

function formatSalary(salary: number): string {
  return salary.toLocaleString('ru-RU').replace(/,/g, ' ') + ' \u0440.';
}

function formatDate(iso: string): string {
  if (!iso) return '\u2014';
  const d = new Date(iso);
  return d.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function getInitials(user: User): string {
  return (
    (user.firstName?.[0] ?? '') + (user.lastName?.[0] ?? '')
  ).toUpperCase();
}

// ─── Props ──────────────────────────────────────────────────────────────────

interface EmployeeDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: User | null;
  onEdit: (employee: User) => void;
  onDelete: (employee: User) => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

const EmployeeDetailModal: FC<EmployeeDetailModalProps> = ({
  isOpen,
  onClose,
  employee,
  onEdit,
  onDelete,
}) => {
  const { t } = useTranslation();
  const { user: currentUser } = useAuth();
  const resendInviteMutation = useResendInvite();
  const initiateResetMutation = useInitiateReset();

  if (!employee) return null;

  const isAdmin = currentUser?.role === 'Admin';
  const isSelf = currentUser?.id === employee.id;
  const isPending = employee.createdAt === employee.updatedAt;

  async function handleResendInvite() {
    if (!employee) return;
    try {
      const result = await resendInviteMutation.mutateAsync(employee.id);
      if (!result.emailSent && result.inviteUrl) {
        await navigator.clipboard.writeText(result.inviteUrl);
        toast.success(t('employees.inviteLinkCopied'));
      } else {
        toast.success(t('employees.inviteResent'));
      }
    } catch {
      toast.error(t('employees.resendError'));
    }
  }

  async function handleCopyInviteLink() {
    if (!employee) return;
    try {
      const result = await resendInviteMutation.mutateAsync(employee.id);
      if (result.inviteUrl) {
        await navigator.clipboard.writeText(result.inviteUrl);
        toast.success(t('employees.inviteLinkCopied'));
      }
    } catch {
      toast.error(t('employees.resendError'));
    }
  }

  async function handleResetPassword() {
    if (!employee) return;
    try {
      await initiateResetMutation.mutateAsync(employee.id);
      toast.success(t('employees.resetSent'));
    } catch {
      toast.error(t('employees.resetError'));
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${employee.firstName} ${employee.lastName}`}
      size="md"
      actions={
        isAdmin ? (
          <div className="flex items-center gap-3 w-full">
            {/* Invite/reset actions */}
            <div className="flex gap-2 mr-auto">
              {isPending ? (
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    loading={resendInviteMutation.isPending}
                    onClick={handleResendInvite}
                  >
                    {t('employees.resendInvite')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    loading={resendInviteMutation.isPending}
                    onClick={handleCopyInviteLink}
                  >
                    {t('employees.copyInviteLink')}
                  </Button>
                </>
              ) : (
                <Button
                  variant="secondary"
                  size="sm"
                  loading={initiateResetMutation.isPending}
                  onClick={handleResetPassword}
                >
                  {t('employees.resetPassword')}
                </Button>
              )}
            </div>

            <Button
              variant="danger"
              size="sm"
              disabled={isSelf}
              onClick={() => {
                onDelete(employee);
                onClose();
              }}
            >
              {t('common.delete')}
            </Button>
            <Button
              size="sm"
              onClick={() => {
                onEdit(employee);
                onClose();
              }}
            >
              {t('common.edit')}
            </Button>
          </div>
        ) : (
          <Button variant="ghost" onClick={onClose}>
            {t('common.close')}
          </Button>
        )
      }
    >
      <div className="space-y-5">
        {/* Avatar + basic info */}
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-cream-200 text-brown-700 text-lg font-semibold shrink-0">
            {getInitials(employee)}
          </div>
          <div className="min-w-0">
            <p className="text-lg font-semibold text-brown-900 truncate">
              {employee.firstName} {employee.lastName}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant={ROLE_BADGE_VARIANT[employee.role]}>
                {t(`employees.role${employee.role}`)}
              </Badge>
              <Badge variant={isPending ? 'warning' : 'success'}>
                {isPending ? t('employees.statusPending') : t('employees.statusActive')}
              </Badge>
            </div>
          </div>
        </div>

        {/* Detail rows */}
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-sm">
          <dt className="text-brown-400 font-medium">{t('employees.email')}</dt>
          <dd className="text-brown-900 truncate">{employee.email}</dd>

          <dt className="text-brown-400 font-medium">{t('employees.phone')}</dt>
          <dd className="text-brown-900">{employee.phone || '\u2014'}</dd>

          {employee.salary != null && (
            <>
              <dt className="text-brown-400 font-medium">{t('employees.salary')}</dt>
              <dd className="text-brown-900 tabular-nums font-medium">
                {formatSalary(employee.salary)}
              </dd>
            </>
          )}

          {employee.telegramId && (
            <>
              <dt className="text-brown-400 font-medium">{t('employees.telegramId')}</dt>
              <dd className="text-brown-900">{employee.telegramId}</dd>
            </>
          )}

          {employee.dateBirth && (
            <>
              <dt className="text-brown-400 font-medium">{t('employees.birthDate')}</dt>
              <dd className="text-brown-900 tabular-nums">{formatDate(employee.dateBirth)}</dd>
            </>
          )}
        </dl>
      </div>
    </Modal>
  );
};

export default EmployeeDetailModal;
