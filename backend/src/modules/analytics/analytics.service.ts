import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@prisma/client';

export interface ProjectWorkloadData {
  id: string;
  name: string;
  status: string;
  totalPlannedDays: number;
  totalActualHours: number;
  employeeCount: number;
  progress: number; // percentage
}

export interface EmployeeWorkHoursData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  totalHoursWorked: number;
  expectedHours: number;
  deviation: number; // hours difference from expected
  deviationPercentage: number;
}

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  private round1(value: number): number {
    return Math.round(value * 10) / 10;
  }

  async getProjectsWorkload() {
    // Run three targeted queries in parallel instead of one mega-query
    // that loads all relations (customer, manager with passwordHash,
    // workloadPlans, workloadDistributions with nested workloadActual, projectUsers)
    const [projects, planCountsByProject, actualHoursByProject] =
      await Promise.all([
        // 1. Projects with only the fields we need + lightweight relation selects
        this.prisma.project.findMany({
          select: {
            id: true,
            name: true,
            status: true,
            contractDate: true,
            expirationDate: true,
            cost: true,
            customer: { select: { name: true } },
            manager: { select: { firstName: true, lastName: true } },
            _count: { select: { projectUsers: true } },
          },
        }),
        // 2. Aggregate unique plan date counts per project at DB level
        this.prisma.workloadPlan.groupBy({
          by: ['projectId'],
          _count: { id: true },
        }),
        // 3. Aggregate actual hours per project at DB level
        this.prisma.projectWorkloadDistribution.groupBy({
          by: ['projectId'],
          _sum: { hours: true },
        }),
      ]);

    // Build lookup maps for O(1) access during merge
    const planCountMap = new Map(
      planCountsByProject.map((g) => [g.projectId, g._count.id]),
    );
    const actualHoursMap = new Map(
      actualHoursByProject.map((g) => [g.projectId, g._sum.hours ?? 0]),
    );

    let activeCount = 0;
    let completedCount = 0;

    const projectsData = projects.map((project) => {
      const totalPlannedDays = planCountMap.get(project.id) ?? 0;
      const totalActualHours = actualHoursMap.get(project.id) ?? 0;
      const employeeCount = project._count.projectUsers;

      // Calculate progress (assuming 8 hours per planned day)
      const expectedHours = totalPlannedDays * 8;
      const progress =
        expectedHours > 0
          ? Math.min(
              100,
              Math.round((totalActualHours / expectedHours) * 100),
            )
          : 0;

      if (project.status === 'Active') activeCount++;
      if (project.status === 'Completed') completedCount++;

      return {
        id: project.id,
        name: project.name,
        status: project.status,
        customerName: project.customer?.name || 'N/A',
        managerName: project.manager
          ? `${project.manager.firstName} ${project.manager.lastName}`
          : 'N/A',
        totalPlannedDays,
        totalActualHours: this.round1(totalActualHours),
        employeeCount,
        progress,
        contractDate: project.contractDate,
        expirationDate: project.expirationDate,
      };
    });

    return {
      projects: projectsData,
      comparison: null,
      summary: {
        totalProjects: projects.length,
        activeProjects: activeCount,
        completedProjects: completedCount,
        totalHoursWorked: projectsData.reduce(
          (sum, p) => sum + p.totalActualHours,
          0,
        ),
      },
    };
  }

  async getEmployeeWorkHours(startDate?: string, endDate?: string) {
    // Get date range - default to current month
    const now = new Date();
    const start = startDate
      ? new Date(startDate)
      : new Date(now.getFullYear(), now.getMonth(), 1);
    const end = endDate
      ? new Date(endDate)
      : new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Calculate working days in the period (excluding weekends)
    let workingDays = 0;
    const current = new Date(start);
    while (current <= end) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        workingDays++;
      }
      current.setDate(current.getDate() + 1);
    }

    const expectedHoursPerEmployee = workingDays * 8;

    // Run DB-level aggregation and user lookup in parallel.
    // Previously this loaded full User objects (including passwordHash)
    // with all nested workloadActuals, then summed in JS.
    const [hoursByUser, employees] = await Promise.all([
      // 1. Aggregate hours at DB level — no individual rows transferred
      this.prisma.workloadActual.groupBy({
        by: ['userId'],
        where: {
          date: { gte: start, lte: end },
          user: {
            role: { in: [UserRole.Employee, UserRole.Manager] },
          },
        },
        _sum: { hoursWorked: true },
      }),
      // 2. Fetch only the display fields — never expose passwordHash
      this.prisma.user.findMany({
        where: {
          role: { in: [UserRole.Employee, UserRole.Manager] },
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      }),
    ]);

    // Build lookup map for aggregated hours
    const hoursMap = new Map(
      hoursByUser.map((g) => [g.userId, g._sum.hoursWorked ?? 0]),
    );

    const employeesData: EmployeeWorkHoursData[] = employees.map(
      (employee) => {
        const totalHoursWorked = hoursMap.get(employee.id) ?? 0;

        const deviation = totalHoursWorked - expectedHoursPerEmployee;
        const deviationPercentage =
          expectedHoursPerEmployee > 0
            ? Math.round((deviation / expectedHoursPerEmployee) * 100)
            : 0;

        return {
          id: employee.id,
          firstName: employee.firstName,
          lastName: employee.lastName,
          email: employee.email,
          totalHoursWorked: this.round1(totalHoursWorked),
          expectedHours: expectedHoursPerEmployee,
          deviation: this.round1(deviation),
          deviationPercentage,
        };
      },
    );

    // Sort by deviation (most negative first - underworking)
    employeesData.sort((a, b) => a.deviation - b.deviation);

    return {
      employees: employeesData,
      period: {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        workingDays,
        expectedHoursPerEmployee,
      },
      summary: {
        totalEmployees: employeesData.length,
        averageHoursWorked:
          employeesData.length > 0
            ? this.round1(
                employeesData.reduce(
                  (sum, e) => sum + e.totalHoursWorked,
                  0,
                ) / employeesData.length,
              )
            : 0,
        employeesUnderworking: employeesData.filter((e) => e.deviation < -8)
          .length,
        employeesOverworking: employeesData.filter((e) => e.deviation > 8)
          .length,
      },
    };
  }
}
