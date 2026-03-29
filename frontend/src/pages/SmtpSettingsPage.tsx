import { useEffect, useState } from 'react';
import { api } from '@/services/auth.service';
import toast from 'react-hot-toast';

interface SmtpConfig {
  id: string;
  host: string;
  port: number;
  secure: boolean;
  username: string;
  passwordMasked: string;
  fromEmail: string;
  fromName: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface SmtpForm {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  fromEmail: string;
  fromName: string;
}

const defaultForm: SmtpForm = {
  host: '',
  port: 587,
  secure: true,
  username: '',
  password: '',
  fromEmail: '',
  fromName: 'LenconDB',
};

export default function SmtpSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<SmtpConfig | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [form, setForm] = useState<SmtpForm>({ ...defaultForm });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const response = await api.get('/smtp/config');
      const data = response.data;
      if (data) {
        setConfig(data);
        setIsEditing(false);
      } else {
        setConfig(null);
        setIsEditing(true);
      }
    } catch {
      toast.error('Ошибка загрузки настроек SMTP');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    // Client-side validation
    if (!form.host.trim()) {
      toast.error('Укажите хост SMTP-сервера');
      return;
    }
    if (!form.port || form.port < 1 || form.port > 65535) {
      toast.error('Укажите корректный порт (1-65535)');
      return;
    }
    if (!form.username.trim()) {
      toast.error('Укажите имя пользователя');
      return;
    }
    // Password required for new config, optional for edit
    if (!config && !form.password.trim()) {
      toast.error('Укажите пароль');
      return;
    }
    if (!form.fromEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.fromEmail)) {
      toast.error('Укажите корректный email отправителя');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        host: form.host,
        port: form.port,
        secure: form.secure,
        username: form.username,
        fromEmail: form.fromEmail,
        fromName: form.fromName || 'LenconDB',
      };
      // Only include password if provided (empty = keep current when editing)
      if (form.password.trim()) {
        payload.password = form.password;
      } else if (!config) {
        // New config requires password
        payload.password = form.password;
      }

      const response = await api.post('/smtp/config', payload);
      setConfig(response.data);
      setIsEditing(false);
      toast.success('Настройки SMTP сохранены');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Ошибка сохранения настроек');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    try {
      const response = await api.post('/smtp/test');
      if (response.data.success) {
        toast.success('Тестовое письмо отправлено на вашу почту');
      } else {
        toast.error('Ошибка отправки. Проверьте настройки SMTP');
      }
    } catch {
      toast.error('Ошибка отправки. Проверьте настройки SMTP');
    } finally {
      setIsTesting(false);
    }
  };

  const handleDelete = async () => {
    if (!config) return;
    setIsSubmitting(true);
    try {
      await api.delete(`/smtp/config/${config.id}`);
      setConfig(null);
      setIsEditing(true);
      setForm({ ...defaultForm });
      setShowDeleteConfirm(false);
      toast.success('Настройки SMTP удалены');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Ошибка удаления');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = () => {
    if (config) {
      setForm({
        host: config.host,
        port: config.port,
        secure: config.secure,
        username: config.username,
        password: '', // Don't pre-fill password
        fromEmail: config.fromEmail,
        fromName: config.fromName,
      });
    }
    setIsEditing(true);
  };

  const handleCancel = () => {
    if (config) {
      setIsEditing(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brown-600" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-brown-900">Настройки SMTP</h1>
        <p className="mt-1 text-sm text-brown-500">
          Настройте отправку email для приглашений и сброса паролей
        </p>
      </div>

      <div className="bg-cream-50 rounded-[0.4rem] shadow-sm border border-brown-200">
        {!isEditing && config ? (
          // View mode
          <>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-brown-500">Хост</span>
                  <p className="text-brown-900 font-medium">{config.host}</p>
                </div>
                <div>
                  <span className="text-sm text-brown-500">Порт</span>
                  <p className="text-brown-900 font-medium">{config.port}</p>
                </div>
                <div>
                  <span className="text-sm text-brown-500">Шифрование (SSL/TLS)</span>
                  <p className="text-brown-900 font-medium">{config.secure ? 'Да' : 'Нет'}</p>
                </div>
                <div>
                  <span className="text-sm text-brown-500">Имя пользователя</span>
                  <p className="text-brown-900 font-medium">{config.username}</p>
                </div>
                <div>
                  <span className="text-sm text-brown-500">Пароль</span>
                  <p className="text-brown-900 font-medium font-mono text-sm">{config.passwordMasked}</p>
                </div>
                <div>
                  <span className="text-sm text-brown-500">Email отправителя</span>
                  <p className="text-brown-900 font-medium">{config.fromEmail}</p>
                </div>
                <div>
                  <span className="text-sm text-brown-500">Имя отправителя</span>
                  <p className="text-brown-900 font-medium">{config.fromName}</p>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 p-5 border-t border-brown-200">
              <button
                onClick={handleEdit}
                className="px-4 py-2 text-sm font-medium text-brown-700 bg-brown-50 border border-brown-200 rounded-[0.4rem] hover:bg-brown-100 transition-colors"
              >
                Изменить
              </button>
              <button
                onClick={handleTest}
                disabled={isTesting}
                className="px-4 py-2 text-sm font-medium text-brown-700 bg-cream-50 border border-brown-300 rounded-[0.4rem] hover:bg-cream-50 transition-colors disabled:opacity-50"
              >
                {isTesting ? (
                  <span className="flex items-center">
                    <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-brown-600 mr-2" />
                    Отправка...
                  </span>
                ) : (
                  'Тестовое письмо'
                )}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-[0.4rem] hover:bg-red-100 transition-colors"
              >
                Удалить
              </button>
            </div>
          </>
        ) : (
          // Edit/Create mode
          <>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-brown-700 mb-1">
                    Хост <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.host}
                    onChange={(e) => setForm({ ...form, host: e.target.value })}
                    placeholder="smtp.gmail.com"
                    className="w-full px-3 py-2 border border-brown-300 rounded-[0.4rem] focus:ring-2 focus:ring-brown-500 focus:border-brown-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-brown-700 mb-1">
                    Порт <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={form.port}
                    onChange={(e) => setForm({ ...form, port: parseInt(e.target.value) || 0 })}
                    min={1}
                    max={65535}
                    className="w-full px-3 py-2 border border-brown-300 rounded-[0.4rem] focus:ring-2 focus:ring-brown-500 focus:border-brown-500"
                  />
                </div>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="smtp-secure"
                  checked={form.secure}
                  onChange={(e) => setForm({ ...form, secure: e.target.checked })}
                  className="h-4 w-4 text-brown-600 border-brown-300 rounded focus:ring-brown-500"
                />
                <label htmlFor="smtp-secure" className="ml-2 text-sm text-brown-700">
                  Использовать SSL/TLS
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-brown-700 mb-1">
                  Имя пользователя <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  placeholder="user@gmail.com"
                  className="w-full px-3 py-2 border border-brown-300 rounded-[0.4rem] focus:ring-2 focus:ring-brown-500 focus:border-brown-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-brown-700 mb-1">
                  Пароль {!config && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder={config ? 'Оставьте пустым, чтобы сохранить текущий' : 'Пароль SMTP'}
                  className="w-full px-3 py-2 border border-brown-300 rounded-[0.4rem] focus:ring-2 focus:ring-brown-500 focus:border-brown-500"
                />
                {config && (
                  <p className="mt-1 text-xs text-brown-500">
                    Оставьте пустым, чтобы сохранить текущий пароль
                  </p>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-brown-700 mb-1">
                    Email отправителя <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={form.fromEmail}
                    onChange={(e) => setForm({ ...form, fromEmail: e.target.value })}
                    placeholder="noreply@company.com"
                    className="w-full px-3 py-2 border border-brown-300 rounded-[0.4rem] focus:ring-2 focus:ring-brown-500 focus:border-brown-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-brown-700 mb-1">
                    Имя отправителя
                  </label>
                  <input
                    type="text"
                    value={form.fromName}
                    onChange={(e) => setForm({ ...form, fromName: e.target.value })}
                    placeholder="LenconDB"
                    className="w-full px-3 py-2 border border-brown-300 rounded-[0.4rem] focus:ring-2 focus:ring-brown-500 focus:border-brown-500"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-brown-200">
              {config && (
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 text-sm text-brown-700 bg-cream-100 rounded-[0.4rem] hover:bg-cream-200"
                >
                  Отмена
                </button>
              )}
              <button
                onClick={handleSave}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm text-white bg-brown-600 rounded-[0.4rem] hover:bg-brown-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-brown-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-cream-50 rounded-[0.4rem] shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-brown-900 mb-2">Удалить настройки SMTP?</h3>
            <p className="text-sm text-brown-600 mb-4">
              Отправка email будет невозможна. Приглашения и сброс паролей будут работать только через копирование ссылки.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm text-brown-700 bg-cream-100 rounded-[0.4rem] hover:bg-cream-200"
              >
                Отмена
              </button>
              <button
                onClick={handleDelete}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm text-white bg-red-600 rounded-[0.4rem] hover:bg-red-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Удаление...' : 'Удалить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
