import { useState, useEffect, useCallback } from 'react';
import { api } from '@/services/auth.service';
import type { User } from '@/store/AuthContext';
import {
  isPastDateString,
} from '../types';
import type {
  Project,
  Employee,
  CalendarData,
  ActualCalendarData,
  AllEmployeesActualData,
  WorkloadActualEntry,
  WorkloadActualEntryWithUser,
} from '../types';

// ---------------------------------------------------------------------------
// Parameters
// ---------------------------------------------------------------------------

export interface UseWorkloadDataParams {
  currentMonth: Date;
  selectedProject: string;
  selectedEmployee: string;
  user: User | null;
  isEmployee: boolean;
  isManager: boolean;
}

// ---------------------------------------------------------------------------
// Return type
// ---------------------------------------------------------------------------

export interface UseWorkloadDataReturn {
  // Entity lists
  projects: Project[];
  managedProjects: Project[];
  employees: Employee[];

  // Loading state
  loading: boolean;

  // Calendar data
  calendarData: CalendarData;
  actualCalendarData: ActualCalendarData;
  allEmployeesActualData: AllEmployeesActualData;

  // Re-fetch triggers (used after create/edit/delete)
  fetchCalendarData: () => Promise<void>;
  fetchActualCalendarData: () => Promise<void>;
  fetchAllEmployeesActualData: () => Promise<void>;

