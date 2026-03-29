import { useTranslation } from 'react-i18next';
import type { Project, Employee } from './types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface WorkloadFiltersProps {
  selectedProject: string;
  setSelectedProject: (value: string) => void;
  selectedEmployee: string;
  setSelectedEmployee: (value: string) => void;
  projects: Project[];
  employees: Employee[];
  /** When true the employee dropdown is hidden (Employee role sees only own data). */
  isEmployee: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Filter bar with project and employee dropdowns.
 *
 * The employee dropdown is conditionally hidden for the Employee role
 * (Feature #334) because employees can only view their own data.
 */
export default function WorkloadFilters({
  selectedProject,
  setSelectedProject,
  selectedEmployee,
  setSelectedEmployee,
  projects,
  employees,
  isEmployee,
}: WorkloadFiltersProps) {
  const { t } = useTranslation();

  return (
    <div className="card p-4 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-brown-700 mb-1">
            {t('workload.project')}
          </label>
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="w-full px-3 py-2 border border-brown-300 rounded-[0.4rem] focus:ring-2 focus:ring-brown-500 focus:border-brown-500"
            aria-label={t('workload.selectProject')}
          >
            <option value="">{t('workload.allProjects')}</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>

        {/* Feature #334: Hide employee filter for Employee role */}
        {!isEmployee && (
          <div>
            <label className="block text-sm font-medium text-brown-700 mb-1">
              {t('workload.employee')}
            </label>
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="w-full px-3 py-2 border border-brown-300 rounded-[0.4rem] focus:ring-2 focus:ring-brown-500 focus:border-brown-500"
              aria-label={t('workload.selectEmployee')}
            >
              <option value="">{t('workload.allEmployees')}</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.firstName} {employee.lastName}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
}
