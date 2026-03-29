import { type FC, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useAuth } from '@/shared/auth/AuthContext';
import { api } from '@/shared/api/client';
import { Button, Input } from '@/shared/components';

// ─── Schema ─────────────────────────────────────────────────────────────────

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'Minimum 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

// ─── Component ──────────────────────────────────────────────────────────────

const ProfilePage: FC = () => {
  const { t } = useTranslation();
  const { user, dispatch } = useAuth();
  const navigate = useNavigate();
  const [showChangePassword, setShowChangePassword] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const onSubmit = useCallback(
    async (values: ChangePasswordFormValues) => {
      try {
        await api.patch('/auth/change-password', {
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
        });

        toast.success('Password changed successfully. Redirecting to login...');
        reset();
        setShowChangePassword(false);

        setTimeout(() => {
          dispatch({ type: 'LOGOUT' });
          navigate('/login');
        }, 1500);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Failed to change password';

        // Extract server error message from axios response if available
        if (
          typeof err === 'object' &&
          err !== null &&
          'response' in err &&
          typeof (err as Record<string, unknown>).response === 'object'
        ) {
          const response = (err as { response: { data?: { message?: string } } })
            .response;
          toast.error(response.data?.message ?? message);
        } else {
          toast.error(message);
        }
      }
    },
    [dispatch, navigate, reset],
  );

  if (!user) return null;

  const fullName = `${user.firstName} ${user.lastName}`.trim();

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      {/* Page heading */}
      <h1 className="text-2xl font-bold text-brown-900 mb-8">{t('profile.title')}</h1>

      {/* User info card */}
      <div className="bg-cream-100 border border-brown-200 rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-brown-900 mb-4">
          {t('profile.personalInfo')}
        </h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <dt className="text-xs font-medium text-brown-500 uppercase tracking-wide">
              {t('profile.name')}
            </dt>
            <dd className="mt-1 text-sm text-brown-900">{fullName}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-brown-500 uppercase tracking-wide">
              {t('profile.email')}
            </dt>
            <dd className="mt-1 text-sm text-brown-900">{user.email}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-brown-500 uppercase tracking-wide">
              {t('profile.phone')}
            </dt>
            <dd className="mt-1 text-sm text-brown-900">
              {user.phone || '\u2014'}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-brown-500 uppercase tracking-wide">
              {t('profile.role')}
            </dt>
            <dd className="mt-1 text-sm text-brown-900">{user.role}</dd>
          </div>
        </dl>
      </div>

      {/* Change password section */}
      <div className="bg-cream-100 border border-brown-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-brown-900">
            {t('profile.changePassword')}
          </h2>
          {!showChangePassword && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowChangePassword(true)}
            >
              {t('profile.changePassword')}
            </Button>
          )}
        </div>

        {showChangePassword && (
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
            noValidate
          >
            <Input
              label={t('profile.currentPassword')}
              type="password"
              autoComplete="current-password"
              error={errors.currentPassword?.message}
              {...register('currentPassword')}
            />
            <Input
              label={t('profile.newPassword')}
              type="password"
              autoComplete="new-password"
              helperText={t('profile.newPasswordPlaceholder')}
              error={errors.newPassword?.message}
              {...register('newPassword')}
            />
            <Input
              label={t('profile.confirmPassword')}
              type="password"
              autoComplete="new-password"
              error={errors.confirmPassword?.message}
              {...register('confirmPassword')}
            />

            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" loading={isSubmitting}>
                {t('common.save')}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setShowChangePassword(false);
                  reset();
                }}
                disabled={isSubmitting}
              >
                {t('common.cancel')}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
