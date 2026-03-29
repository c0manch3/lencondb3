import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/api/client';
import type { Company, CompanyType, PaginatedResponse } from '@/shared/types';

// ─── Query keys ─────────────────────────────────────────────────────────────

const COMPANIES_KEY = ['companies'] as const;

// ─── Payload types ──────────────────────────────────────────────────────────

export interface CreateCompanyPayload {
  name: string;
  type: CompanyType;
  address?: string;
  phone?: string;
  email?: string;
}

export interface UpdateCompanyPayload {
  name: string;
  type: CompanyType;
  address?: string;
  phone?: string;
  email?: string;
  postalCode?: string;
}

// ─── Hooks ──────────────────────────────────────────────────────────────────

export function useCompanies() {
  return useQuery({
    queryKey: COMPANIES_KEY,
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Company>>(
        '/company',
        { params: { limit: 1000 } },
      );
      return data;
    },
  });
}

export function useCreateCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateCompanyPayload) => {
      const { data } = await api.post<Company>('/company/create', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COMPANIES_KEY });
    },
  });
}

export function useUpdateCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...payload }: UpdateCompanyPayload & { id: string }) => {
      const { data } = await api.patch<Company>(`/company/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COMPANIES_KEY });
    },
  });
}

export function useDeleteCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/company/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COMPANIES_KEY });
    },
  });
}
