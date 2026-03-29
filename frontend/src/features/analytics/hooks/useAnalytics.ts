import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared/api/client';
import type {
  ProjectsWorkloadResponse,
  EmployeeWorkHoursResponse,
  FinanceSummary,
  MonthlyDynamicsItem,
  ExpenseByCategoryItem,
  IncomeByProjectItem,
  WorkloadActual,
} from '@/shared/types';

// ─── Query keys ─────────────────────────────────────────────────────────────

const ANALYTICS_KEY = ['analytics'] as const;

// ─── Param types ────────────────────────────────────────────────────────────

export interface DateRangeParams {
  startDate: string;
  endDate: string;
}

interface EmployeeReportsParams {
  userId: string;
  startDate: string;
  endDate: string;
}

// ─── Raw API response types (match backend shape) ─────────────────────────

interface RawProjectItem {
  id: string;
  name: string;
  status: string;
  customerName: string;
  managerName: string;
  totalPlannedDays: number;
  totalActualHours: number;
  employeeCount: number;
  progress: number;
}

interface RawProjectsWorkloadResponse {
  projects: RawProjectItem[];
  comparison: unknown;
  summary: {
    totalProjects: number;
    activeProjects: number;
    completedProjects: number;
    totalHoursWorked: number;
  };
}

interface RawEmployeeItem {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  totalHoursWorked: number;
  expectedHours: number;
  deviation: number;
  deviationPercentage: number;
}

interface RawEmployeeWorkHoursResponse {
  employees: RawEmployeeItem[];
  period: {
    startDate: string;
    endDate: string;
    workingDays: number;
    expectedHoursPerEmployee: number;
  };
  summary: {
    totalEmployees: number;
    averageHoursWorked: number;
    employeesUnderworking: number;
    employeesOverworking: number;
  };
}

// ─── Projects workload ──────────────────────────────────────────────────────

export function useProjectsWorkload(params: DateRangeParams) {
  return useQuery({
    queryKey: [...ANALYTICS_KEY, 'projects-workload', params],
    queryFn: async (): Promise<ProjectsWorkloadResponse> => {
      const { data } = await api.get<RawProjectsWorkloadResponse>(
        '/analytics/projects-workload',
        { params },
      );

      // Transform backend field names to frontend types
      return {
        projects: data.projects.map((p) => ({
          projectId: p.id,
          projectName: p.name,
          customerName: p.customerName,
          managerName: p.managerName,
          status: p.status as ProjectsWorkloadResponse['projects'][number]['status'],
          employeeCount: p.employeeCount,
          totalHours: p.totalActualHours,
          plannedDays: p.totalPlannedDays,
          progress: p.progress,
        })),
        totalProjects: data.summary.totalProjects,
        activeProjects: data.summary.activeProjects,
        completedProjects: data.summary.completedProjects,
        totalHoursWorked: data.summary.totalHoursWorked,
      };
    },
    enabled: Boolean(params.startDate && params.endDate),
  });
}

// ─── Employee work hours ────────────────────────────────────────────────────

export function useEmployeeWorkHours(params: DateRangeParams) {
  return useQuery({
    queryKey: [...ANALYTICS_KEY, 'employee-work-hours', params],
    queryFn: async (): Promise<EmployeeWorkHoursResponse> => {
      const { data } = await api.get<RawEmployeeWorkHoursResponse>(
        '/analytics/employee-work-hours',
        { params },
      );

      // Transform backend field names to frontend types
      return {
        employees: data.employees.map((e) => ({
          userId: e.id,
          firstName: e.firstName,
          lastName: e.lastName,
          email: e.email,
          hoursWorked: e.totalHoursWorked,
          expectedHours: e.expectedHours,
          deviation: e.deviation,
          deviationPercent: e.deviationPercentage,
        })),
        totalEmployees: data.summary.totalEmployees,
        averageHours: data.summary.averageHoursWorked,
        workingDays: data.period.workingDays,
        expectedHoursPerEmployee: data.period.expectedHoursPerEmployee,
        underworkingCount: data.summary.employeesUnderworking,
        overworkingCount: data.summary.employeesOverworking,
      };
    },
    enabled: Boolean(params.startDate && params.endDate),
  });
}

// ─── Employee reports (drill-down modal) ────────────────────────────────────

export function useEmployeeReports(params: EmployeeReportsParams) {
  return useQuery({
    queryKey: [...ANALYTICS_KEY, 'employee-reports', params],
    queryFn: async () => {
      const { data } = await api.get<{ data: WorkloadActual[] }>(
        '/workload-actual',
        {
          params: {
            userId: params.userId,
            startDate: params.startDate,
            endDate: params.endDate,
            limit: 1000,
          },
        },
      );
      return data.data;
    },
    enabled: Boolean(params.userId && params.startDate && params.endDate),
  });
}

// ─── Finance summary ────────────────────────────────────────────────────────

export function useFinanceSummary(params: DateRangeParams) {
  return useQuery({
    queryKey: [...ANALYTICS_KEY, 'finance-summary', params],
    queryFn: async () => {
      const { data } = await api.get<FinanceSummary>(
        '/analytics/finance/summary',
        { params },
      );
      return data;
    },
    enabled: Boolean(params.startDate && params.endDate),
  });
}

// ─── Monthly dynamics ───────────────────────────────────────────────────────

export function useMonthlyDynamics(params: DateRangeParams) {
  return useQuery({
    queryKey: [...ANALYTICS_KEY, 'finance-monthly', params],
    queryFn: async () => {
      const { data } = await api.get<MonthlyDynamicsItem[]>(
        '/analytics/finance/monthly',
        { params },
      );
      return data;
    },
    enabled: Boolean(params.startDate && params.endDate),
  });
}

// ─── Expenses by category ───────────────────────────────────────────────────

export function useExpensesByCategory(params: DateRangeParams) {
  return useQuery({
    queryKey: [...ANALYTICS_KEY, 'finance-expenses-by-category', params],
    queryFn: async () => {
      const { data } = await api.get<ExpenseByCategoryItem[]>(
        '/analytics/finance/expenses-by-category',
        { params },
      );
      return data;
    },
    enabled: Boolean(params.startDate && params.endDate),
  });
}

// ─── Income by project ──────────────────────────────────────────────────────

export function useIncomeByProject(params: DateRangeParams) {
  return useQuery({
    queryKey: [...ANALYTICS_KEY, 'finance-income-by-project', params],
    queryFn: async () => {
      const { data } = await api.get<IncomeByProjectItem[]>(
        '/analytics/finance/income-by-project',
        { params },
      );
      return data;
    },
    enabled: Boolean(params.startDate && params.endDate),
  });
}
