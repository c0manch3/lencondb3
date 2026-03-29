// ─── User ────────────────────────────────────────────────────────────────────

export type UserRole = 'Admin' | 'Manager' | 'Employee' | 'Trial';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: UserRole;
  telegramId?: string;
  salary?: number;
  dateBirth?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Company ─────────────────────────────────────────────────────────────────

export type CompanyType = 'Customer' | 'Contractor';

export interface Company {
  id: string;
  name: string;
  type: CompanyType;
  address?: string;
  phone?: string;
  email?: string;
  contactPerson?: string;
  account?: string;
  bank?: string;
  bik?: string;
  corrAccount?: string;
  inn?: string;
  kpp?: string;
  ogrn?: string;
  postalCode?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Project ─────────────────────────────────────────────────────────────────

export type ProjectType = 'main' | 'additional';
export type ProjectStatus = 'Active' | 'Completed';

export interface Project {
  id: string;
  name: string;
  contractDate: string;
  expirationDate: string;
  type: ProjectType;
  status: ProjectStatus;
  customerId: string;
  managerId: string;
  mainProjectId?: string;
  customer?: Company;
  manager?: User;
  mainProject?: Project;
  additionalProjects?: Project[];
  cost?: number;
  createdAt: string;
  updatedAt: string;
}

// ─── Workload ────────────────────────────────────────────────────────────────

export interface WorkloadPlan {
  id: string;
  userId: string;
  projectId: string;
  managerId: string;
  date: string;
  hours?: number | null;
  user?: User;
  project?: Project;
  manager?: User;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectWorkloadDistribution {
  id: string;
  workloadActualId: string;
  projectId: string;
  hours: number;
  description?: string;
  project?: Project;
}

export interface WorkloadActual {
  id: string;
  userId: string;
  date: string;
  hoursWorked: number;
  userText?: string;
  user?: User;
  distributions?: ProjectWorkloadDistribution[];
  createdAt: string;
  updatedAt: string;
}

// ─── Payment ─────────────────────────────────────────────────────────────────

export type PaymentType = 'Advance' | 'MainPayment' | 'FinalPayment' | 'Other';

export interface PaymentSchedule {
  id: string;
  projectId: string;
  type: PaymentType;
  name: string;
  amount: number;
  percentage?: number;
  expectedDate: string;
  actualDate?: string;
  isPaid: boolean;
  description?: string;
  project?: Project;
  createdAt: string;
  updatedAt: string;
}

// ─── Expense / Finance ───────────────────────────────────────────────────────

export type ExpenseCategory =
  | 'Salary'
  | 'IncomeTax'
  | 'InsuranceContrib'
  | 'SocialInsurance'
  | 'SimplifiedTax'
  | 'VAT'
  | 'Penalty'
  | 'IndividualTax'
  | 'Rent'
  | 'Services'
  | 'Other';

export interface Expense {
  id: string;
  date: string;
  amount: number;
  vatAmount: number | null;
  category: ExpenseCategory;
  description: string | null;
  deletedAt: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  createdBy: { firstName: string; lastName: string };
}

export interface FinanceSummary {
  totalIncome: number;
  totalExpenses: number;
  totalVat: number;
  balance: number;
  incomeCount: number;
  expenseCount: number;
}

export interface MonthlyDynamicsItem {
  month: string;
  income: number;
  expenses: number;
  balance: number;
  cumulativeBalance: number;
}

export interface ExpenseByCategoryItem {
  category: ExpenseCategory;
  total: number;
  count: number;
  percentage: number;
}

export interface IncomeByProjectItem {
  projectId: string;
  projectName: string;
  total: number;
  paymentsCount: number;
}

// ─── Analytics ──────────────────────────────────────────────────────────────

export interface ProjectWorkloadItem {
  projectId: string;
  projectName: string;
  customerName: string;
  managerName: string;
  status: ProjectStatus;
  employeeCount: number;
  totalHours: number;
  plannedDays: number;
  progress: number;
}

export interface ProjectsWorkloadResponse {
  projects: ProjectWorkloadItem[];
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  totalHoursWorked: number;
}

export interface EmployeeWorkHoursItem {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  hoursWorked: number;
  expectedHours: number;
  deviation: number;
  deviationPercent: number;
}

export interface EmployeeWorkHoursResponse {
  employees: EmployeeWorkHoursItem[];
  totalEmployees: number;
  averageHours: number;
  workingDays: number;
  expectedHoursPerEmployee: number;
  underworkingCount: number;
  overworkingCount: number;
}

// ─── API ─────────────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
}
