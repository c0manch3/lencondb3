import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';

import { Modal, Button, Input, Select, DatePicker } from '@/shared/components';
import type { User, UserRole } from '@/shared/types';
import { useAuth } from '@/shared/auth/AuthContext';
import {
  useCreateEmployee,
  useUpdateEmployee,
  useResendInvite,
  useInitiateReset,
} from '../hooks/useEmployees';

// ─── Validation schemas ─────────────────────────────────────────────────────

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?\d{7,15}$/;

function buildCreateSchema(t: (key: string) => string) {
  return z.object({
    firstName: z.string().min(1, t('validation.required')),
    lastName: z.string().min(1, t('validation.required')),
    email: z
      .string()
      .min(1, t('validation.required'))
      .regex(EMAIL_REGEX, t('validation.email')),
    phone: z
      .string()
      .optional()
      .refine(
        (v) => !v || PHONE_REGEX.test(v),
        { message: '' }, // placeholder, overridden below
      ),
    role: z.enum(['Admin', 'Manager', 'Employee', 'Trial'] as const),
    salary: z.coerce.number().positive().optional().or(z.literal('')),
  });
}

function buildEditSchema(t: (key: string) => string) {
  return z.object({
    firstName: z.string().min(1, t('validation.required')),
    lastName: z.string().min(1, t('validation.required')),
    phone: z
      .string()
      .optional()
      .refine(
        (v) => !v || PHONE_REGEX.test(v),
        { message: '' },
      ),
    role: z.enum(['Admin', 'Manager', 'Employee', 'Trial'] as const),
    salary: z.coerce.number().positive().optional().or(z.literal('')),
    telegramId: z.string().optional(),
    dateBirth: z.string().optional(),
  });
}

// ─── Form value types ───────────────────────────────────────────────────────

interface CreateFormValues {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: UserRole;
  salary?: number | '';
}

interface EditFormValues {
  firstName: string;
  lastName: string;
  phone?: string;
  role: UserRole;
  salary?: number | '';
  telegramId?: string;
  dateBirth?: string;
}

// ─── Props ──────────────────────────────────────────────────────────────────

interface EmployeeFormProps {
  isOpen: boolean;
  onClose: () => void;
  employee?: User | null;
}

// ─── Role options helper ────────────────────────────────────────────────────

