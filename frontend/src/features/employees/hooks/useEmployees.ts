import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/api/client';
import type { PaginatedResponse, User, UserRole } from '@/shared/types';

// ─── Query keys ─────────────────────────────────────────────────────────────

const EMPLOYEES_KEY = ['employees'] as const;

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CreateEmployeePayload {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: UserRole;
  salary?: number;
}

export interface UpdateEmployeePayload {
  firstName: string;
  lastName: string;
  phone?: string;
  role: UserRole;
  salary?: number | null;
  telegramId?: string;
  dateBirth?: string;
}

interface InviteCreateResponse {
  emailSent: boolean;
  inviteUrl?: string;
}

// ─── Hooks ──────────────────────────────────────────────────────────────────

/** Fetch all employees (paginated, limit 1000 to get all). */
export function useEmployees() {
  return useQuery({
    queryKey: EMPLOYEES_KEY,
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<User>>('/auth', {
        params: { limit: 1000 },
      });
      return data;
    },
  });
}

/** Create a new employee via invite. */
export function useCreateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateEmployeePayload) => {
      const { data } = await api.post<InviteCreateResponse>(
        '/invite/create',
        payload,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EMPLOYEES_KEY });
    },
  });
}

/** Update an existing employee. */
export function useUpdateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...payload
    }: UpdateEmployeePayload & { id: string }) => {
      const { data } = await api.patch<User>(`/auth/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EMPLOYEES_KEY });
    },
  });
}

/** Delete an employee. */
export function useDeleteEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/auth/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EMPLOYEES_KEY });
    },
  });
}

/** Resend invite email to an employee. */
export function useResendInvite() {
  return useMutation({
    mutationFn: async (userId: string) => {
      const { data } = await api.post<InviteCreateResponse>(
        `/invite/resend/${userId}`,
      );
      return data;
    },
  });
}

/** Initiate password reset for an employee. */
export function useInitiateReset() {
  return useMutation({
    mutationFn: async (userId: string) => {
      const { data } = await api.post<{ message: string }>(
        `/invite/initiate-reset/${userId}`,
      );
      return data;
    },
  });
}
