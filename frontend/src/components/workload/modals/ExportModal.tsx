import { useTranslation } from 'react-i18next';
import type { Employee } from '@/components/workload/types';
import type { UseWorkloadExportReturn } from '@/components/workload/hooks/useWorkloadExport';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  exportState: Pick<
    UseWorkloadExportReturn,
    | 'exportEmployee'
    | 'setExportEmployee'
    | 'exportType'
    | 'setExportType'
    | 'exportDateFrom'
    | 'setExportDateFrom'
    | 'exportDateTo'
    | 'setExportDateTo'
    | 'exportFormat'
    | 'setExportFormat'
    | 'isExporting'
  >;
  onSubmit: () => void;
}

export default function ExportModal({
  isOpen,
  onClose,
  employees,
  exportState,
  onSubmit,
}: ExportModalProps) {
  const { t } = useTranslation();

  if (!isOpen) return null;

  const {
    exportEmployee,
    setExportEmployee,
    exportType,
    setExportType,
    exportDateFrom,
    setExportDateFrom,
    exportDateTo,
    setExportDateTo,
    exportFormat,
    setExportFormat,
    isExporting,
  } = exportState;

  return (
    <div className="fixed inset-0 bg-brown-900/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-cream-50 rounded-[0.4rem] shadow-sm w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-brown-900">{t('workload.exportTitle')}</h2>
          <button
            onClick={onClose}
            className="text-brown-400 hover:text-brown-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-brown-700 mb-1">
              {t('workload.exportEmployee')}
            </label>
            <select
              value={exportEmployee}
              onChange={(e) => setExportEmployee(e.target.value)}
              className="w-full px-3 py-2 border border-brown-300 rounded-[0.4rem] focus:ring-2 focus:ring-brown-500 focus:border-brown-500"
            >
              <option value="">{t('workload.exportAllEmployees')}</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.firstName} {emp.lastName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-brown-700 mb-1">
              {t('workload.exportType')}
            </label>
            <select
              value={exportType}
              onChange={(e) => setExportType(e.target.value as 'plan' | 'actual')}
              className="w-full px-3 py-2 border border-brown-300 rounded-[0.4rem] focus:ring-2 focus:ring-brown-500 focus:border-brown-500"
            >
              <option value="plan">{t('workload.exportTypePlan')}</option>
              <option value="actual">{t('workload.exportTypeActual')}</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-brown-700 mb-1">
                {t('workload.exportPeriodFrom')}
              </label>
              <input
                type="date"
                value={exportDateFrom}
                onChange={(e) => setExportDateFrom(e.target.value)}
                className="w-full px-3 py-2 border border-brown-300 rounded-[0.4rem] focus:ring-2 focus:ring-brown-500 focus:border-brown-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-brown-700 mb-1">
                {t('workload.exportPeriodTo')}
              </label>
              <input
                type="date"
                value={exportDateTo}
                onChange={(e) => setExportDateTo(e.target.value)}
                className="w-full px-3 py-2 border border-brown-300 rounded-[0.4rem] focus:ring-2 focus:ring-brown-500 focus:border-brown-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-brown-700 mb-1">
              {t('workload.exportFormat')}
            </label>
            <select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value as 'pdf' | 'csv' | 'xlsx')}
              className="w-full px-3 py-2 border border-brown-300 rounded-[0.4rem] focus:ring-2 focus:ring-brown-500 focus:border-brown-500"
            >
              <option value="csv">{t('workload.exportFormatCsv')}</option>
              <option value="xlsx">{t('workload.exportFormatXlsx')}</option>
              <option value="pdf">{t('workload.exportFormatPdf')}</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2 p-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-brown-700 hover:bg-cream-200 rounded-[0.4rem] font-medium"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={onSubmit}
            disabled={isExporting}
            className="px-4 py-2 bg-brown-600 text-white rounded-[0.4rem] hover:bg-brown-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting ? t('workload.exporting') : t('workload.exportButton')}
          </button>
        </div>
      </div>
    </div>
  );
}
