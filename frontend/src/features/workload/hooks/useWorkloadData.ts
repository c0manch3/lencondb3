import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/api/client';
import type {
  WorkloadPlan,
  WorkloadActual,
  PaginatedResponse,
  User,
  Project,
} from '@/shared/types';
import {
  toPlanEntry,
  toActualEntry,
  formatUserName,
  getInitials,
  type WorkloadPlanEntry,
  type WorkloadActualEntry,
  type CalendarData,
} from '../types';

// ─── Query keys ─────────────────────────────────────────────────────────────

const WORKLOAD_KEYS = {
  all: ['workload'] as const,
  calendar: (startDate: string, endDate: string, projectId?: string, userId?: string, canViewAll?: boolean) =>
    ['workload', 'calendar', { startDate, endDate, projectId, userId, canViewAll }] as const,
  actuals: (startDate: string, endDate: string, userId?: string) =>
    ['workload', 'actuals', { startDate, endDate, userId }] as const,
  myActuals: (startDate: string, endDate: string) =>
    ['workload', 'my-actuals', { startDate, endDate }] as const,
  employees: ['workload-employees'] as const,
  projects: ['workload-projects'] as const,
};

// ─── API payload types ──────────────────────────────────────────────────────

interface CreatePlanPayload {
  userId: string;
  projectId: string;
  date: string;
  hours?: number | null;
}

interface UpdatePlanPayload {
  id: string;
  projectId: string;
  hours?: number | null;
}

interface LogActualPayload {
  date: string;
  hoursWorked: number;
  userText?: string;
  distributions?: Array<{
    projectId: string;
    hours: number;
    description?: string;
  }>;
}

// ─── Calendar data hook ─────────────────────────────────────────────────────

export function useCalendarData(
  startDate: string,
  endDate: string,
  projectId?: string,
  userId?: string,
  canViewAllEmployees?: boolean,
) {
  return useQuery({
    queryKey: WORKLOAD_KEYS.calendar(startDate, endDate, projectId, userId, canViewAllEmployees),
    queryFn: async (): Promise<CalendarData> => {
      const params: Record<string, string> = { startDate, endDate };
      if (projectId) params.projectId = projectId;
      if (userId) params.userId = userId;

      // Determine actuals fetch strategy:
      // - If userId is specified, fetch that user's actuals via paginated endpoint
      // - If canViewAllEmployees and no userId, fetch ALL employees' actuals
      // - Otherwise, fetch only the current user's actuals
      const fetchActuals = () => {
        if (userId) {
          return api.get<PaginatedResponse<WorkloadActual>>('/workload-actual', {
            params: { ...params, limit: '10000' },
          });
        }
        if (canViewAllEmployees) {
          return api.get<PaginatedResponse<WorkloadActual>>('/workload-actual', {
            params: { ...params, limit: '10000' },
          });
        }
        return api.get<WorkloadActual[]>('/workload-actual/my', {
          params: { startDate, endDate },
        });
      };

      // Fetch plans and actuals in parallel
      const [plansRes, actualsRes] = await Promise.all([
        api.get<Record<string, unknown[]>>('/workload-plan/calendar', { params }),
        fetchActuals(),
      ]);

      const rawActuals: WorkloadActual[] = Array.isArray(actualsRes.data)
        ? actualsRes.data
        : actualsRes.data.data;

      // Plans endpoint returns grouped object: Record<string, CalendarPlanItem[]>
      const groupedPlans = plansRes.data as Record<string, Array<{
        id: string;
        user: { id: string; firstName: string; lastName: string };
        project: { id: string; name: string };
        manager: { id: string; firstName: string; lastName: string };
        hours: number | null;
      }>>;

      const plans = new Map<string, WorkloadPlanEntry[]>();
      for (const [dateKey, datePlans] of Object.entries(groupedPlans)) {
        if (!Array.isArray(datePlans)) continue;
        const entries: WorkloadPlanEntry[] = datePlans
          .filter(item => item && item.user && item.project && item.manager)
          .map(item => ({
            id: item.id,
            userId: item.user.id,
            projectId: item.project.id,
            managerId: item.manager.id,
            date: dateKey,
            hours: item.hours ?? null,
            userName: formatUserName(item.user),
            userInitials: getInitials(item.user.firstName, item.user.lastName),
            projectName: item.project.name,
            managerName: formatUserName(item.manager),
          }));
        plans.set(dateKey, entries);
      }

      // Group actuals by date
      const actuals = new Map<string, WorkloadActualEntry[]>();
      for (const actual of rawActuals) {
        const dateKey = actual.date.slice(0, 10);
        const entry = toActualEntry(actual);
        const existing = actuals.get(dateKey);
        if (existing) {
          existing.push(entry);
        } else {
          actuals.set(dateKey, [entry]);
        }
      }

      return { plans, actuals };
    },
    enabled: Boolean(startDate && endDate),
    staleTime: 30_000,
  });
}

