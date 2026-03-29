import { useEffect, useState } from 'react';
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '@/services/auth.service';
import type { PaginatedResponse } from '@/types';
import toast from 'react-hot-toast';
import { useAuthState } from '@/store/AuthContext';

interface TeamMember {
  id: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    role: string;
  };
}

interface AvailableUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

interface PaymentSchedule {
  id: string;
  type: string;
  name: string;
  amount: number;
  percentage?: number;
  expectedDate: string;
  actualDate?: string;
  isPaid: boolean;
  description?: string;
  project: {
    id: string;
    name: string;
  };
}

interface WorkloadReport {
  id: string;
  date: string;
  hours: number;
  description: string;
  totalDayHours: number;
  userText: string | null;
}

interface EmployeeWorkload {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  totalHours: number;
  reports: WorkloadReport[];
}

interface ProjectWorkload {
  projectId: string;
  projectName: string;
  totalProjectHours: number;
  employeeCount: number;
  employeeWorkload: EmployeeWorkload[];
}

interface Project {
  id: string;
  name: string;
  contractDate: string;
  expirationDate: string;
  type: string;
  status: string;
  customerId: string;
  managerId: string;
  mainProjectId?: string;
  cost?: number; // Feature #331: Project cost for automatic percentage calculation
  customer: {
    id: string;
    name: string;
    type: string;
  } | null;
  manager: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  mainProject?: {
    id: string;
    name: string;
  };
  additionalProjects?: {
    id: string;
    name: string;
    status: string;
  }[];
}

type TabType = 'overview' | 'payments' | 'workload';

