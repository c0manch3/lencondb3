import { useState } from 'react';

export interface UseWorkloadFiltersReturn {
  selectedProject: string;
  setSelectedProject: (value: string) => void;
  selectedEmployee: string;
  setSelectedEmployee: (value: string) => void;
}

/**
 * Manages the project and employee filter dropdowns.
 *
 * Extracted as the simplest hook so the filter state can be shared between
 * the toolbar/filter bar and the data-fetching hook without prop drilling.
 */
export function useWorkloadFilters(): UseWorkloadFiltersReturn {
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');

  return {
    selectedProject,
    setSelectedProject,
    selectedEmployee,
    setSelectedEmployee,
  };
}
