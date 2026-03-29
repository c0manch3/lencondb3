import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { type ColumnDef } from '@tanstack/react-table';
import toast from 'react-hot-toast';
import { Table, Badge, Button, Select, ConfirmDialog } from '@/shared/components';
import type { User, UserRole } from '@/shared/types';
import {
  useProjectTeam,
  useAvailableUsers,
  useAddTeamMember,
  useRemoveTeamMember,
} from '../hooks/useProjects';

// ─── Icons ──────────────────────────────────────────────────────────────────

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

// ─── Role badge variant mapping ─────────────────────────────────────────────

function roleBadgeVariant(role: UserRole): 'admin' | 'manager' | 'employee' | 'trial' {
  switch (role) {
    case 'Admin':
      return 'admin';
    case 'Manager':
      return 'manager';
    case 'Employee':
      return 'employee';
    case 'Trial':
      return 'trial';
  }
}

// ─── Props ──────────────────────────────────────────────────────────────────

interface TeamTabProps {
  projectId: string;
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function TeamTab({ projectId }: TeamTabProps) {
  const { t } = useTranslation();

  // ─── Data ───────────────────────────────────────────────────────────
  const { data: teamMembers = [], isLoading: teamLoading } =
    useProjectTeam(projectId);
  const { data: availableUsers = [], isLoading: availableLoading } =
    useAvailableUsers(projectId);
  const addMutation = useAddTeamMember();
  const removeMutation = useRemoveTeamMember();

  // ─── Local state ──────────────────────────────────────────────────
  const [selectedUserId, setSelectedUserId] = useState('');
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<User | null>(null);

  // ─── Add member ───────────────────────────────────────────────────
  const handleAddMember = useCallback(() => {
    if (!selectedUserId) return;
    addMutation.mutate(
      { projectId, userId: selectedUserId },
      {
        onSuccess: () => {
          setSelectedUserId('');
          toast.success(t('projects.teamMemberAdded'));
        },
        onError: () => {
          toast.error(t('projects.teamMemberAddError'));
        },
      },
    );
  }, [selectedUserId, projectId, addMutation, t]);

  // ─── Remove member ────────────────────────────────────────────────
  const handleOpenRemove = useCallback((member: User) => {
    setMemberToRemove(member);
    setRemoveDialogOpen(true);
  }, []);

  const handleConfirmRemove = useCallback(() => {
    if (!memberToRemove) return;
    removeMutation.mutate(
      { projectId, userId: memberToRemove.id },
      {
        onSuccess: () => {
          setRemoveDialogOpen(false);
          setMemberToRemove(null);
          toast.success(t('projects.teamMemberRemoved'));
        },
        onError: () => {
          toast.error(t('projects.teamMemberRemoveError'));
        },
      },
    );
  }, [memberToRemove, projectId, removeMutation, t]);

  // ─── Available users dropdown options ─────────────────────────────
  const availableUserOptions = useMemo(
    () =>
      availableUsers.map((u) => ({
        value: u.id,
        label: `${u.firstName} ${u.lastName} (${u.email})`,
      })),
    [availableUsers],
  );

  // ─── Table columns ────────────────────────────────────────────────
  const columns = useMemo<ColumnDef<User, unknown>[]>(
    () => [
      {
        id: 'name',
        header: t('common.name'),
        accessorFn: (row) => `${row.firstName} ${row.lastName}`,
        cell: ({ getValue }) => (
          <span className="font-medium text-[#22150d]">
            {getValue<string>()}
          </span>
        ),
      },
      {
        accessorKey: 'email',
        header: t('employees.email'),
        cell: ({ getValue }) => (
          <span className="text-[#5c4a3e]">{getValue<string>()}</span>
        ),
      },
      {
        accessorKey: 'phone',
        header: t('employees.phone'),
        size: 130,
        enableSorting: false,
        cell: ({ getValue }) => (
          <span className="text-[#5c4a3e]">
            {getValue<string>() || '-'}
          </span>
        ),
      },
      {
        accessorKey: 'role',
        header: t('employees.role'),
        size: 100,
        cell: ({ getValue }) => {
          const role = getValue<UserRole>();
          return (
            <Badge variant={roleBadgeVariant(role)}>{role}</Badge>
          );
        },
      },
      {
        id: 'actions',
        header: '',
        size: 60,
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <button
              type="button"
              className="inline-flex items-center justify-center w-8 h-8 rounded text-[#7d6b5d] hover:text-[#8b3a2a] hover:bg-[rgba(156,60,40,0.08)] transition-colors duration-150 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenRemove(row.original);
              }}
              aria-label={t('common.remove')}
            >
              <TrashIcon />
            </button>
          </div>
        ),
      },
    ],
    [t, handleOpenRemove],
  );

  // ─── Mobile card renderer ─────────────────────────────────────────
  const renderMobileCard = useCallback(
    (member: User) => (
      <div className="bg-[#fdfaf0] border border-[rgba(34,21,13,0.15)] rounded-xl p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <span className="font-medium text-[#22150d] text-sm">
            {member.firstName} {member.lastName}
          </span>
          <Badge variant={roleBadgeVariant(member.role)}>{member.role}</Badge>
        </div>
        <p className="text-xs text-[#5c4a3e] mb-1">{member.email}</p>
        {member.phone && (
          <p className="text-xs text-[#7d6b5d]">{member.phone}</p>
        )}
        <div className="mt-3 pt-3 border-t border-[rgba(34,21,13,0.10)]">
          <button
            type="button"
            className="inline-flex items-center gap-1 text-xs text-[#8b3a2a] hover:text-red-800 transition-colors cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenRemove(member);
            }}
          >
            <TrashIcon />
            {t('common.remove')}
          </button>
        </div>
      </div>
    ),
    [t, handleOpenRemove],
  );

  // ─── Render ────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-lg font-semibold text-[#22150d]">
        {t('analytics.team')}
      </h3>

      {/* Add member bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Select
            placeholder={t('workload.selectEmployee')}
            options={availableUserOptions}
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            disabled={availableLoading || availableUserOptions.length === 0}
          />
        </div>
        <Button
          variant="primary"
          size="md"
          icon={<PlusIcon />}
          onClick={handleAddMember}
          disabled={!selectedUserId}
          loading={addMutation.isPending}
        >
          {t('common.add')}
        </Button>
      </div>

      {/* Team table */}
      <Table<User>
        data={teamMembers}
        columns={columns}
        isLoading={teamLoading}
        sorting
        renderMobileCard={renderMobileCard}
        emptyState={{
          title: t('workload.noEmployeesAssigned'),
        }}
      />

      {/* Remove Confirmation */}
      <ConfirmDialog
        isOpen={removeDialogOpen}
        onClose={() => setRemoveDialogOpen(false)}
        onConfirm={handleConfirmRemove}
        title={t('common.remove')}
        message={
          memberToRemove
            ? `${t('common.remove')} ${memberToRemove.firstName} ${memberToRemove.lastName}?`
            : ''
        }
        confirmLabel={t('common.remove')}
        cancelLabel={t('common.cancel')}
        loading={removeMutation.isPending}
      />
    </div>
  );
}
