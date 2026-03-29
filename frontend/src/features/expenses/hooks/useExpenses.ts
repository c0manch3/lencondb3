import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/api/client';
import type {
  Expense,
  ExpenseCategory,
  PaginatedResponse,
} from '@/shared/types';
import type { OverdueSummary } from '@/shared/hooks/useOverdueBadge';

// ─── Query keys ──────────────────────────────────────────────────────────────

const EXPENSES_KEY = ['expenses'] as const;
const OVERDUE_SUMMARY_KEY = ['overdue-summary'] as const;

// ─── Filter params ───────────────────────────────────────────────────────────

export interface ExpenseFilters {
  page: number;
  limit: number;
  category?: ExpenseCategory | '';
  startDate?: string;
  endDate?: string;
}

// ─── Payload types ───────────────────────────────────────────────────────────

export interface CreateExpensePayload {
  date: string;
  amount: number;
  vatAmount?: number | null;
  category: ExpenseCategory;
  description?: string;
}

export interface UpdateExpensePayload extends CreateExpensePayload {
  id: string;
}

export interface ImportResult {
  imported: number;
  errors: { row: number; message: string }[];
}

// ─── List (server-side paginated) ────────────────────────────────────────────

export function useExpenses(filters: ExpenseFilters) {
  return useQuery({
    queryKey: [...EXPENSES_KEY, filters] as const,
    queryFn: async () => {
      const params: Record<string, string | number> = {
        page: filters.page,
        limit: filters.limit,
      };
      if (filters.category) params.category = filters.category;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;

      const { data } = await api.get<PaginatedResponse<Expense>>(
        '/expenses',
        { params },
      );
      return data;
    },
    placeholderData: (prev) => prev,
  });
}

// ─── Create ──────────────────────────────────────────────────────────────────

export function useCreateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateExpensePayload) => {
      const { data } = await api.post<Expense>('/expenses/create', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EXPENSES_KEY });
      queryClient.invalidateQueries({ queryKey: OVERDUE_SUMMARY_KEY });
    },
  });
}

// ─── Update ──────────────────────────────────────────────────────────────────

export function useUpdateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...payload }: UpdateExpensePayload) => {
      const { data } = await api.patch<Expense>(`/expenses/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EXPENSES_KEY });
      queryClient.invalidateQueries({ queryKey: OVERDUE_SUMMARY_KEY });
    },
  });
}

// ─── Delete ──────────────────────────────────────────────────────────────────

export function useDeleteExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/expenses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EXPENSES_KEY });
      queryClient.invalidateQueries({ queryKey: OVERDUE_SUMMARY_KEY });
    },
  });
}

// ─── Import Excel ────────────────────────────────────────────────────────────

export function useImportExpenses() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);

      const { data } = await api.post<ImportResult>(
        '/expenses/import/excel',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EXPENSES_KEY });
    },
  });
}

// ─── Export Excel ────────────────────────────────────────────────────────────

export function useExportExpenses() {
  return useMutation({
    mutationFn: async (
      filters: Pick<ExpenseFilters, 'category' | 'startDate' | 'endDate'>,
    ) => {
      const params: Record<string, string> = {};
      if (filters.category) params.category = filters.category;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;

      const { data, headers } = await api.get('/expenses/export/excel', {
        params,
        responseType: 'blob',
      });

      // Extract filename from Content-Disposition or use default
      const disposition = headers['content-disposition'] as string | undefined;
      const filenameMatch = disposition?.match(/filename="?([^";\n]+)"?/);
      const today = new Date().toISOString().slice(0, 10);
      const filename = filenameMatch?.[1] ?? `expenses_${today}.xlsx`;

      // Trigger browser download
      const url = URL.createObjectURL(data as Blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    },
  });
}

// ─── Overdue summary ─────────────────────────────────────────────────────────

export function useOverdueSummary() {
  return useQuery<OverdueSummary>({
    queryKey: OVERDUE_SUMMARY_KEY,
    queryFn: () =>
      api.get<OverdueSummary>('/expenses/overdue-summary').then((r) => r.data),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 2 * 60 * 1000,
  });
}
