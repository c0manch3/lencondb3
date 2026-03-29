import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { api } from '@/services/auth.service';

const schema = z
  .object({
    password: z.string().min(8, 'Пароль должен содержать минимум 8 символов'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Пароли не совпадают',
    path: ['confirmPassword'],
  });

type FormData = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [firstName, setFirstName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (!token) {
      setError('Ссылка истекла. Обратитесь к администратору');
      setLoading(false);
      return;
    }

    api
      .get(`/invite/validate/${token}`)
      .then((res) => {
        if (!res.data.valid) {
          setError(res.data.message || 'Ссылка недействительна. Обратитесь к администратору');
          setLoading(false);
          return;
        }
        setFirstName(res.data.firstName);
        setLoading(false);
      })
      .catch(() => {
        setError('Ссылка истекла. Обратитесь к администратору');
        setLoading(false);
      });
  }, [token]);

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      await api.post('/invite/reset-password', {
        token,
        password: data.password,
      });
      toast.success('Пароль изменён. Войдите в систему');
      navigate('/login');
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'Ошибка при сбросе пароля';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-dvh flex items-center justify-center bg-brown-900 px-4">
      <div className="w-full max-w-md">
        <div className="bg-cream-50 rounded-[0.4rem] shadow-xl p-8 border border-brown-200">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <svg
                className="animate-spin h-10 w-10 text-brown-600"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
                <svg
                  className="h-8 w-8 text-red-600"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <p className="text-brown-700 text-lg">{error}</p>
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-brown-900 font-mono">LenconDB</h1>
                {firstName && (
                  <h2 className="text-xl text-brown-800 mt-3">
                    Здравствуйте, {firstName}!
                  </h2>
                )}
                <p className="text-brown-500 mt-1">Сброс пароля</p>
                <p className="text-brown-400 text-sm mt-1">
                  Введите новый пароль
                </p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div>
                  <label htmlFor="password" className="label">
                    Пароль
                  </label>
                  <input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    className={`input ${errors.password ? 'input-error' : ''}`}
                    placeholder="Минимум 8 символов"
                    {...register('password')}
                  />
                  {errors.password && (
                    <p className="error-message">{errors.password.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="label">
                    Подтверждение пароля
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    className={`input ${errors.confirmPassword ? 'input-error' : ''}`}
                    placeholder="Повторите пароль"
                    {...register('confirmPassword')}
                  />
                  {errors.confirmPassword && (
                    <p className="error-message">
                      {errors.confirmPassword.message}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary w-full py-3"
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center">
                      <svg
                        className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Сброс...
                    </span>
                  ) : (
                    'Сбросить пароль'
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
