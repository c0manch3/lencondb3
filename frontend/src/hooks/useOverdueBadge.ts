import { useEffect, useState, useRef } from 'react';
import { useAuthState } from '@/store/AuthContext';
import { api } from '@/services/auth.service';

export interface OverdueProject {
  projectId: string;
  projectName: string;
  overdueCount: number;
  overdueAmount: number;
}

interface OverdueSummary {
  count: number;
  totalAmount: number;
  projects: OverdueProject[];
}

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export function useOverdueBadge(): OverdueSummary {
  const { user } = useAuthState();
  const [data, setData] = useState<OverdueSummary>({ count: 0, totalAmount: 0, projects: [] });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (user?.role !== 'Admin') {
      return;
    }

    const fetchOverdue = async () => {
      try {
        const response = await api.get<OverdueSummary>('/expenses/overdue-summary');
        setData(response.data);
      } catch {
        // Badge is non-critical — silently ignore errors
      }
    };

    fetchOverdue();
    intervalRef.current = setInterval(fetchOverdue, POLL_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [user?.role]);

  return data;
}
