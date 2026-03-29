import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';

import { api } from '@/shared/api/client';
import AsciiBackground from '@/shared/components/AsciiBackground';
import Button from '@/shared/components/Button';
import Input from '@/shared/components/Input';
import Spinner from '@/shared/components/Spinner';

// ─── Schema ─────────────────────────────────────────────────────────────────

const passwordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'auth.passwordMinLength8'),
    confirmPassword: z
      .string()
      .min(1, 'validation.required'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'auth.passwordMismatch',
    path: ['confirmPassword'],
  });

type PasswordFormData = z.infer<typeof passwordSchema>;

// ─── API Responses ──────────────────────────────────────────────────────────

interface ValidateResponse {
  valid: boolean;
  firstName?: string;
  message?: string;
}

// ─── Token Validation States ────────────────────────────────────────────────

type TokenState =
  | { status: 'loading' }
  | { status: 'valid'; firstName: string }
  | { status: 'invalid' };

// ─── Component ──────────────────────────────────────────────────────────────

export default function AcceptInvitePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { token } = useParams<{ token: string }>();
  const [tokenState, setTokenState] = useState<TokenState>({ status: 'loading' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  useEffect(() => {
    if (!token) {
      setTokenState({ status: 'invalid' });
      return;
    }

    let cancelled = false;

    async function validateToken() {
      try {
        const response = await api.get<ValidateResponse>(
          `/invite/validate/${encodeURIComponent(token!)}`,
        );

        if (cancelled) return;

        if (response.data.valid) {
          setTokenState({
            status: 'valid',
            firstName: response.data.firstName ?? '',
          });
        } else {
          setTokenState({ status: 'invalid' });
        }
      } catch {
        if (!cancelled) {
          setTokenState({ status: 'invalid' });
        }
      }
    }

    validateToken();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const onSubmit = async (data: PasswordFormData) => {
    if (!token) return;

    setIsSubmitting(true);

    try {
      await api.post('/invite/accept', {
        token,
        password: data.password,
      });

      toast.success(t('auth.passwordCreated'));
      navigate('/login', { replace: true });
    } catch {
      toast.error(t('common.error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-dvh bg-brown-900 flex items-center justify-center px-4">
      <AsciiBackground
        opacity={0.08}
        color="#f9f0d9"
        className="fixed inset-0 w-full h-full"
      />

      <div className="relative z-10 bg-cream-50 rounded-xl border border-brown-200 p-8 w-full max-w-md">
        {tokenState.status === 'loading' && (
          <div className="flex flex-col items-center gap-4 py-8">
            <Spinner size="lg" />
            <p className="text-sm text-brown-500">{t('auth.validatingToken')}</p>
          </div>
        )}

        {tokenState.status === 'invalid' && (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-brown-900">
              {t('auth.inviteLinkExpired')}
            </h2>
            <p className="text-sm text-brown-500">
              {t('auth.inviteLinkExpiredDescription')}
            </p>
            <Link
              to="/login"
              className="text-sm font-medium text-brown-700 underline underline-offset-2 hover:text-brown-900 transition-colors duration-200"
            >
              {t('auth.backToLogin')}
            </Link>
          </div>
        )}

        {tokenState.status === 'valid' && (
          <>
            <div className="text-center mb-8">
              <h1 className="font-mono text-3xl font-bold text-brown-900 mb-2">
                LenconDB
              </h1>
              <p className="text-base font-medium text-brown-800 mb-1">
                {t('auth.welcomeUser', { name: tokenState.firstName })}
              </p>
              <p className="text-sm text-brown-500">
                {t('auth.createYourPassword')}
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
              <Input
                {...register('password')}
                type="password"
                label={t('auth.newPassword')}
                placeholder={t('auth.newPasswordPlaceholder')}
                error={errors.password ? t(errors.password.message!) : undefined}
                autoComplete="new-password"
                autoFocus
              />

              <Input
                {...register('confirmPassword')}
                type="password"
                label={t('auth.confirmPassword')}
                placeholder={t('auth.confirmPasswordPlaceholder')}
                error={errors.confirmPassword ? t(errors.confirmPassword.message!) : undefined}
                autoComplete="new-password"
              />

              <Button
                type="submit"
                size="lg"
                loading={isSubmitting}
                className="w-full mt-2"
              >
                {isSubmitting ? t('auth.creatingPassword') : t('auth.createPassword')}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
