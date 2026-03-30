import type { WorkloadPlan, WorkloadActual, User, Project, UserRole } from '@/shared/types';

// ─── View modes ─────────────────────────────────────────────────────────────

export type CalendarViewMode = 'month' | 'week' | 'day';

// ─── Calendar day cell data ─────────────────────────────────────────────────

export interface CalendarDay {
  date: string; // YYYY-MM-DD
  dayOfMonth: number;
  isToday: boolean;
  isCurrentMonth: boolean;
  isWeekend: boolean;
  isFuture: boolean;
  isPast: boolean;
}

// ─── Plan entry for display in calendar cells ───────────────────────────────

export interface WorkloadPlanEntry {
  id: string;
  userId: string;
  projectId: string;
  managerId: string;
  date: string;
  hours: number | null;
  userName: string;
  userInitials: string;
  projectName: string;
  managerName: string;
}

// ─── Actual entry for display in calendar cells ─────────────────────────────

export interface WorkloadActualEntry {
  id: string;
  userId: string;
  date: string;
  hoursWorked: number;
  userText: string | null;
  userName: string;
  userInitials: string;
  distributions: ActualDistributionEntry[];
}

export interface ActualDistributionEntry {
  id: string;
  projectId: string;
  projectName: string;
  hours: number;
  description: string | null;
}

// ─── Calendar data for a date range ─────────────────────────────────────────

export interface CalendarData {
  plans: Map<string, WorkloadPlanEntry[]>; // date -> entries
  actuals: Map<string, WorkloadActualEntry[]>; // date -> entries
}

// ─── Modal payloads ─────────────────────────────────────────────────────────

export interface AddPlanFormData {
  userId: string;
  projectId: string;
  date: string;
  hours: number | null;
}

export interface EditPlanFormData {
  projectId: string;
  hours: number | null;
}

export interface LogActualFormData {
  date: string;
  hoursWorked: number;
  userText: string;
  distributions: DistributionFormRow[];
}

export interface DistributionFormRow {
  projectId: string;
  hours: number;
  description: string;
}

// ─── Export types ────────────────────────────────────────────────────────────

export type ExportFormat = 'csv' | 'xlsx' | 'pdf';
export type ExportType = 'plan' | 'actual';

export interface ExportFormData {
  userId: string; // '' = all employees
  type: ExportType;
  dateFrom: string;
  dateTo: string;
  format: ExportFormat;
}

// ─── Permission helpers ─────────────────────────────────────────────────────

export interface WorkloadPermissions {
  canCreatePlan: boolean;
  canEditPlan: (plan: WorkloadPlanEntry) => boolean;
  canDeletePlan: (plan: WorkloadPlanEntry) => boolean;
  canLogActual: boolean;
  canExport: boolean;
  canFilterByEmployee: boolean;
  canViewAllEmployees: boolean;
}

export function getWorkloadPermissions(
  user: User | null,
): WorkloadPermissions {
  const role: UserRole | null = user?.role ?? null;
  const userId = user?.id ?? '';

  return {
    canCreatePlan: role === 'Manager' || role === 'Employee',
    canEditPlan: (plan: WorkloadPlanEntry) => {
      if (role === 'Admin') return true;
      if (role === 'Manager') return plan.managerId === userId;
      if (role === 'Employee') return plan.managerId === userId;
      return false;
    },
    canDeletePlan: (plan: WorkloadPlanEntry) => {
      if (role === 'Admin') return true;
      if (role === 'Manager') return plan.managerId === userId;
      if (role === 'Employee') return plan.managerId === userId;
      return false;
    },
    canLogActual: role === 'Manager' || role === 'Employee',
    canExport: role === 'Admin' || role === 'Manager',
    canFilterByEmployee: role === 'Admin' || role === 'Manager',
    canViewAllEmployees: role === 'Admin' || role === 'Manager',
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

export function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function formatUserName(user: Pick<User, 'firstName' | 'lastName'>): string {
  return `${user.firstName} ${user.lastName}`;
}

export function toPlanEntry(plan: WorkloadPlan): WorkloadPlanEntry {
  return {
    id: plan.id,
    userId: plan.userId,
    projectId: plan.projectId,
    managerId: plan.managerId,
    date: plan.date,
    hours: plan.hours ?? null,
    userName: plan.user
      ? formatUserName(plan.user)
      : '',
    userInitials: plan.user
      ? getInitials(plan.user.firstName, plan.user.lastName)
      : '??',
    projectName: plan.project?.name ?? '',
    managerName: plan.manager
      ? formatUserName(plan.manager)
      : '',
  };
}

export function toActualEntry(actual: WorkloadActual): WorkloadActualEntry {
  return {
    id: actual.id,
    userId: actual.userId,
    date: actual.date,
    hoursWorked: actual.hoursWorked,
    userText: actual.userText ?? null,
    userName: actual.user
      ? formatUserName(actual.user)
      : '',
    userInitials: actual.user
      ? getInitials(actual.user.firstName, actual.user.lastName)
      : '??',
    distributions: (actual.distributions ?? []).map((d) => ({
      id: d.id,
      projectId: d.projectId,
      projectName: d.project?.name ?? '',
      hours: d.hours,
      description: d.description ?? null,
    })),
  };
}

// ─── Plan entry color helpers per TABLE_DESIGN.md ───────────────────────────

export type PlanEntryColorType = 'plan-future' | 'plan-today' | 'actual' | 'conflict';

export const PLAN_ENTRY_COLORS: Record<PlanEntryColorType, {
  bg: string;
  text: string;
  border: string;
}> = {
  'plan-future': {
    bg: 'rgba(180, 145, 50, 0.10)',
    text: '#6b5520',
    border: '#b49132',
  },
  'plan-today': {
    bg: 'rgba(75, 108, 56, 0.10)',
    text: '#3d5a2a',
    border: '#4b6c38',
  },
  actual: {
    bg: 'rgba(92, 74, 62, 0.12)',
    text: '#3e2c1e',
    border: '#5c4a3e',
  },
  conflict: {
    bg: 'rgba(156, 60, 40, 0.10)',
    text: '#8b3a2a',
    border: '#9c3c28',
  },
};
