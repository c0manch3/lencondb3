import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';

import { api } from '@/shared/api/client';
import { useAuthDispatch } from '@/shared/auth/AuthContext';
import type { User } from '@/shared/types';
import AsciiBackground from '@/shared/components/AsciiBackground';
import Button from '@/shared/components/Button';
import Input from '@/shared/components/Input';

// ─── Schema ─────────────────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'auth.invalidEmail')
    .email('auth.invalidEmail'),
  password: z
    .string()
    .min(6, 'auth.passwordMinLength'),
});

type LoginFormData = z.infer<typeof loginSchema>;

// ─── API Response ───────────────────────────────────────────────────────────

interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const dispatch = useAuthDispatch();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsSubmitting(true);

    try {
      const response = await api.post<LoginResponse>('/auth/login', {
        email: data.email,
        password: data.password,
      });

      const { user, accessToken, refreshToken } = response.data;

      dispatch({
        type: 'SET_CREDENTIALS',
        payload: { user, accessToken, refreshToken },
      });

      toast.success(t('auth.loginSuccess'));

      const redirectTo = searchParams.get('redirect') || '/projects';
      navigate(redirectTo, { replace: true });
    } catch {
      toast.error(t('auth.invalidCredentials'));
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
        <div className="text-center mb-8">
          <h1 className="font-mono text-3xl font-bold text-brown-900 mb-2">
            LenconDB
          </h1>
          <p className="text-sm text-brown-500">
            {t('auth.loginSubtitle')}
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <Input
            {...register('email')}
            type="email"
            label={t('auth.email')}
            placeholder={t('auth.emailPlaceholder')}
            error={errors.email ? t(errors.email.message!) : undefined}
            autoComplete="email"
            autoFocus
          />

          <Input
            {...register('password')}
            type="password"
            label={t('auth.password')}
            placeholder={t('auth.passwordPlaceholder')}
            error={errors.password ? t(errors.password.message!) : undefined}
            autoComplete="current-password"
          />

          <Button
            type="submit"
            size="lg"
            loading={isSubmitting}
            className="w-full mt-2"
          >
            {isSubmitting ? t('auth.signingIn') : t('auth.loginButton')}
          </Button>
        </form>
      </div>
    </div>
  );
}
