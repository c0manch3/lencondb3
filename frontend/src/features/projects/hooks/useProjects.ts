import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/api/client';
import type {
  Project,
  User,
  PaginatedResponse,
  ProjectType,
  ProjectStatus,
} from '@/shared/types';

// ─── Query keys ─────────────────────────────────────────────────────────────

export const PROJECTS_KEY = ['projects'] as const;
const PROJECT_KEY = (id: string) => ['project', id] as const;
const PROJECT_TEAM_KEY = (id: string) => ['project', id, 'team'] as const;
const AVAILABLE_USERS_KEY = (id: string) => ['project', id, 'available-users'] as const;
const PROJECT_WORKLOAD_KEY = (id: string) => ['project', id, 'workload'] as const;
const USERS_KEY = ['users'] as const;

// ─── Payload types ──────────────────────────────────────────────────────────

export interface CreateProjectPayload {
  name: string;
  customerId?: string;
  managerId: string;
  type?: ProjectType;
  mainProjectId?: string;
  contractDate: string;
  expirationDate: string;
  cost?: number;
}

export interface UpdateProjectPayload {
  name?: string;
  status?: ProjectStatus;
  contractDate?: string;
  expirationDate?: string;
  cost?: number | null;
}

// ─── Workload response types ────────────────────────────────────────────────

export interface EmployeeWorkloadEntry {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  totalHours: number;
  reportsCount: number;
  reports?: WorkloadReport[];
}

export interface WorkloadReport {
  date: string;
  hoursWorked: number;
  description?: string;
  dayNotes?: string;
  totalDayHours?: number;
}

export interface ProjectWorkloadResponse {
  projectId: string;
  projectName: string;
  totalProjectHours: number;
  employeeCount: number;
  employeeWorkload: EmployeeWorkloadEntry[];
}

// ─── Hooks ──────────────────────────────────────────────────────────────────

/** Fetch all projects (limit 1000 to get the full list for client-side filtering). */
export function useProjects() {
  return useQuery({
    queryKey: PROJECTS_KEY,
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Project>>(
        '/project',
        { params: { limit: 1000 } },
      );
      return data;
    },
  });
}

/** Fetch a single project by ID (includes nested relations). */
export function useProject(id: string | undefined) {
  return useQuery({
    queryKey: PROJECT_KEY(id ?? ''),
    queryFn: async () => {
      const { data } = await api.get<Project>(`/project/${id}`);
      return data;
    },
    enabled: Boolean(id),
  });
}

/** Create a new project. */
export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateProjectPayload) => {
      const { data } = await api.post<Project>('/project/create', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROJECTS_KEY });
    },
  });
}

/** Update an existing project. */
export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...payload }: UpdateProjectPayload & { id: string }) => {
      const { data } = await api.patch<Project>(`/project/${id}`, payload);
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: PROJECTS_KEY });
      queryClient.invalidateQueries({ queryKey: PROJECT_KEY(variables.id) });
    },
  });
}

/** Delete a project. */
export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/project/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROJECTS_KEY });
    },
  });
}

// ─── Team management ────────────────────────────────────────────────────────

/** Fetch team members of a project. */
export function useProjectTeam(projectId: string | undefined) {
  return useQuery({
    queryKey: PROJECT_TEAM_KEY(projectId ?? ''),
    queryFn: async () => {
      const { data } = await api.get<User[]>(`/project/${projectId}/users`);
      return data;
    },
    enabled: Boolean(projectId),
  });
}

/** Fetch users not yet on the project team. */
export function useAvailableUsers(projectId: string | undefined) {
  return useQuery({
    queryKey: AVAILABLE_USERS_KEY(projectId ?? ''),
    queryFn: async () => {
      const { data } = await api.get<User[]>(
        `/project/${projectId}/available-users`,
      );
      return data;
    },
    enabled: Boolean(projectId),
  });
}

/** Add a user to the project team. */
export function useAddTeamMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      projectId,
      userId,
    }: {
      projectId: string;
      userId: string;
    }) => {
      await api.post(`/project/${projectId}/users/${userId}`);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: PROJECT_TEAM_KEY(variables.projectId),
      });
      queryClient.invalidateQueries({
        queryKey: AVAILABLE_USERS_KEY(variables.projectId),
      });
    },
  });
}

/** Remove a user from the project team. */
export function useRemoveTeamMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      projectId,
      userId,
    }: {
      projectId: string;
      userId: string;
    }) => {
      await api.delete(`/project/${projectId}/users/${userId}`);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: PROJECT_TEAM_KEY(variables.projectId),
      });
      queryClient.invalidateQueries({
        queryKey: AVAILABLE_USERS_KEY(variables.projectId),
      });
    },
  });
}

// ─── Project workload ───────────────────────────────────────────────────────

/** Fetch workload data for employees on this project. */
export function useProjectWorkload(projectId: string | undefined) {
  return useQuery({
    queryKey: PROJECT_WORKLOAD_KEY(projectId ?? ''),
    queryFn: async () => {
      const { data } = await api.get<ProjectWorkloadResponse>(
        `/project/${projectId}/workload/employees`,
      );
      return data;
    },
    enabled: Boolean(projectId),
  });
}

// ─── Users (for dropdowns) ──────────────────────────────────────────────────

/** Fetch all users (for manager dropdown in project form). */
export function useUsers() {
  return useQuery({
    queryKey: USERS_KEY,
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<User>>('/auth', {
        params: { limit: 1000 },
      });
      return data;
    },
  });
}