  // Derived getters
  getEmployeesForDate: (dateKey: string) => (import('../types').WorkloadPlanEntry | WorkloadActualEntryWithUser)[];
  getActualReportsCountForDate: (dateKey: string) => number;
  getAvailableEmployeesForDate: (dateKey: string) => Employee[];
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Owns **all** data-fetching and server-derived state for the workload
 * calendar:
 *
 * - Projects, employees (fetched once on mount)
 * - Plan + actual calendar data (refetched when month/filters change)
 * - Derived helpers used by views and modals
 */
export function useWorkloadData({
  currentMonth,
  selectedProject,
  selectedEmployee,
  user,
  isEmployee,
  isManager,
}: UseWorkloadDataParams): UseWorkloadDataReturn {
  // ---- entity lists -------------------------------------------------------
  const [projects, setProjects] = useState<Project[]>([]);
  const [managedProjects, setManagedProjects] = useState<Project[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  // ---- calendar data ------------------------------------------------------
  const [calendarData, setCalendarData] = useState<CalendarData>({});
  const [actualCalendarData, setActualCalendarData] = useState<ActualCalendarData>({});
  const [allEmployeesActualData, setAllEmployeesActualData] = useState<AllEmployeesActualData>({});

  // ---- fetchers -----------------------------------------------------------

  const fetchProjects = async () => {
    try {
      const response = await api.get('/project?limit=1000');
      const allProjects = response.data.data;
      setProjects(allProjects);

      if (user) {
        const userManagedProjects = allProjects.filter((p: any) => p.managerId === user.id);
        setManagedProjects(userManagedProjects);
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await api.get('/auth?limit=1000');
      const allUsers = response.data.data;
      const employeesAndManagers = allUsers
        .filter((u: Employee) => u.role === 'Employee' || u.role === 'Manager')
        .sort((a: Employee, b: Employee) => (a.lastName ?? '').localeCompare(b.lastName ?? '', 'ru'));
      setEmployees(employeesAndManagers);
    } catch (error) {
      console.error('Failed to fetch employees:', error);
    }
  };

  const fetchCalendarData = useCallback(async () => {
    try {
      const startDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const endDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

      if (selectedProject) params.append('projectId', selectedProject);

      // Feature #334: Employee users should only see their own workload plans
      if (isEmployee && user) {
        params.append('userId', user.id);
      } else if (selectedEmployee) {
        params.append('userId', selectedEmployee);
      }

      const response = await api.get(`/workload-plan/calendar?${params}`);
      setCalendarData(response.data);
    } catch (error) {
      console.error('Failed to fetch calendar data:', error);
    }
  }, [currentMonth, selectedProject, selectedEmployee, isEmployee, user]);

  const fetchActualCalendarData = useCallback(async () => {
    try {
      const startDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const endDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

      let endpoint = '/workload-actual/my';
      const isPaginated = selectedEmployee && isManager;
      if (isPaginated) {
        endpoint = '/workload-actual';
        params.append('userId', selectedEmployee);
        params.append('limit', '1000');
      }

      const response = await api.get(`${endpoint}?${params}`);
      const entries: WorkloadActualEntry[] = isPaginated ? response.data.data : response.data;

      const calendarObj: ActualCalendarData = {};
      entries.forEach((entry: WorkloadActualEntry) => {
        const d = new Date(entry.date);
        const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        calendarObj[dateKey] = entry;
      });
      setActualCalendarData(calendarObj);
    } catch (error) {
      console.error('Failed to fetch actual calendar data:', error);
    }
  }, [currentMonth, selectedEmployee, isManager]);

  const fetchAllEmployeesActualData = useCallback(async () => {
    if (!isManager) return;

    try {
      const startDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const endDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

      params.append('limit', '1000');
      const response = await api.get(`/workload-actual?${params}`);

      const groupedData: AllEmployeesActualData = {};
      (response.data.data as WorkloadActualEntryWithUser[]).forEach((entry: WorkloadActualEntryWithUser) => {
        const d = new Date(entry.date);
        const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        if (!groupedData[dateKey]) {
          groupedData[dateKey] = [];
        }
        groupedData[dateKey].push(entry);
      });
      setAllEmployeesActualData(groupedData);
    } catch (error) {
      console.error('Failed to fetch all employees actual data:', error);
    }
  }, [currentMonth, isManager]);

  // ---- effects ------------------------------------------------------------

  // Initial fetch on mount
  useEffect(() => {
    fetchProjects();
    fetchEmployees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refetch when month or filters change
  useEffect(() => {
    fetchCalendarData();
    fetchActualCalendarData();
    fetchAllEmployeesActualData();
  }, [fetchCalendarData, fetchActualCalendarData, fetchAllEmployeesActualData]);

  // ---- derived getters ----------------------------------------------------

  const getEmployeesForDate = useCallback(
    (dateKey: string) => {
      const isAllEmployeesMode = !selectedEmployee;
      const isSingleEmployeeMode = selectedEmployee && selectedProject;
      const isSingleEmployeeAllProjectsMode = selectedEmployee && !selectedProject;
      const dateIsFuture = !isPastDateString(dateKey);

      if (isAllEmployeesMode && isManager) {
        if (dateIsFuture) {
          const plans = calendarData[dateKey] || [];
          if (selectedProject) {
            return plans.filter(plan => plan.project.id === selectedProject);
          }
          return plans;
        }

        const actualReports = allEmployeesActualData[dateKey] || [];

        if (selectedProject) {
          const filteredActuals = actualReports.filter(report =>
            report.distributions?.some(dist => dist.projectId === selectedProject),
          );
          if (filteredActuals.length === 0) {
            const plans = calendarData[dateKey] || [];
            return plans.filter(plan => plan.project.id === selectedProject);
          }
          return filteredActuals;
        }

        if (actualReports.length === 0) {
          return calendarData[dateKey] || [];
        }

        return actualReports;
      }

      if ((isSingleEmployeeMode || isSingleEmployeeAllProjectsMode) && isManager) {
        if (dateIsFuture) {
          const plans = calendarData[dateKey] || [];
          return plans.filter(plan => plan.user.id === selectedEmployee);
        }

        const dayActual = actualCalendarData[dateKey];
        if (dayActual) {
          const selectedEmp = employees.find(e => e.id === selectedEmployee);
          return [
            {
              ...dayActual,
              user: selectedEmp
                ? { id: selectedEmp.id, firstName: selectedEmp.firstName, lastName: selectedEmp.lastName }
                : { id: '', firstName: '', lastName: '' },
            },
          ];
        }

        const plans = calendarData[dateKey] || [];
        return plans.filter(plan => plan.user.id === selectedEmployee);
      }

      return calendarData[dateKey] || [];
    },
    [selectedEmployee, selectedProject, isManager, calendarData, actualCalendarData, allEmployeesActualData, employees],
  );

  const getActualReportsCountForDate = useCallback(
    (dateKey: string) => {
      const actualReports = allEmployeesActualData[dateKey] || [];

      if (!selectedProject) {
        return actualReports.length;
      }

      return actualReports.filter(report =>
        report.distributions?.some(dist => dist.projectId === selectedProject),
      ).length;
    },
    [allEmployeesActualData, selectedProject],
  );

  const getAvailableEmployeesForDate = useCallback(
    (_dateKey: string) => {
      // Multi-project support: employees can have multiple plans per day
      return employees;
    },
    [employees],
  );

  // ---- public surface -----------------------------------------------------
  return {
    projects,
    managedProjects,
    employees,
    loading,
    calendarData,
    actualCalendarData,
    allEmployeesActualData,
    fetchCalendarData,
    fetchActualCalendarData,
    fetchAllEmployeesActualData,
    getEmployeesForDate,
    getActualReportsCountForDate,
    getAvailableEmployeesForDate,
  };
}
