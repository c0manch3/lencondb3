import { useEffect, useState } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { useAuthState } from '@/store/AuthContext';
import { api } from '@/services/auth.service';
import type { PaginatedResponse } from '@/types';
import toast from 'react-hot-toast';

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  salary?: number;
  telegramId?: string;
  dateBirth?: string;
  inviteStatus?: 'Active' | 'Pending';
}

interface NewEmployeeForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: 'Admin' | 'Manager' | 'Employee' | 'Trial';
  salary: string;
}

interface EditEmployeeForm {
  firstName: string;
  lastName: string;
  phone: string;
  role: 'Admin' | 'Manager' | 'Employee' | 'Trial';
  salary: string;
  telegramId: string;
  dateBirth: string;
}

export default function EmployeesPage() {
  const { t } = useTranslation();
  const { user } = useAuthState();
  const isAdmin = user?.role === 'Admin';
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<{
    employeeId: string;
    employeeName: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [newEmployee, setNewEmployee] = useState<NewEmployeeForm>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: 'Employee',
    salary: '',
  });
  const [editEmployee, setEditEmployee] = useState<EditEmployeeForm>({
    firstName: '',
    lastName: '',
    phone: '',
    role: 'Employee',
    salary: '',
    telegramId: '',
    dateBirth: '',
  });
  const [emailError, setEmailError] = useState('');
  const [phoneError, setPhoneError] = useState('');

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && deleteModal && !isDeleting) {
        setDeleteModal(null);
      }
    };
    if (deleteModal) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [deleteModal, isDeleting]);

  const fetchEmployees = async () => {
    try {
      const response = await api.get<PaginatedResponse<Employee>>('/auth?limit=1000');
      setEmployees(response.data.data);
    } catch (error) {
      toast.error(t('errors.somethingWentWrong'));
    } finally {
      setLoading(false);
    }
  };

  // Feature #340: Format currency with ruble symbol
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
    }).format(amount);
  };

  const handleRowClick = (employee: Employee) => {
    setSelectedEmployee(employee);
    setShowDetailModal(true);
  };

  const handleCloseDetailModal = () => {
    setShowDetailModal(false);
    setSelectedEmployee(null);
  };

  const handleDeleteClick = (e: React.MouseEvent, employee: Employee) => {
    e.stopPropagation();
    setDeleteModal({
      employeeId: employee.id,
      employeeName: `${employee.firstName} ${employee.lastName}`,
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal || isDeleting) return;
    setIsDeleting(true);
    try {
      await api.delete(`/auth/${deleteModal.employeeId}`);
      toast.success(t('employees.employeeDeleted'));
      fetchEmployees();
      setDeleteModal(null);
    } catch (error: any) {
      const message = error.response?.data?.message;
      if (message) {
        toast.error(message);
      } else {
        toast.error(t('errors.somethingWentWrong'));
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    if (isDeleting) return;
    setDeleteModal(null);
  };

  const handleOpenAddModal = () => {
    setNewEmployee({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      role: 'Employee',
      salary: '',
    });
    setEmailError('');
    setPhoneError('');
    setShowAddModal(true);
  };

  const handleCloseAddModal = () => {
    setShowAddModal(false);
    setNewEmployee({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      role: 'Employee',
      salary: '',
    });
  };

  // Simple email validation regex
  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Phone validation - must be numeric with optional + prefix
  const isValidPhone = (phone: string) => {
    if (!phone) return true; // Phone is optional
    const phoneRegex = /^\+?[0-9]{7,15}$/;
    return phoneRegex.test(phone);
  };

  const handleCreateEmployee = async () => {
    // Reset errors
    setEmailError('');
    setPhoneError('');

    if (!newEmployee.firstName.trim() || !newEmployee.lastName.trim()) {
      toast.error(t('validation.required'));
      return;
    }
    if (!newEmployee.email.trim()) {
      setEmailError(t('validation.required'));
      toast.error(t('validation.required'));
      return;
    }
    if (!isValidEmail(newEmployee.email)) {
      setEmailError(t('validation.email'));
      toast.error(t('validation.email'));
      return;
    }
    if (newEmployee.phone && !isValidPhone(newEmployee.phone)) {
      setPhoneError(t('validation.phone'));
      toast.error(t('validation.phone'));
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await api.post('/invite/create', {
        firstName: newEmployee.firstName,
        lastName: newEmployee.lastName,
        email: newEmployee.email,
        phone: newEmployee.phone || undefined,
        role: newEmployee.role,
        salary: newEmployee.salary ? parseFloat(newEmployee.salary) : undefined,
      });

      if (response.data.emailSent) {
        toast.success('Приглашение отправлено');
      } else {
        toast.success('Пользователь создан. Email не отправлен — скопируйте ссылку');
        if (response.data.inviteUrl) {
          try {
            await navigator.clipboard.writeText(response.data.inviteUrl);
            toast.success('Ссылка скопирована в буфер обмена');
          } catch {
            // Clipboard may not be available
          }
        }
      }

      fetchEmployees();
      handleCloseAddModal();
    } catch (error: any) {
      let errorMessage = error.response?.data?.message || t('errors.somethingWentWrong');
      // Handle array of messages from backend validation
      if (Array.isArray(errorMessage)) {
        errorMessage = errorMessage.join(', ');
      }
      toast.error(errorMessage);
      // Highlight email and/or phone field if duplicate or validation error
      const lowerMessage = errorMessage.toLowerCase();
      if (lowerMessage.includes('already exists') || lowerMessage.includes('email must be an email')) {
        if (lowerMessage.includes('email')) {
          setEmailError(t('validation.email'));
        }
        if (lowerMessage.includes('phone')) {
          setPhoneError(t('validation.phone'));
        }
        // If message says "email or phone", highlight both
        if (lowerMessage.includes('email or phone')) {
          setEmailError(t('validation.email'));
          setPhoneError(t('validation.phone'));
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendInvite = async () => {
    if (!selectedEmployee) return;
    setActionLoading('resend');
    try {
      const response = await api.post(`/invite/resend/${selectedEmployee.id}`);
      if (response.data.emailSent) {
        toast.success('Приглашение отправлено повторно');
      } else {
        toast.success('Токен обновлён. Email не отправлен');
        if (response.data.inviteUrl) {
          try {
            await navigator.clipboard.writeText(response.data.inviteUrl);
            toast.success('Ссылка скопирована в буфер обмена');
          } catch {
            // Clipboard may not be available
          }
        }
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('errors.somethingWentWrong'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleCopyInviteLink = async () => {
    if (!selectedEmployee) return;
    setActionLoading('copy');
    try {
      const response = await api.post(`/invite/resend/${selectedEmployee.id}`);
      if (response.data.inviteUrl) {
        await navigator.clipboard.writeText(response.data.inviteUrl);
        toast.success('Ссылка скопирована');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('errors.somethingWentWrong'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleResetPassword = async () => {
    if (!selectedEmployee) return;
    setActionLoading('reset');
    try {
      const response = await api.post(`/invite/initiate-reset/${selectedEmployee.id}`);
      if (response.data.emailSent) {
        toast.success('Ссылка для сброса пароля отправлена');
      } else {
        if (response.data.resetUrl) {
          try {
            await navigator.clipboard.writeText(response.data.resetUrl);
            toast.success('Ссылка скопирована');
          } catch {
            // Clipboard may not be available
          }
        }
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('errors.somethingWentWrong'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleOpenEditModal = () => {
    if (selectedEmployee) {
      setEditEmployee({
        firstName: selectedEmployee.firstName,
        lastName: selectedEmployee.lastName,
        phone: selectedEmployee.phone || '',
        role: selectedEmployee.role as EditEmployeeForm['role'],
        salary: selectedEmployee.salary !== undefined && selectedEmployee.salary !== null
          ? String(selectedEmployee.salary)
          : '',
        telegramId: selectedEmployee.telegramId || '',
        dateBirth: selectedEmployee.dateBirth ? selectedEmployee.dateBirth.split('T')[0] : '',
      });
      setShowDetailModal(false);
      setShowEditModal(true);
    }
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditEmployee({
      firstName: '',
      lastName: '',
      phone: '',
      role: 'Employee',
      salary: '',
      telegramId: '',
      dateBirth: '',
    });
  };

  const handleUpdateEmployee = async () => {
    if (!selectedEmployee) return;
    if (!editEmployee.firstName.trim() || !editEmployee.lastName.trim()) {
      toast.error(t('validation.required'));
      return;
    }
    setIsSubmitting(true);
    try {
      await api.patch(`/auth/${selectedEmployee.id}`, {
        firstName: editEmployee.firstName,
        lastName: editEmployee.lastName,
        phone: editEmployee.phone || undefined,
        role: editEmployee.role,
        salary: editEmployee.salary ? parseFloat(editEmployee.salary) : undefined,
        telegramId: editEmployee.telegramId || undefined,
        dateBirth: editEmployee.dateBirth ? new Date(editEmployee.dateBirth) : undefined,
      });
      toast.success(t('employees.employeeUpdated'));
      fetchEmployees();
      handleCloseEditModal();
      setSelectedEmployee(null);
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('errors.somethingWentWrong'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'Admin':
        return t('employees.roleAdmin');
      case 'Manager':
        return t('employees.roleManager');
      case 'Employee':
        return t('employees.roleEmployee');
      case 'Trial':
        return t('employees.roleTrial');
      default:
        return role;
    }
  };

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-title">{t('employees.title')}</h1>
        {isAdmin && <button className="btn-primary" onClick={handleOpenAddModal}>Пригласить</button>}
      </div>

      <div className="card">
        {loading ? (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brown-600 mx-auto"></div>
          </div>
        ) : employees.length === 0 ? (
          <p className="text-brown-500 text-center py-12">{t('employees.noEmployees')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-cream-100 border-b border-brown-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-brown-500 uppercase tracking-wider">{t('common.name')}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-brown-500 uppercase tracking-wider">{t('employees.email')}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-brown-500 uppercase tracking-wider">{t('employees.phone')}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-brown-500 uppercase tracking-wider">{t('employees.role')}</th>
                  {isAdmin && <th className="px-4 py-3 text-left text-xs font-medium text-brown-500 uppercase tracking-wider">Статус</th>}
                  {isAdmin && <th className="px-4 py-3 text-left text-xs font-medium text-brown-500 uppercase tracking-wider">{t('common.actions')}</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-brown-200">
                {employees.map((employee) => (
                  <tr
                    key={employee.id}
                    onClick={() => handleRowClick(employee)}
                    className="hover:bg-cream-50 cursor-pointer"
                  >
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-brown-100 rounded-full flex items-center justify-center mr-3">
                          <span className="text-brown-700 text-sm font-medium">
                            {employee.firstName[0]}{employee.lastName[0]}
                          </span>
                        </div>
                        <span className="font-medium text-brown-900">{employee.firstName} {employee.lastName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-brown-600">{employee.email}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-brown-600">{employee.phone}</td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        employee.role === 'Admin' ? 'bg-purple-100 text-purple-800' :
                        employee.role === 'Manager' ? 'bg-brown-100 text-brown-800' :
                        employee.role === 'Employee' ? 'bg-green-100 text-green-800' :
                        'bg-cream-200 text-brown-800'
                      }`}>
                        {getRoleLabel(employee.role)}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          employee.inviteStatus === 'Pending'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {employee.inviteStatus === 'Pending' ? 'Ожидает' : 'Активен'}
                        </span>
                      </td>
                    )}
                    {isAdmin && (
                      <td className="px-4 py-4 whitespace-nowrap">
                        <button
                          onClick={(e) => handleDeleteClick(e, employee)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                          disabled={employee.id === user?.id}
                        >
                          {t('common.delete')}
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Employee Detail Modal */}
      {showDetailModal && selectedEmployee && (
        <div className="fixed inset-0 bg-brown-900/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-cream-50 rounded-[0.4rem] shadow-sm w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">{t('common.view')}</h2>
              <button onClick={handleCloseDetailModal} className="text-brown-400 hover:text-brown-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex items-center">
                <div className="w-16 h-16 bg-brown-100 rounded-full flex items-center justify-center mr-4">
                  <span className="text-brown-700 text-2xl font-medium">
                    {selectedEmployee.firstName[0]}{selectedEmployee.lastName[0]}
                  </span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-brown-900">
                    {selectedEmployee.firstName} {selectedEmployee.lastName}
                  </h3>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    selectedEmployee.role === 'Admin' ? 'bg-purple-100 text-purple-800' :
                    selectedEmployee.role === 'Manager' ? 'bg-brown-100 text-brown-800' :
                    selectedEmployee.role === 'Employee' ? 'bg-green-100 text-green-800' :
                    'bg-cream-200 text-brown-800'
                  }`}>
                    {getRoleLabel(selectedEmployee.role)}
                  </span>
                </div>
              </div>
              <dl className="space-y-3 pt-4 border-t">
                <div className="flex justify-between">
                  <dt className="text-brown-500">{t('employees.email')}</dt>
                  <dd className="text-brown-900">{selectedEmployee.email}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-brown-500">{t('employees.phone')}</dt>
                  <dd className="text-brown-900">{selectedEmployee.phone}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-brown-500">{t('employees.role')}</dt>
                  <dd className="text-brown-900">{getRoleLabel(selectedEmployee.role)}</dd>
                </div>
                {selectedEmployee.salary !== undefined && selectedEmployee.salary !== null && (
                  <div className="flex justify-between">
                    <dt className="text-brown-500">{t('employees.salary')}</dt>
                    <dd className="text-brown-900">{formatCurrency(selectedEmployee.salary)}</dd>
                  </div>
                )}
                {selectedEmployee.telegramId && (
                  <div className="flex justify-between">
                    <dt className="text-brown-500">{t('employees.telegramId')}</dt>
                    <dd className="text-brown-900">{selectedEmployee.telegramId}</dd>
                  </div>
                )}
                {selectedEmployee.dateBirth && (
                  <div className="flex justify-between">
                    <dt className="text-brown-500">{t('employees.birthDate')}</dt>
                    <dd className="text-brown-900">{new Date(selectedEmployee.dateBirth).toLocaleDateString()}</dd>
                  </div>
                )}
              </dl>
            </div>
            <div className="flex flex-wrap justify-end gap-2 p-4 border-t">
              {isAdmin && selectedEmployee.inviteStatus === 'Pending' && (
                <>
                  <button
                    onClick={handleResendInvite}
                    disabled={actionLoading === 'resend'}
                    className="px-3 py-2 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-[0.4rem] hover:bg-amber-100 disabled:opacity-50"
                  >
                    {actionLoading === 'resend' ? '...' : 'Отправить повторно'}
                  </button>
                  <button
                    onClick={handleCopyInviteLink}
                    disabled={actionLoading === 'copy'}
                    className="px-3 py-2 text-sm font-medium text-brown-600 hover:text-brown-800 hover:bg-cream-100 rounded-[0.4rem] disabled:opacity-50"
                  >
                    {actionLoading === 'copy' ? '...' : 'Копировать ссылку'}
                  </button>
                </>
              )}
              {isAdmin && selectedEmployee.id !== user?.id && (
                <button
                  onClick={handleResetPassword}
                  disabled={actionLoading === 'reset'}
                  className="px-3 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-[0.4rem] hover:bg-red-100 disabled:opacity-50"
                >
                  {actionLoading === 'reset' ? '...' : 'Сбросить пароль'}
                </button>
              )}
              {isAdmin && (
                <button onClick={handleOpenEditModal} className="btn-primary">
                  {t('common.edit')}
                </button>
              )}
              <button onClick={handleCloseDetailModal} className="px-4 py-2 text-brown-700 hover:bg-cream-100 rounded-[0.4rem]">
                {t('common.close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Employee Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-brown-900/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-cream-50 rounded-[0.4rem] shadow-sm w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Пригласить сотрудника</h2>
              <button onClick={handleCloseAddModal} className="text-brown-400 hover:text-brown-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-brown-700 mb-1">{t('employees.firstName')} *</label>
                  <input
                    type="text"
                    value={newEmployee.firstName}
                    onChange={(e) => setNewEmployee({ ...newEmployee, firstName: e.target.value })}
                    placeholder={t('employees.firstNamePlaceholder')}
                    className="w-full px-3 py-2 border border-brown-300 rounded-[0.4rem] focus:ring-2 focus:ring-brown-500 focus:border-brown-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-brown-700 mb-1">{t('employees.lastName')} *</label>
                  <input
                    type="text"
                    value={newEmployee.lastName}
                    onChange={(e) => setNewEmployee({ ...newEmployee, lastName: e.target.value })}
                    placeholder={t('employees.lastNamePlaceholder')}
                    className="w-full px-3 py-2 border border-brown-300 rounded-[0.4rem] focus:ring-2 focus:ring-brown-500 focus:border-brown-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-brown-700 mb-1">{t('employees.email')} *</label>
                <input
                  type="email"
                  value={newEmployee.email}
                  onChange={(e) => {
                    setNewEmployee({ ...newEmployee, email: e.target.value });
                    if (emailError) setEmailError('');
                  }}
                  placeholder={t('employees.emailPlaceholder')}
                  className={`w-full px-3 py-2 border rounded-[0.4rem] focus:ring-2 focus:ring-brown-500 focus:border-brown-500 ${
                    emailError ? 'border-red-500 bg-red-50' : 'border-brown-300'
                  }`}
                />
                {emailError && (
                  <p className="mt-1 text-sm text-red-600">{emailError}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-brown-700 mb-1">{t('employees.phone')}</label>
                <input
                  type="text"
                  value={newEmployee.phone}
                  onChange={(e) => {
                    setNewEmployee({ ...newEmployee, phone: e.target.value });
                    if (phoneError) setPhoneError('');
                  }}
                  placeholder={t('employees.phonePlaceholder')}
                  className={`w-full px-3 py-2 border rounded-[0.4rem] focus:ring-2 focus:ring-brown-500 focus:border-brown-500 ${
                    phoneError ? 'border-red-500 bg-red-50' : 'border-brown-300'
                  }`}
                />
                {phoneError && (
                  <p className="mt-1 text-sm text-red-600">{phoneError}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-brown-700 mb-1">{t('employees.role')} *</label>
                <select
                  value={newEmployee.role}
                  onChange={(e) => setNewEmployee({ ...newEmployee, role: e.target.value as NewEmployeeForm['role'] })}
                  className="w-full px-3 py-2 border border-brown-300 rounded-[0.4rem] focus:ring-2 focus:ring-brown-500 focus:border-brown-500"
                >
                  <option value="Employee">{t('employees.roleEmployee')}</option>
                  <option value="Manager">{t('employees.roleManager')}</option>
                  <option value="Admin">{t('employees.roleAdmin')}</option>
                  <option value="Trial">{t('employees.roleTrial')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-brown-700 mb-1">{t('employees.salary')} (₽)</label>
                <input
                  type="number"
                  step="0.01"
                  value={newEmployee.salary}
                  onChange={(e) => setNewEmployee({ ...newEmployee, salary: e.target.value })}
                  placeholder={t('employees.salaryPlaceholder')}
                  className="w-full px-3 py-2 border border-brown-300 rounded-[0.4rem] focus:ring-2 focus:ring-brown-500 focus:border-brown-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t">
              <button onClick={handleCloseAddModal} className="px-4 py-2 text-brown-700 hover:bg-cream-100 rounded-[0.4rem]">
                {t('common.cancel')}
              </button>
              <button
                onClick={handleCreateEmployee}
                disabled={isSubmitting}
                className="btn-primary"
              >
                {isSubmitting ? t('common.loading') : 'Пригласить'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Employee Modal */}
      {showEditModal && selectedEmployee && (
        <div className="fixed inset-0 bg-brown-900/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-cream-50 rounded-[0.4rem] shadow-sm w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">{t('employees.editEmployee')}</h2>
              <button onClick={handleCloseEditModal} className="text-brown-400 hover:text-brown-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-brown-700 mb-1">{t('employees.firstName')} *</label>
                  <input
                    type="text"
                    value={editEmployee.firstName}
                    onChange={(e) => setEditEmployee({ ...editEmployee, firstName: e.target.value })}
                    placeholder={t('employees.firstNamePlaceholder')}
                    className="w-full px-3 py-2 border border-brown-300 rounded-[0.4rem] focus:ring-2 focus:ring-brown-500 focus:border-brown-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-brown-700 mb-1">{t('employees.lastName')} *</label>
                  <input
                    type="text"
                    value={editEmployee.lastName}
                    onChange={(e) => setEditEmployee({ ...editEmployee, lastName: e.target.value })}
                    placeholder={t('employees.lastNamePlaceholder')}
                    className="w-full px-3 py-2 border border-brown-300 rounded-[0.4rem] focus:ring-2 focus:ring-brown-500 focus:border-brown-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-brown-700 mb-1">{t('employees.phone')}</label>
                <input
                  type="text"
                  value={editEmployee.phone}
                  onChange={(e) => setEditEmployee({ ...editEmployee, phone: e.target.value })}
                  placeholder={t('employees.phonePlaceholder')}
                  className="w-full px-3 py-2 border border-brown-300 rounded-[0.4rem] focus:ring-2 focus:ring-brown-500 focus:border-brown-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-brown-700 mb-1">{t('employees.role')} *</label>
                <select
                  value={editEmployee.role}
                  onChange={(e) => setEditEmployee({ ...editEmployee, role: e.target.value as EditEmployeeForm['role'] })}
                  className="w-full px-3 py-2 border border-brown-300 rounded-[0.4rem] focus:ring-2 focus:ring-brown-500 focus:border-brown-500"
                >
                  <option value="Employee">{t('employees.roleEmployee')}</option>
                  <option value="Manager">{t('employees.roleManager')}</option>
                  <option value="Admin">{t('employees.roleAdmin')}</option>
                  <option value="Trial">{t('employees.roleTrial')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-brown-700 mb-1">{t('employees.salary')} (₽)</label>
                <input
                  type="number"
                  step="0.01"
                  value={editEmployee.salary}
                  onChange={(e) => setEditEmployee({ ...editEmployee, salary: e.target.value })}
                  placeholder={t('employees.salaryPlaceholder')}
                  className="w-full px-3 py-2 border border-brown-300 rounded-[0.4rem] focus:ring-2 focus:ring-brown-500 focus:border-brown-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-brown-700 mb-1">{t('employees.telegramId')}</label>
                <input
                  type="text"
                  value={editEmployee.telegramId}
                  onChange={(e) => setEditEmployee({ ...editEmployee, telegramId: e.target.value })}
                  placeholder="@username"
                  className="w-full px-3 py-2 border border-brown-300 rounded-[0.4rem] focus:ring-2 focus:ring-brown-500 focus:border-brown-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-brown-700 mb-1">{t('employees.birthDate')}</label>
                <input
                  type="date"
                  value={editEmployee.dateBirth}
                  onChange={(e) => setEditEmployee({ ...editEmployee, dateBirth: e.target.value })}
                  className="w-full px-3 py-2 border border-brown-300 rounded-[0.4rem] focus:ring-2 focus:ring-brown-500 focus:border-brown-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t">
              <button onClick={handleCloseEditModal} className="px-4 py-2 text-brown-700 hover:bg-cream-100 rounded-[0.4rem]">
                {t('common.cancel')}
              </button>
              <button
                onClick={handleUpdateEmployee}
                disabled={isSubmitting}
                className="btn-primary"
              >
                {isSubmitting ? t('common.loading') : t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal && (
        <div
          className="fixed inset-0 bg-brown-900/50 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={handleDeleteCancel}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-modal-title"
        >
          <div
            className="bg-cream-50 rounded-[0.4rem] shadow-sm w-full max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b">
              <h2 id="delete-modal-title" className="text-lg font-semibold text-red-600">
                {t('employees.deleteEmployee')}
              </h2>
              <button
                onClick={handleDeleteCancel}
                disabled={isDeleting}
                className="text-brown-400 hover:text-brown-600 disabled:opacity-50"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4">
              <p className="text-brown-700">
                <Trans
                  i18nKey="employees.confirmDeleteMessage"
                  values={{ name: deleteModal.employeeName }}
                  components={{ bold: <span className="font-bold" /> }}
                />
              </p>
              <p className="text-brown-500 text-sm mt-2">
                {t('common.actionCannotBeUndone')}
              </p>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t">
              <button
                onClick={handleDeleteCancel}
                disabled={isDeleting}
                className="px-4 py-2 text-brown-700 hover:bg-cream-100 rounded-[0.4rem] disabled:opacity-50"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 text-white rounded-[0.4rem] hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting ? t('common.deleting') : t('employees.deleteEmployee')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
