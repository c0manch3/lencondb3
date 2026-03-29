import { type FC, useState, useCallback, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { api } from '@/shared/api/client';
import { Button, Input, ConfirmDialog, Skeleton } from '@/shared/components';

// ─── Types ──────────────────────────────────────────────────────────────────

interface SmtpConfig {
  id: string;
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  fromEmail: string;
  fromName: string;
}

// ─── Schema ─────────────────────────────────────────────────────────────────

const smtpSchema = z.object({
  host: z.string().min(1, 'Host is required'),
  port: z.coerce
    .number({ invalid_type_error: 'Port must be a number' })
    .int('Port must be an integer')
    .min(1, 'Port must be between 1 and 65535')
    .max(65535, 'Port must be between 1 and 65535'),
  secure: z.boolean(),
  username: z.string().min(1, 'Username is required'),
  password: z.string(),
  fromEmail: z
    .string()
    .min(1, 'From Email is required')
    .email('Invalid email address'),
  fromName: z.string(),
});

type SmtpFormValues = z.infer<typeof smtpSchema>;

// ─── Hook ───────────────────────────────────────────────────────────────────

function useSmtpConfig() {
  return useQuery<SmtpConfig | null>({
    queryKey: ['smtp-config'],
    queryFn: async () => {
      const { data } = await api.get<SmtpConfig | null>('/smtp/config');
      return data;
    },
  });
}

// ─── View mode ──────────────────────────────────────────────────────────────

interface InfoRowProps {
  label: string;
  value: string;
}

const InfoRow: FC<InfoRowProps> = ({ label, value }) => (
  <div>
    <dt className="text-xs font-medium text-brown-500 uppercase tracking-wide">
      {label}
    </dt>
    <dd className="mt-1 text-sm text-brown-900">{value}</dd>
  </div>
);

// ─── Component ──────────────────────────────────────────────────────────────

const SmtpSettingsPage: FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: config, isLoading, isError } = useSmtpConfig();

  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  // Determine if creating a new config (no existing config)
  const isNewConfig = !config;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SmtpFormValues>({
    resolver: zodResolver(
      isNewConfig
        ? smtpSchema.refine((data) => data.password.length > 0, {
            message: 'Password is required',
            path: ['password'],
          })
        : smtpSchema,
    ),
    defaultValues: {
      host: '',
      port: 587,
      secure: true,
      username: '',
      password: '',
      fromEmail: '',
      fromName: 'LenconDB',
    },
  });

  // Populate form when config loads or when entering edit mode
  useEffect(() => {
    if (config && isEditing) {
      reset({
        host: config.host,
        port: config.port,
        secure: config.secure,
        username: config.username,
        password: '',
        fromEmail: config.fromEmail,
        fromName: config.fromName || 'LenconDB',
      });
    }
  }, [config, isEditing, reset]);

  // Auto-enter edit mode when no config exists
  useEffect(() => {
    if (!isLoading && isNewConfig) {
      setIsEditing(true);
    }
  }, [isLoading, isNewConfig]);

  const onSubmit = useCallback(
    async (values: SmtpFormValues) => {
      try {
        // On edit, if password is empty, omit it so server keeps the current one
        const payload = { ...values };
        if (!isNewConfig && payload.password === '') {
          const { password: _, ...rest } = payload;
          await api.post('/smtp/config', rest);
        } else {
          await api.post('/smtp/config', payload);
        }

        toast.success(
          isNewConfig
            ? 'SMTP configuration created'
            : 'SMTP configuration updated',
        );
        await queryClient.invalidateQueries({ queryKey: ['smtp-config'] });
        setIsEditing(false);
      } catch (err: unknown) {
        const fallback = 'Failed to save SMTP configuration';
        if (
          typeof err === 'object' &&
          err !== null &&
          'response' in err &&
          typeof (err as Record<string, unknown>).response === 'object'
        ) {
          const response = (err as { response: { data?: { message?: string } } })
            .response;
          toast.error(response.data?.message ?? fallback);
        } else {
          toast.error(fallback);
        }
      }
    },
    [isNewConfig, queryClient],
  );

  const handleDelete = useCallback(async () => {
    if (!config) return;
    setIsDeleting(true);
    try {
      await api.delete(`/smtp/config/${config.id}`);
      toast.success('SMTP configuration deleted');
      await queryClient.invalidateQueries({ queryKey: ['smtp-config'] });
      setIsDeleteOpen(false);
      setIsEditing(true);
    } catch {
      toast.error('Failed to delete SMTP configuration');
    } finally {
      setIsDeleting(false);
    }
  }, [config, queryClient]);

  const handleTestEmail = useCallback(async () => {
    setIsTesting(true);
    try {
      await api.post('/smtp/test');
      toast.success('Test email sent. Check your inbox.');
    } catch {
      toast.error('Failed to send test email');
    } finally {
      setIsTesting(false);
    }
  }, []);

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    reset();
  }, [reset]);

  // ─── Loading / Error states ─────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold text-brown-900 mb-8">
          {t('smtp.title')}
        </h1>
        <div className="bg-cream-100 border border-brown-200 rounded-xl p-6">
          <Skeleton rows={6} height="h-5" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold text-brown-900 mb-8">
          {t('smtp.title')}
        </h1>
        <div className="bg-cream-100 border border-brown-200 rounded-xl p-6">
          <p className="text-sm text-red-600">
            {t('smtp.loadError')}
          </p>
        </div>
      </div>
    );
  }

  // ─── View mode ──────────────────────────────────────────────────────────

  if (!isEditing && config) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold text-brown-900 mb-8">
          {t('smtp.title')}
        </h1>

        <div className="bg-cream-100 border border-brown-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-brown-900 mb-4">
            {t('smtp.currentConfiguration')}
          </h2>

          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <InfoRow label={t('smtp.host')} value={config.host} />
            <InfoRow label={t('smtp.port')} value={String(config.port)} />
            <InfoRow label={t('smtp.sslTls')} value={config.secure ? t('common.yes') : t('common.no')} />
            <InfoRow label={t('smtp.username')} value={config.username} />
            <InfoRow label={t('smtp.password')} value="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" />
            <InfoRow label={t('smtp.fromEmail')} value={config.fromEmail} />
            <InfoRow label={t('smtp.fromName')} value={config.fromName || '\u2014'} />
          </dl>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsEditing(true)}
            >
              {t('common.edit')}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleTestEmail}
              loading={isTesting}
            >
              {t('smtp.testEmail')}
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setIsDeleteOpen(true)}
            >
              {t('common.delete')}
            </Button>
          </div>
        </div>

        <ConfirmDialog
          isOpen={isDeleteOpen}
          onClose={() => setIsDeleteOpen(false)}
          onConfirm={handleDelete}
          title={t('smtp.deleteTitle')}
          message={t('smtp.deleteMessage')}
          confirmLabel={t('common.delete')}
          cancelLabel={t('common.cancel')}
          loading={isDeleting}
        />
      </div>
    );
  }

  // ─── Edit / Create mode ─────────────────────────────────────────────────

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-brown-900 mb-8">
        {t('smtp.title')}
      </h1>

      <div className="bg-cream-100 border border-brown-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-brown-900 mb-4">
          {isNewConfig ? t('smtp.createConfiguration') : t('smtp.editConfiguration')}
        </h2>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
          noValidate
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label={t('smtp.host')}
              placeholder="smtp.example.com"
              error={errors.host?.message}
              {...register('host')}
            />
            <Input
              label={t('smtp.port')}
              type="number"
              placeholder="587"
              error={errors.port?.message}
              {...register('port', { valueAsNumber: true })}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="smtp-secure"
              className="h-4 w-4 accent-brown-700 rounded border-brown-300 focus:ring-brown-500 cursor-pointer"
              {...register('secure')}
            />
            <label
              htmlFor="smtp-secure"
              className="text-sm font-medium text-brown-800 cursor-pointer select-none"
            >
              {t('smtp.sslTls')}
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label={t('smtp.username')}
              autoComplete="username"
              error={errors.username?.message}
              {...register('username')}
            />
            <Input
              label={t('smtp.password')}
              type="password"
              autoComplete="new-password"
              helperText={
                isNewConfig ? undefined : t('smtp.leaveEmptyToKeep')
              }
              error={errors.password?.message}
              {...register('password')}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label={t('smtp.fromEmail')}
              type="email"
              placeholder="noreply@example.com"
              error={errors.fromEmail?.message}
              {...register('fromEmail')}
            />
            <Input
              label={t('smtp.fromName')}
              placeholder="LenconDB"
              error={errors.fromName?.message}
              {...register('fromName')}
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" loading={isSubmitting}>
              {isNewConfig ? t('common.create') : t('common.save')}
            </Button>
            {!isNewConfig && (
              <Button
                type="button"
                variant="ghost"
                onClick={handleCancelEdit}
                disabled={isSubmitting}
              >
                {t('common.cancel')}
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default SmtpSettingsPage;
