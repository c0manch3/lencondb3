import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared/api/client';

export interface OverdueProject {
  projectId: string;
  projectName: string;
  overdueAmount: number;
  overdueCount: number;
}

export interface OverdueSummary {
  count: number;
  totalAmount: number;
  projects: OverdueProject[];
}

/**
 * Polls the overdue-payment summary every 5 minutes.
 *
 * Only enabled for Admin users — other roles get a permanently
 * idle query (no network requests).
 */
export function useOverdueBadge(userRole?: string) {
  return useQuery<OverdueSummary>({
    queryKey: ['overdue-summary'],
    queryFn: () =>
      api.get<OverdueSummary>('/expenses/overdue-summary').then((r) => r.data),
    refetchInterval: 5 * 60 * 1000,
    enabled: userRole === 'Admin',
  });
}
