import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/api/client';
import type { PaymentSchedule, PaymentType, PaginatedResponse } from '@/shared/types';

// ─── Query keys ─────────────────────────────────────────────────────────────

const PAYMENTS_KEY = (projectId: string) => ['payments', projectId] as const;

// ─── Payload types ──────────────────────────────────────────────────────────

export interface CreatePaymentPayload {
  projectId: string;
  type: PaymentType;
  name: string;
  amount: number;
  expectedDate: string;
  description?: string;
}

// ─── Hooks ──────────────────────────────────────────────────────────────────

/** Fetch all payments for a project. */
export function usePayments(projectId: string | undefined) {
  return useQuery({
    queryKey: PAYMENTS_KEY(projectId ?? ''),
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<PaymentSchedule>>(
        '/payment-schedule',
        { params: { projectId, limit: 1000 } },
      );
      return data;
    },
    enabled: Boolean(projectId),
  });
}

/** Create a new payment schedule entry. */
export function useCreatePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreatePaymentPayload) => {
      const { data } = await api.post<PaymentSchedule>(
        '/payment-schedule/create',
        payload,
      );
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: PAYMENTS_KEY(variables.projectId),
      });
    },
  });
}

/** Mark a payment as paid (sets actualDate to today, isPaid = true). */
export function useMarkPaid() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      paymentId,
      projectId,
    }: {
      paymentId: string;
      projectId: string;
    }) => {
      const { data } = await api.patch<PaymentSchedule>(
        `/payment-schedule/${paymentId}/mark-paid`,
      );
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: PAYMENTS_KEY(variables.projectId),
      });
    },
  });
}

/** Delete a payment schedule entry. */
export function useDeletePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      paymentId,
      projectId,
    }: {
      paymentId: string;
      projectId: string;
    }) => {
      await api.delete(`/payment-schedule/${paymentId}`);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: PAYMENTS_KEY(variables.projectId),
      });
    },
  });
}
