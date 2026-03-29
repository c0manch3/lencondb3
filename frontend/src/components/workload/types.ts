/**
 * Shared types and date utility functions for the Workload feature.
 *
 * These interfaces are the lightweight, view-local shapes returned by the
 * workload API endpoints.  They deliberately differ from the full ORM
 * entities defined in `@/types/index.ts` to keep the bundle lean and
 * avoid coupling the calendar views to the complete database schema.
 */

// ---------------------------------------------------------------------------
// Entity interfaces
// ---------------------------------------------------------------------------

export interface Project {
  id: string;
  name: string;
  status: string;
}

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
}

export interface WorkloadPlanEntry {
  id: string;
  user: { id: string; firstName: string; lastName: string };
  project: { id: string; name: string };
  manager: { id: string; firstName: string; lastName: string };
  hours?: number | null;
}

export interface WorkloadActualEntry {
  id: string;
  date: string;
  hoursWorked: number;
  userText?: string;
  distributions?: {
    id: string;
    projectId: string;
    project: { id: string; name: string };
    hours: number;
    description?: string;
  }[];
}

export interface WorkloadActualEntryWithUser extends WorkloadActualEntry {
  user: { id: string; firstName: string; lastName: string };
}

// ---------------------------------------------------------------------------
// Composite / record types
// ---------------------------------------------------------------------------

export type CalendarData = Record<string, WorkloadPlanEntry[]>;

export type ActualCalendarData = Record<string, WorkloadActualEntry>;

export type AllEmployeesActualData = Record<string, WorkloadActualEntryWithUser[]>;

/** Form-level distribution row used in the "Log Actual Hours" modal. */
export interface ActualDistribution {
  projectId: string;
  hours: string;
  description: string;
}

// ---------------------------------------------------------------------------
// View mode
// ---------------------------------------------------------------------------

export type ViewMode = 'day' | 'week' | 'month';

/** Single cell in the month/week calendar grid. */
export interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
}

// ---------------------------------------------------------------------------
// Date utility functions
// ---------------------------------------------------------------------------

/** Returns `true` when `date` is today or any day in the future. */
export function isFutureDate(date: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const compareDate = new Date(date);
  compareDate.setHours(0, 0, 0, 0);
  return compareDate >= today;
}

/** String variant of {@link isFutureDate}. */
export function isFutureDateString(dateStr: string): boolean {
  return isFutureDate(new Date(dateStr));
}

/** Returns `true` when `date` is today or any day in the past. */
export function isTodayOrPast(date: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const compareDate = new Date(date);
  compareDate.setHours(0, 0, 0, 0);
  return compareDate <= today;
}

/** String variant of {@link isTodayOrPast}. */
export function isTodayOrPastString(dateStr: string): boolean {
  return isTodayOrPast(new Date(dateStr));
}

/** Returns `true` when `date` is exactly today. */
export function isToday(date: Date): boolean {
  const today = new Date();
  return date.toDateString() === today.toDateString();
}

/** Returns `true` when `date` is strictly before today. */
export function isPastDate(date: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const compareDate = new Date(date);
  compareDate.setHours(0, 0, 0, 0);
  return compareDate < today;
}

/** String variant of {@link isPastDate}. */
export function isPastDateString(dateStr: string): boolean {
  return isPastDate(new Date(dateStr));
}

/** Formats a `Date` into a `YYYY-MM-DD` string used as calendar data key. */
export function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