function useRoleOptions() {
  const { t } = useTranslation();
  return [
    { value: 'Admin', label: t('employees.roleAdmin') },
    { value: 'Manager', label: t('employees.roleManager') },
    { value: 'Employee', label: t('employees.roleEmployee') },
    { value: 'Trial', label: t('employees.roleTrial') },
  ];
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function EmployeeForm({ isOpen, onClose, employee }: EmployeeFormProps) {
  const { t } = useTranslation();
  const { user: currentUser } = useAuth();
  const isEditMode = Boolean(employee);

  const roleOptions = useRoleOptions();
  const createMutation = useCreateEmployee();
  const updateMutation = useUpdateEmployee();
  const resendInviteMutation = useResendInvite();
  const initiateResetMutation = useInitiateReset();

  // Build the correct schema depending on mode
  const schema = isEditMode ? buildEditSchema(t) : buildCreateSchema(t);
  type FormValues = typeof isEditMode extends true ? EditFormValues : CreateFormValues;

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CreateFormValues & EditFormValues>({
    resolver: zodResolver(schema as z.ZodType<CreateFormValues & EditFormValues>),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      role: 'Employee',
      salary: '',
      telegramId: '',
      dateBirth: '',
    },
  });

  // Populate form when editing
  useEffect(() => {
    if (isOpen && employee) {
      reset({
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email,
        phone: employee.phone || '',
        role: employee.role,
        salary: employee.salary ?? '',
        telegramId: employee.telegramId || '',
        dateBirth: employee.dateBirth || '',
      });
    } else if (isOpen && !employee) {
      reset({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        role: 'Employee',
        salary: '',
        telegramId: '',
        dateBirth: '',
      });
    }
  }, [isOpen, employee, reset]);

  async function onSubmit(values: CreateFormValues & EditFormValues) {
    try {
      if (isEditMode && employee) {
        await updateMutation.mutateAsync({
          id: employee.id,
          firstName: values.firstName,
          lastName: values.lastName,
          phone: values.phone || undefined,
          role: values.role,
          salary: values.salary ? Number(values.salary) : undefined,
          telegramId: values.telegramId || undefined,
          dateBirth: values.dateBirth || undefined,
        });
        toast.success(t('employees.employeeUpdated'));
      } else {
        const result = await createMutation.mutateAsync({
          firstName: values.firstName,
          lastName: values.lastName,
          email: values.email,
          phone: values.phone || undefined,
          role: values.role,
          salary: values.salary ? Number(values.salary) : undefined,
        });

        // If email was not sent, copy invite URL to clipboard
        if (!result.emailSent && result.inviteUrl) {
          await navigator.clipboard.writeText(result.inviteUrl);
          toast.success(t('employees.inviteLinkCopied'));
        } else {
          toast.success(t('employees.employeeCreated'));
        }
      }
      onClose();
    } catch {
      toast.error(
        isEditMode ? t('employees.updateError') : t('employees.createError'),
      );
    }
  }

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

  async function handleResetPassword() {
    if (!employee) return;
    try {
      await initiateResetMutation.mutateAsync(employee.id);
      toast.success(t('employees.resetSent'));
    } catch {
      toast.error(t('employees.resetError'));
    }
  }

  const isBusy =
    isSubmitting ||
    createMutation.isPending ||
    updateMutation.isPending;

  // Determine if the employee has accepted their invite (has updatedAt != createdAt as heuristic)
  // The spec says "Pending" status users get Resend Invite, "Active" users get Reset Password
  // We check if createdAt !== updatedAt as a proxy, but the safer check is
  // whether they have logged in (the API status). For now we treat presence of
  // updatedAt > createdAt as active (password was set via invite acceptance).
  const isPending = employee ? employee.createdAt === employee.updatedAt : false;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? t('employees.editEmployee') : t('employees.addEmployee')}
      size="md"
      actions={
        <div className="flex items-center gap-3 w-full">
          {/* Admin-only invite/reset actions in edit mode */}
          {isEditMode && employee && currentUser?.role === 'Admin' && (
            <div className="flex gap-2 mr-auto">
              {isPending ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  loading={resendInviteMutation.isPending}
                  onClick={handleResendInvite}
                >
                  {t('employees.resendInvite')}
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  loading={initiateResetMutation.isPending}
                  onClick={handleResetPassword}
                >
                  {t('employees.resetPassword')}
                </Button>
              )}
            </div>
          )}

          <Button variant="ghost" onClick={onClose} disabled={isBusy}>
            {t('common.cancel')}
          </Button>
          <Button
            type="submit"
            form="employee-form"
            loading={isBusy}
          >
            {isEditMode ? t('common.save') : t('common.create')}
          </Button>
        </div>
      }
    >
      <form
        id="employee-form"
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-4"
        noValidate
      >
        {/* First name + Last name */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            label={t('employees.firstName')}
            placeholder={t('employees.firstNamePlaceholder')}
            error={errors.firstName?.message}
            {...register('firstName')}
          />
          <Input
            label={t('employees.lastName')}
            placeholder={t('employees.lastNamePlaceholder')}
            error={errors.lastName?.message}
            {...register('lastName')}
          />
        </div>

        {/* Email (create only) */}
        {!isEditMode && (
          <Input
            label={t('employees.email')}
            type="email"
            placeholder={t('employees.emailPlaceholder')}
            error={errors.email?.message}
            {...register('email')}
          />
        )}

        {/* Phone */}
        <Input
          label={t('employees.phone')}
          placeholder={t('employees.phonePlaceholder')}
          error={errors.phone?.message}
          {...register('phone')}
        />

        {/* Role */}
        <Controller
          name="role"
          control={control}
          render={({ field }) => (
            <Select
              label={t('employees.role')}
              options={roleOptions}
              error={errors.role?.message}
              {...field}
            />
          )}
        />

        {/* Salary */}
        <Input
          label={t('employees.salary')}
          type="number"
          placeholder={t('employees.salaryPlaceholder')}
          error={errors.salary?.message}
          {...register('salary')}
        />

        {/* Edit-only fields */}
        {isEditMode && (
          <>
            <Input
              label={t('employees.telegramId')}
              placeholder="Telegram ID"
              error={errors.telegramId?.message}
              {...register('telegramId')}
            />
            <DatePicker
              label={t('employees.birthDate')}
              error={errors.dateBirth?.message}
              {...register('dateBirth')}
            />
          </>
        )}
      </form>
    </Modal>
  );
}