export default function ProjectDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthState();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  // Get initial tab from URL hash or default to 'overview'
  const getTabFromHash = (): TabType => {
    const hash = location.hash.replace('#', '');
    const validTabs: TabType[] = ['overview', 'payments', 'workload'];
    return validTabs.includes(hash as TabType) ? (hash as TabType) : 'overview';
  };

  const [activeTab, setActiveTab] = useState<TabType>(getTabFromHash());

  // Team management state
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [addingUser, setAddingUser] = useState(false);

  const canManageTeam = user?.role === 'Admin' || user?.role === 'Manager';

  // Payment schedule state
  const [payments, setPayments] = useState<PaymentSchedule[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    type: 'Advance',
    name: '',
    amount: '',
    expectedDate: '',
    description: '',
  });
  const [paymentFormErrors, setPaymentFormErrors] = useState<Record<string, string>>({});
  const canManagePayments = user?.role === 'Admin' || user?.role === 'Manager';

  // Workload tab state
  const [projectWorkload, setProjectWorkload] = useState<ProjectWorkload | null>(null);
  const [loadingWorkload, setLoadingWorkload] = useState(false);
  const [selectedEmployeeWorkload, setSelectedEmployeeWorkload] = useState<EmployeeWorkload | null>(null);
  const [showEmployeeReportsModal, setShowEmployeeReportsModal] = useState(false);
  const canViewWorkload = user?.role === 'Admin' || user?.role === 'Manager' || user?.role === 'Trial';

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const response = await api.get<Project>(`/project/${id}`);
        setProject(response.data);
      } catch (error) {
        toast.error(t('projects.loadError'));
      } finally {
        setLoading(false);
      }
    };
    if (id) {
      fetchProject();
    }
  }, [id]);

  // Sync active tab with URL hash
  useEffect(() => {
    const hash = location.hash.replace('#', '');
    const validTabs: TabType[] = ['overview', 'payments', 'workload'];
    if (validTabs.includes(hash as TabType) && hash !== activeTab) {
      setActiveTab(hash as TabType);
    }
  }, [location.hash]);

  // Update URL hash when tab changes
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    navigate(`#${tab}`, { replace: true });
  };

  // Fetch payments when payments tab is active
  useEffect(() => {
    const fetchPayments = async () => {
      if (activeTab === 'payments' && id) {
        setLoadingPayments(true);
        try {
          const response = await api.get<PaginatedResponse<PaymentSchedule>>(`/payment-schedule?projectId=${id}&limit=1000`);
          setPayments(response.data.data);
        } catch (error) {
          toast.error(t('payments.loadError'));
        } finally {
          setLoadingPayments(false);
        }
      }
    };
    fetchPayments();
  }, [activeTab, id, t]);

  // Fetch workload when workload tab is active
  useEffect(() => {
    const fetchWorkload = async () => {
      if (activeTab === 'workload' && id && canViewWorkload) {
        setLoadingWorkload(true);
        try {
          const response = await api.get<ProjectWorkload>(`/project/${id}/workload/employees`);
          setProjectWorkload(response.data);
        } catch (error) {
          toast.error(t('workload.loadError'));
        } finally {
          setLoadingWorkload(false);
        }
      }
    };
    fetchWorkload();
  }, [activeTab, id, canViewWorkload, t]);

  const openEmployeeReportsModal = (employee: EmployeeWorkload) => {
    setSelectedEmployeeWorkload(employee);
    setShowEmployeeReportsModal(true);
  };

  const handleAddTeamMember = async () => {
    if (!selectedUserId || !id) return;

    setAddingUser(true);
    try {
      await api.post(`/project/${id}/users/${selectedUserId}`);
      toast.success(t('projects.teamMemberAdded'));

      // Refresh team data
      const [teamResponse, availableResponse] = await Promise.all([
        api.get<TeamMember[]>(`/project/${id}/users`),
        api.get<AvailableUser[]>(`/project/${id}/available-users`),
      ]);
      setTeamMembers(teamResponse.data);
      setAvailableUsers(availableResponse.data);
      setSelectedUserId('');
    } catch (error) {
      toast.error(t('projects.teamMemberAddError'));
    } finally {
      setAddingUser(false);
    }
  };

  const handleRemoveTeamMember = async (userId: string) => {
    if (!id) return;

    try {
      await api.delete(`/project/${id}/users/${userId}`);
      toast.success(t('projects.teamMemberRemoved'));

      // Refresh team data
      const [teamResponse, availableResponse] = await Promise.all([
        api.get<TeamMember[]>(`/project/${id}/users`),
        api.get<AvailableUser[]>(`/project/${id}/available-users`),
      ]);
      setTeamMembers(teamResponse.data);
      setAvailableUsers(availableResponse.data);
    } catch (error) {
      toast.error(t('projects.teamMemberRemoveError'));
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleAddPayment = async () => {
    const errors: Record<string, string> = {};

    // Feature #337: Validate project has cost before allowing payment creation
    if (!project?.cost || project.cost <= 0) {
      toast.error('Невозможно добавить платёж: необходимо указать полную стоимость проекта');
      return;
    }

    if (!paymentForm.name.trim()) {
      errors.name = t('payments.nameRequired');
    }
    if (!paymentForm.amount) {
      errors.amount = t('payments.amountRequired');
    } else if (parseFloat(paymentForm.amount) <= 0) {
      errors.amount = t('payments.amountPositive');
    }
    if (!paymentForm.expectedDate) {
      errors.expectedDate = t('payments.expectedDateRequired');
    }

    // Feature #337: Validate total payments don't exceed project cost
    if (paymentForm.amount) {
      const amount = parseFloat(paymentForm.amount);
      const currentPaymentsTotal = payments.reduce((sum, p) => sum + p.amount, 0);
      const newTotal = currentPaymentsTotal + amount;

      if (project?.cost && newTotal > project.cost) {
        errors.amount = `Сумма всех платежей (${newTotal.toLocaleString('ru-RU')} ₽) превысит полную стоимость проекта (${project.cost.toLocaleString('ru-RU')} ₽)`;
      }
    }

    if (Object.keys(errors).length > 0) {
      setPaymentFormErrors(errors);
      toast.error(t('common.fixFormErrors'));
      return;
    }

    if (!id) return;

    setSavingPayment(true);
    setPaymentFormErrors({});
    try {
      // Feature #331: Calculate percentage automatically from project cost or total payments
      const amount = parseFloat(paymentForm.amount);
      let percentage: number | undefined = undefined;

      // If project has a cost, calculate percentage from it
      if (project?.cost && project.cost > 0) {
        percentage = (amount / project.cost) * 100;
      } else {
        // If no project cost, calculate percentage based on sum of all payments + current payment
        const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0) + amount;
        percentage = totalPayments > 0 ? (amount / totalPayments) * 100 : undefined;
      }

      await api.post('/payment-schedule/create', {
        projectId: id,
        type: paymentForm.type,
        name: paymentForm.name,
        amount: amount,
        percentage: percentage,
        expectedDate: paymentForm.expectedDate,
        description: paymentForm.description || undefined,
      });

      toast.success(t('payments.addSuccess'));
      setShowAddPaymentModal(false);
      setPaymentForm({
        type: 'Advance',
        name: '',
        amount: '',
        expectedDate: '',
        description: '',
      });

      // Refresh payments
      const response = await api.get<PaginatedResponse<PaymentSchedule>>(`/payment-schedule?projectId=${id}&limit=1000`);
      setPayments(response.data.data);
    } catch (error) {
      toast.error(t('payments.addError'));
    } finally {
      setSavingPayment(false);
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!confirm(t('payments.deleteConfirm'))) return;

    try {
      await api.delete(`/payment-schedule/${paymentId}`);
      toast.success(t('payments.deleteSuccess'));
      setPayments(payments.filter((p) => p.id !== paymentId));
    } catch (error) {
      toast.error(t('payments.deleteError'));
    }
  };

  const handleMarkPaid = async (paymentId: string) => {
    try {
      await api.patch(`/payment-schedule/${paymentId}/mark-paid`, {});
      toast.success(t('payments.markPaidSuccess'));
      // Refresh payments
      const response = await api.get<PaginatedResponse<PaymentSchedule>>(`/payment-schedule?projectId=${id}&limit=1000`);
      setPayments(response.data.data);
    } catch (error) {
      toast.error(t('payments.markPaidError'));
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
    }).format(amount);
  };

  const isOverdue = (expectedDate: string, isPaid: boolean) => {
    if (isPaid) return false;
    return new Date(expectedDate) < new Date();
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brown-600 mx-auto"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-4 md:p-6">
        <h1 className="page-title mb-6">{t('projects.notFound')}</h1>
        <p className="text-brown-500">{t('projects.notFoundDescription')}</p>
        <Link to="/projects" className="text-brown-600 hover:underline mt-4 inline-block">
          {t('projects.backToProjects')}
        </Link>
      </div>
    );
  }

  const tabs: { id: TabType; label: string }[] = [
    { id: 'overview', label: t('projects.overview') },
    { id: 'payments', label: `${t('payments.title')} (${payments.length})` },
    { id: 'workload', label: t('workload.title') },
  ];

  return (
    <div className="p-4 md:p-6">
      {/* Breadcrumbs */}
      <nav className="flex mb-4" aria-label="Breadcrumb">
        <ol className="inline-flex items-center space-x-1 md:space-x-3">
          <li className="inline-flex items-center">
            <Link to="/" className="text-brown-500 hover:text-brown-600">
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
              </svg>
              {t('common.home')}
            </Link>
          </li>
          <li>
            <div className="flex items-center">
              <svg className="w-6 h-6 text-brown-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              <Link to="/projects" className="ml-1 text-brown-500 hover:text-brown-600 md:ml-2">
                {t('navigation.projects')}
              </Link>
            </div>
          </li>
          <li aria-current="page">
            <div className="flex items-center">
              <svg className="w-6 h-6 text-brown-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              <span className="ml-1 text-brown-700 font-medium md:ml-2">{project.name}</span>
            </div>
          </li>
        </ol>
      </nav>

      <h1 className="page-title mb-6">{project.name}</h1>

      {/* Tabs */}
      <div className="border-b border-brown-200 mb-6">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-brown-500 text-brown-600'
                  : 'border-transparent text-brown-500 hover:text-brown-700 hover:border-brown-300'
              }`}
              role="tab"
              aria-selected={activeTab === tab.id}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Project Info */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold mb-4">{t('projects.information')}</h2>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-brown-500">{t('projects.status')}</dt>
                <dd>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    project.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-cream-200 text-brown-800'
                  }`}>
                    {t(`projects.${project.status.toLowerCase()}`)}
                  </span>
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-brown-500">{t('projects.type')}</dt>
                <dd className="text-brown-900">{project.type}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-brown-500">{t('projects.contractDate')}</dt>
                <dd className="text-brown-900">{formatDate(project.contractDate)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-brown-500">{t('projects.expirationDate')}</dt>
                <dd className="text-brown-900">{formatDate(project.expirationDate)}</dd>
              </div>
              {/* Feature #332: Display project cost */}
              {project.cost !== null && project.cost !== undefined && (
                <div className="flex justify-between">
                  <dt className="text-brown-500">Стоимость проекта</dt>
                  <dd className="text-brown-900 font-semibold">
                    {new Intl.NumberFormat('ru-RU', {
                      style: 'currency',
                      currency: 'RUB',
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0
                    }).format(project.cost)}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Customer & Manager Info */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold mb-4">{t('projects.customerAndManager')}</h2>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-brown-500">{t('projects.customer')}</dt>
                <dd className="text-brown-900">{project.customer?.name || t('common.na')}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-brown-500">{t('projects.customerType')}</dt>
                <dd className="text-brown-900">{project.customer?.type || t('common.na')}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-brown-500">{t('projects.manager')}</dt>
                <dd className="text-brown-900">{project.manager ? `${project.manager.firstName} ${project.manager.lastName}` : t('common.na')}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-brown-500">{t('projects.managerEmail')}</dt>
                <dd className="text-brown-900">{project.manager?.email || t('common.na')}</dd>
              </div>
            </dl>
          </div>

          {/* Main Project Reference (for additional projects) */}
          {project.mainProject && (
            <div className="card p-6">
              <h2 className="text-lg font-semibold mb-4">{t('projects.mainProject')}</h2>
              <p className="text-brown-600 text-sm mb-3">{t('projects.additionalProjectLinkedTo')}</p>
              <Link
                to={`/projects/${project.mainProject.id}`}
                className="block p-4 bg-brown-50 rounded-[0.4rem] border border-brown-200 hover:bg-brown-100 transition-colors"
              >
                <div className="font-medium text-brown-700">{project.mainProject.name}</div>
                <div className="text-sm text-brown-600 mt-1">{t('projects.clickToViewMainProject')}</div>
              </Link>
            </div>
          )}

          {/* Additional Projects Section (for main projects) */}
          {project.additionalProjects && project.additionalProjects.length > 0 && (
            <div className="card p-6">
              <h2 className="text-lg font-semibold mb-4">{t('projects.additionalProjects')}</h2>
              <p className="text-brown-600 text-sm mb-3">{t('projects.supplementaryProjectsLinked')}</p>
              <div className="space-y-2">
                {project.additionalProjects.map((additionalProject) => (
                  <Link
                    key={additionalProject.id}
                    to={`/projects/${additionalProject.id}`}
                    className="block p-3 bg-cream-100 rounded-[0.4rem] border border-brown-200 hover:bg-cream-200 transition-colors"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-brown-900">{additionalProject.name}</span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        additionalProject.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-cream-200 text-brown-800'
                      }`}>
                        {t(`projects.${additionalProject.status.toLowerCase()}`)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'payments' && (
        <div className="card p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold">{t('payments.schedule')}</h2>
            {canManagePayments && (
              <button
                onClick={() => setShowAddPaymentModal(true)}
                className="btn-primary"
              >
                {t('payments.add')}
              </button>
            )}
          </div>

          {loadingPayments ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brown-600"></div>
            </div>
          ) : payments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-cream-100 border-b border-brown-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-brown-500 uppercase">{t('payments.name')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-brown-500 uppercase">{t('payments.type')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-brown-500 uppercase">{t('payments.amount')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-brown-500 uppercase">{t('payments.expectedDate')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-brown-500 uppercase">{t('payments.status')}</th>
                    {canManagePayments && (
                      <th className="px-4 py-3 text-left text-xs font-medium text-brown-500 uppercase">{t('common.actions')}</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-brown-200">
                  {payments.map((payment) => (
                    <tr key={payment.id} className={`hover:bg-cream-100 ${isOverdue(payment.expectedDate, payment.isPaid) ? 'bg-red-50' : ''}`}>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-brown-900 font-medium">{payment.name}</div>
                          {payment.description && (
                            <div className="text-brown-500 text-sm">{payment.description}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          payment.type === 'Advance' ? 'bg-brown-100 text-brown-800' :
                          payment.type === 'MainPayment' ? 'bg-purple-100 text-purple-800' :
                          payment.type === 'FinalPayment' ? 'bg-green-100 text-green-800' :
                          'bg-cream-200 text-brown-800'
                        }`}>
                          {t(`payments.types.${payment.type.toLowerCase()}`)}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-brown-900 font-medium">{formatCurrency(payment.amount)}</div>
                        {payment.percentage && (
                          <div className="text-brown-500 text-sm">{payment.percentage}%</div>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className={`${isOverdue(payment.expectedDate, payment.isPaid) ? 'text-red-600 font-medium' : 'text-brown-900'}`}>
                          {formatDate(payment.expectedDate)}
                        </div>
                        {payment.actualDate && (
                          <div className="text-brown-500 text-sm">{t('payments.paid')}: {formatDate(payment.actualDate)}</div>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {payment.isPaid ? (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                            {t('payments.paid')}
                          </span>
                        ) : isOverdue(payment.expectedDate, payment.isPaid) ? (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                            {t('payments.overdue')}
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                            {t('payments.pending')}
                          </span>
                        )}
                      </td>
                      {canManagePayments && (
                        <td className="px-4 py-4 whitespace-nowrap space-x-2">
                          {!payment.isPaid && (
                            <button
                              onClick={() => handleMarkPaid(payment.id)}
                              className="text-green-600 hover:text-green-800 text-sm font-medium"
                            >
                              {t('payments.markPaid')}
                            </button>
                          )}
                          <button
                            onClick={() => handleDeletePayment(payment.id)}
                            className="text-red-600 hover:text-red-800 text-sm font-medium"
                          >
                            {t('common.delete')}
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              {/* Payment Summary */}
              <div className="mt-6 pt-4 border-t border-brown-200">
                <div className="flex justify-end gap-8">
                  {/* Feature #338: Display project cost in payments tab */}
                  {project?.cost && project.cost > 0 && (
                    <div className="text-right">
                      <div className="text-sm text-brown-500">{t('payments.projectCost')}</div>
                      <div className="text-lg font-semibold text-brown-600">
                        {formatCurrency(project.cost)}
                      </div>
                    </div>
                  )}
                  <div className="text-right">
                    <div className="text-sm text-brown-500">{t('payments.totalAmount')}</div>
                    <div className="text-lg font-semibold text-brown-900">
                      {formatCurrency(payments.reduce((sum, p) => sum + p.amount, 0))}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-brown-500">{t('payments.totalPercentage')}</div>
                    <div className="text-lg font-semibold text-brown-900">
                      {payments.reduce((sum, p) => sum + (p.percentage || 0), 0).toFixed(0)}%
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-brown-500 text-center py-8">{t('payments.noPayments')}</p>
              {/* Feature #338: Display project cost even when no payments */}
              {project?.cost && project.cost > 0 && (
                <div className="mt-4 pt-4 border-t border-brown-200">
                  <div className="flex justify-end">
                    <div className="text-right">
                      <div className="text-sm text-brown-500">{t('payments.projectCost')}</div>
                      <div className="text-lg font-semibold text-brown-600">
                        {formatCurrency(project.cost)}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Workload Tab */}
      {activeTab === 'workload' && canViewWorkload && (
        <div className="card p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold">{t('workload.projectWorkload')}</h2>
            {projectWorkload && (
              <div className="text-right">
                <div className="text-sm text-brown-500">{t('workload.totalProjectHours')}</div>
                <div className="text-2xl font-bold text-brown-600">
                  {projectWorkload.totalProjectHours.toFixed(1)}h
                </div>
              </div>
            )}
          </div>

          {loadingWorkload ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brown-600"></div>
            </div>
          ) : projectWorkload && projectWorkload.employeeWorkload.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-cream-100 border-b border-brown-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-brown-500 uppercase">{t('workload.employee')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-brown-500 uppercase">{t('employees.email')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-brown-500 uppercase">{t('workload.totalHours')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-brown-500 uppercase">{t('workload.reportsCount')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-brown-500 uppercase">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brown-200">
                  {projectWorkload.employeeWorkload.map((employee) => (
                    <tr key={employee.user.id} className="hover:bg-cream-100">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-8 h-8 rounded-full bg-brown-100 text-brown-700 flex items-center justify-center font-medium text-sm mr-3">
                            {employee.user.firstName[0]}{employee.user.lastName[0]}
                          </div>
                          <span className="text-brown-900 font-medium">
                            {employee.user.firstName} {employee.user.lastName}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-brown-600">{employee.user.email}</td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-sm font-semibold rounded-full bg-green-100 text-green-800">
                          {employee.totalHours.toFixed(1)}h
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-brown-600">
                        {employee.reports.length} {t('workload.reports', { count: employee.reports.length })}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <button
                          onClick={() => openEmployeeReportsModal(employee)}
                          className="text-brown-600 hover:text-brown-800 text-sm font-medium"
                        >
                          {t('workload.viewReports')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {/* Workload Summary */}
              <div className="mt-6 pt-4 border-t border-brown-200">
                <div className="flex justify-end gap-8">
                  <div className="text-right">
                    <div className="text-sm text-brown-500">{t('workload.employees')}</div>
                    <div className="text-lg font-semibold text-brown-900">
                      {projectWorkload.employeeCount}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-brown-500">{t('workload.totalHours')}</div>
                    <div className="text-lg font-semibold text-brown-600">
                      {projectWorkload.totalProjectHours.toFixed(1)}h
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <svg className="mx-auto h-12 w-12 text-brown-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-brown-500 mt-4">{t('workload.noReportsYet')}</p>
              <p className="text-brown-400 text-sm mt-1">{t('workload.employeesCanLog')}</p>
            </div>
          )}
        </div>
      )}

      {/* Employee Reports Modal */}
      {showEmployeeReportsModal && selectedEmployeeWorkload && (
        <div className="fixed inset-0 bg-brown-900/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-cream-50 rounded-[0.4rem] shadow-sm w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-brown-200">
              <h2 className="text-lg font-semibold">
                {t('workload.reportsByEmployee', { name: `${selectedEmployeeWorkload.user.firstName} ${selectedEmployeeWorkload.user.lastName}` })}
              </h2>
              <button onClick={() => setShowEmployeeReportsModal(false)} className="text-brown-400 hover:text-brown-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              {/* Summary Card */}
              <div className="bg-brown-50 border border-brown-200 rounded-[0.4rem] p-4 mb-4">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-sm text-brown-600">{t('workload.totalHoursOnProject')}</div>
                    <div className="text-2xl font-bold text-brown-700">
                      {selectedEmployeeWorkload.totalHours.toFixed(1)} {t('workload.hours')}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-brown-600">{t('workload.reportEntries')}</div>
                    <div className="text-xl font-semibold text-brown-700">
                      {selectedEmployeeWorkload.reports.length}
                    </div>
                  </div>
                </div>
              </div>

              {/* Reports List */}
              <div className="space-y-3">
                {selectedEmployeeWorkload.reports.map((report) => (
                  <div key={report.id} className="border border-brown-200 rounded-[0.4rem] p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="text-sm text-brown-500">
                        {new Date(report.date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </div>
                      <span className="px-2 py-1 text-sm font-semibold rounded-full bg-green-100 text-green-800">
                        {report.hours.toFixed(1)}h
                      </span>
                    </div>
                    {report.description && (
                      <p className="text-brown-700">{report.description}</p>
                    )}
                    {report.userText && (
                      <p className="text-brown-500 text-sm mt-2 italic">
                        {t('workload.dayNotes')}: {report.userText}
                      </p>
                    )}
                    <div className="text-xs text-brown-400 mt-2">
                      {t('workload.totalDayHours')}: {report.totalDayHours.toFixed(1)}h
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-brown-200">
              <button onClick={() => setShowEmployeeReportsModal(false)} className="px-4 py-2 text-brown-700 hover:bg-cream-200 rounded-[0.4rem]">
                {t('common.close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Payment Modal */}
      {showAddPaymentModal && (
        <div className="fixed inset-0 bg-brown-900/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-cream-50 rounded-[0.4rem] shadow-sm w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b border-brown-200">
              <h2 className="text-lg font-semibold">{t('payments.addPayment')}</h2>
              <button onClick={() => setShowAddPaymentModal(false)} className="text-brown-400 hover:text-brown-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-brown-700 mb-1">{t('payments.paymentType')} *</label>
                <select
                  value={paymentForm.type}
                  onChange={(e) => setPaymentForm({ ...paymentForm, type: e.target.value })}
                  className="w-full px-3 py-2 border border-brown-300 rounded-[0.4rem] focus:ring-2 focus:ring-brown-500 focus:border-brown-500"
                >
                  <option value="Advance">{t('payments.types.advance')}</option>
                  <option value="MainPayment">{t('payments.types.mainpayment')}</option>
                  <option value="FinalPayment">{t('payments.types.finalpayment')}</option>
                  <option value="Other">{t('payments.types.other')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-brown-700 mb-1">{t('payments.paymentName')} *</label>
                <input
                  type="text"
                  value={paymentForm.name}
                  onChange={(e) => setPaymentForm({ ...paymentForm, name: e.target.value })}
                  placeholder={t('payments.paymentNamePlaceholder')}
                  className="w-full px-3 py-2 border border-brown-300 rounded-[0.4rem] focus:ring-2 focus:ring-brown-500 focus:border-brown-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-brown-700 mb-1">{t('payments.amount')} (₽) *</label>
                  <input
                    type="number"
                    value={paymentForm.amount}
                    onChange={(e) => {
                      setPaymentForm({ ...paymentForm, amount: e.target.value });
                      if (paymentFormErrors.amount) {
                        setPaymentFormErrors({ ...paymentFormErrors, amount: '' });
                      }
                    }}
                    placeholder="10000"
                    min="0"
                    step="0.01"
                    className={`w-full px-3 py-2 border rounded-[0.4rem] focus:ring-2 focus:ring-brown-500 focus:border-brown-500 ${paymentFormErrors.amount ? 'border-red-500' : 'border-brown-300'}`}
                  />
                  {paymentFormErrors.amount && (
                    <p className="text-red-500 text-sm mt-1">{paymentFormErrors.amount}</p>
                  )}
                </div>
                {/* Feature #331: Percentage field removed - now calculated automatically */}
              </div>
              <div>
                <label className="block text-sm font-medium text-brown-700 mb-1">{t('payments.expectedDate')} *</label>
                <input
                  type="date"
                  value={paymentForm.expectedDate}
                  onChange={(e) => setPaymentForm({ ...paymentForm, expectedDate: e.target.value })}
                  className="w-full px-3 py-2 border border-brown-300 rounded-[0.4rem] focus:ring-2 focus:ring-brown-500 focus:border-brown-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-brown-700 mb-1">{t('payments.description')}</label>
                <textarea
                  value={paymentForm.description}
                  onChange={(e) => setPaymentForm({ ...paymentForm, description: e.target.value })}
                  placeholder={t('payments.descriptionPlaceholder')}
                  rows={2}
                  className="w-full px-3 py-2 border border-brown-300 rounded-[0.4rem] focus:ring-2 focus:ring-brown-500 focus:border-brown-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-brown-200">
              <button onClick={() => setShowAddPaymentModal(false)} className="px-4 py-2 text-brown-700 hover:bg-cream-200 rounded-[0.4rem]">
                {t('common.cancel')}
              </button>
              <button
                onClick={handleAddPayment}
                disabled={savingPayment || !paymentForm.name || !paymentForm.amount || !paymentForm.expectedDate}
                className="btn-primary disabled:opacity-50"
              >
                {savingPayment ? `${t('common.saving')}...` : t('payments.addPayment')}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
