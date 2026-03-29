import { type FC, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Select } from '@/shared/components';
import type { Project, User } from '@/shared/types';

interface WorkloadFiltersProps {
  projects: Project[];
  employees: User[];
  selectedProjectId: string;
  selectedEmployeeId: string;
  onProjectChange: (projectId: string) => void;
  onEmployeeChange: (employeeId: string) => void;
  showEmployeeFilter: boolean;
}

const WorkloadFilters: FC<WorkloadFiltersProps> = ({
  projects,
  employees,
  selectedProjectId,
  selectedEmployeeId,
  onProjectChange,
  onEmployeeChange,
  showEmployeeFilter,
}) => {
  const { t } = useTranslation();

  const projectOptions = useMemo(
    () => [
      { value: '', label: t('workload.allProjects') },
      ...projects
        .filter((p) => p.status === 'Active')
        .map((p) => ({ value: p.id, label: p.name })),
    ],
    [projects, t],
  );

  const employeeOptions = useMemo(
    () => [
      { value: '', label: t('workload.allEmployees') },
      ...employees.map((e) => ({
        value: e.id,
        label: `${e.firstName} ${e.lastName}`,
      })),
    ],
    [employees, t],
  );

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="w-full sm:w-56">
        <Select
          options={projectOptions}
          value={selectedProjectId}
          onChange={(e) => onProjectChange(e.target.value)}
          aria-label={t('workload.project')}
        />
      </div>

      {showEmployeeFilter && (
        <div className="w-full sm:w-56">
          <Select
            options={employeeOptions}
            value={selectedEmployeeId}
            onChange={(e) => onEmployeeChange(e.target.value)}
            aria-label={t('workload.employee')}
          />
        </div>
      )}
    </div>
  );
};

export default WorkloadFilters;