// ─── Employees list (for filters & modals) ──────────────────────────────────

export function useWorkloadEmployees() {
  return useQuery({
    queryKey: WORKLOAD_KEYS.employees,
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<User>>('/auth', {
        params: { limit: 1000 },
      });
      return data.data;
    },
    staleTime: 60_000,
  });
}

// ─── Projects list (for filters & modals) ───────────────────────────────────

export function useWorkloadProjects() {
  return useQuery({
    queryKey: WORKLOAD_KEYS.projects,
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Project>>('/project', {
        params: { limit: 1000 },
      });
      return data.data;
    },
    staleTime: 60_000,
  });
}

// ─── Mutations ──────────────────────────────────────────────────────────────

export function useCreatePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreatePlanPayload) => {
      const { data } = await api.post<WorkloadPlan>(
        '/workload-plan/create',
        payload,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WORKLOAD_KEYS.all });
    },
  });
}

export function useUpdatePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...payload }: UpdatePlanPayload) => {
      const { data } = await api.patch<WorkloadPlan>(
        `/workload-plan/${id}`,
        payload,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WORKLOAD_KEYS.all });
    },
  });
}

export function useDeletePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/workload-plan/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WORKLOAD_KEYS.all });
    },
  });
}

export function useLogActual() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: LogActualPayload) => {
      const { data } = await api.post<WorkloadActual>(
        '/workload-actual/create',
        payload,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WORKLOAD_KEYS.all });
    },
  });
}

interface UpdateActualPayload {
  id: string;
  hoursWorked: number;
  userText?: string;
  distributions?: Array<{
    projectId: string;
    hours: number;
    description?: string;
  }>;
}

export function useUpdateActual() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...payload }: UpdateActualPayload) => {
      const { data } = await api.patch<WorkloadActual>(
        `/workload-actual/${id}`,
        payload,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WORKLOAD_KEYS.all });
    },
  });
}

// ─── Export data fetchers ───────────────────────────────────────────────────

export async function fetchPlansForExport(params: {
  startDate: string;
  endDate: string;
  userId?: string;
}): Promise<WorkloadPlan[]> {
  const queryParams: Record<string, string> = {
    startDate: params.startDate,
    endDate: params.endDate,
    limit: '10000',
  };
  if (params.userId) queryParams.userId = params.userId;

  const { data } = await api.get<PaginatedResponse<WorkloadPlan>>(
    '/workload-plan',
    { params: queryParams },
  );
  return data.data;
}

export async function fetchActualsForExport(params: {
  startDate: string;
  endDate: string;
  userId?: string;
}): Promise<WorkloadActual[]> {
  const queryParams: Record<string, string> = {
    startDate: params.startDate,
    endDate: params.endDate,
    limit: '10000',
  };
  if (params.userId) queryParams.userId = params.userId;

  const { data } = await api.get<PaginatedResponse<WorkloadActual>>(
    '/workload-actual',
    { params: queryParams },
  );
  return data.data;
}

// ─── Derived helpers ────────────────────────────────────────────────────────

/** Get plan entries for a specific date. */
export function getPlansForDate(
  calendarData: CalendarData | undefined,
  date: string,
): WorkloadPlanEntry[] {
  return calendarData?.plans.get(date) ?? [];
}

/** Get actual entries for a specific date. */
export function getActualsForDate(
  calendarData: CalendarData | undefined,
  date: string,
): WorkloadActualEntry[] {
  return calendarData?.actuals.get(date) ?? [];
}

/** Get unique employees who have plans or actuals on a date. */
export function getEmployeesForDate(
  calendarData: CalendarData | undefined,
  date: string,
): string[] {
  const ids = new Set<string>();
  const plans = calendarData?.plans.get(date) ?? [];
  const actuals = calendarData?.actuals.get(date) ?? [];

  for (const p of plans) ids.add(p.userId);
  for (const a of actuals) ids.add(a.userId);

  return Array.from(ids);
}

/** Get count of actuals for a date (aggregate). */
export function getActualsCountForDate(
  calendarData: CalendarData | undefined,
  date: string,
): number {
  return calendarData?.actuals.get(date)?.length ?? 0;
}

/** Get count of plans for a date (aggregate). */
export function getPlansCountForDate(
  calendarData: CalendarData | undefined,
  date: string,
): number {
  return calendarData?.plans.get(date)?.length ?? 0;
}
