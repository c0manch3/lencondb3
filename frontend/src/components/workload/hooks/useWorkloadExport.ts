import { useState } from 'react';
import { api } from '@/services/auth.service';
import toast from 'react-hot-toast';
import type { TFunction } from 'i18next';

// ---------------------------------------------------------------------------
// Parameters
// ---------------------------------------------------------------------------

export interface UseWorkloadExportParams {
  t: TFunction;
}

// ---------------------------------------------------------------------------
// Return type
// ---------------------------------------------------------------------------

export interface UseWorkloadExportReturn {
  // Modal state
  showExportModal: boolean;
  setShowExportModal: (v: boolean) => void;

  // Form state
  exportEmployee: string;
  setExportEmployee: (v: string) => void;
  exportType: 'plan' | 'actual';
  setExportType: (v: 'plan' | 'actual') => void;
  exportDateFrom: string;
  setExportDateFrom: (v: string) => void;
  exportDateTo: string;
  setExportDateTo: (v: string) => void;
  exportFormat: 'pdf' | 'csv' | 'xlsx';
  setExportFormat: (v: 'pdf' | 'csv' | 'xlsx') => void;

  // Status
  isExporting: boolean;

  // Action
  handleExportSubmit: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Encapsulates the entire export workflow: modal form state, CSV / XLSX / PDF
 * generation (with dynamic imports for jsPDF and xlsx), and the submit handler
 * that fetches data from the API and triggers the download.
 */
export function useWorkloadExport({ t }: UseWorkloadExportParams): UseWorkloadExportReturn {
  // ---- modal / form state -------------------------------------------------
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportEmployee, setExportEmployee] = useState<string>('');
  const [exportType, setExportType] = useState<'plan' | 'actual'>('plan');
  const [exportDateFrom, setExportDateFrom] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [exportDateTo, setExportDateTo] = useState<string>(() => {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;
  });
  const [exportFormat, setExportFormat] = useState<'pdf' | 'csv' | 'xlsx'>('csv');
  const [isExporting, setIsExporting] = useState(false);

  // ---- generators ---------------------------------------------------------

  const generateCSV = (data: any[], type: 'plan' | 'actual') => {
    const BOM = '\uFEFF';
    let rows: string[];

    const escapeCSV = (val: string): string => {
      let escaped = val.replace(/"/g, '""');
      if (/^[=+\-@\t\r]/.test(escaped)) {
        escaped = "'" + escaped;
      }
      return escaped;
    };

    if (type === 'plan') {
      rows = [`"${escapeCSV(t('workload.date'))}"\t"${escapeCSV(t('workload.employee'))}"\t"${escapeCSV(t('workload.project'))}"\t"${escapeCSV(t('workload.planHours'))}"`];
      data.forEach((entry: any) => {
        const date = escapeCSV(new Date(entry.date).toLocaleDateString());
        const employee = escapeCSV(`${entry.user.firstName} ${entry.user.lastName}`);
        const project = escapeCSV(entry.project.name);
        const hours = entry.hours != null ? escapeCSV(String(entry.hours)) : '';
        rows.push(`"${date}"\t"${employee}"\t"${project}"\t"${hours}"`);
      });
    } else {
      rows = [`"${escapeCSV(t('workload.date'))}"\t"${escapeCSV(t('workload.employee'))}"\t"${escapeCSV(t('workload.hours'))}"\t"${escapeCSV(t('workload.project'))}"\t"${escapeCSV(t('workload.description'))}"`];
      data.forEach((entry: any) => {
        const date = escapeCSV(new Date(entry.date).toLocaleDateString());
        const employee = escapeCSV(entry.user ? `${entry.user.firstName} ${entry.user.lastName}` : '');
        if (entry.distributions && entry.distributions.length > 0) {
          entry.distributions.forEach((dist: any) => {
            const hours = escapeCSV(String(dist.hours));
            const projectName = escapeCSV(dist.project.name);
            const description = escapeCSV(dist.description || '');
            rows.push(`"${date}"\t"${employee}"\t"${hours}"\t"${projectName}"\t"${description}"`);
          });
        } else {
          const hours = escapeCSV(String(entry.hoursWorked));
          rows.push(`"${date}"\t"${employee}"\t"${hours}"\t""\t""`);
        }
      });
    }

    const csvContent = BOM + rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `workload-${type}-${exportDateFrom}-to-${exportDateTo}.csv`;
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  const generateXLSX = async (data: any[], type: 'plan' | 'actual') => {
    let XLSX: typeof import('xlsx');
    try {
      XLSX = await import('xlsx');
    } catch {
      toast.error(t('common.error'));
      return;
    }

    let rows: Record<string, string>[];

    if (type === 'plan') {
      rows = data.map((entry: any) => ({
        [t('workload.date')]: new Date(entry.date).toLocaleDateString(),
        [t('workload.employee')]: `${entry.user.firstName} ${entry.user.lastName}`,
        [t('workload.project')]: entry.project.name,
        [t('workload.planHours')]: entry.hours != null ? String(entry.hours) : '',
      }));
    } else {
      rows = [];
      data.forEach((entry: any) => {
        const employee = entry.user ? `${entry.user.firstName} ${entry.user.lastName}` : '';
        if (entry.distributions && entry.distributions.length > 0) {
          entry.distributions.forEach((dist: any) => {
            rows.push({
              [t('workload.date')]: new Date(entry.date).toLocaleDateString(),
              [t('workload.employee')]: employee,
              [t('workload.hours')]: String(dist.hours),
              [t('workload.project')]: dist.project.name,
              [t('workload.description')]: dist.description || '',
            });
          });
        } else {
          rows.push({
            [t('workload.date')]: new Date(entry.date).toLocaleDateString(),
            [t('workload.employee')]: employee,
            [t('workload.hours')]: String(entry.hoursWorked),
            [t('workload.project')]: '',
            [t('workload.description')]: '',
          });
        }
      });
    }

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, type === 'plan' ? 'Planned' : 'Actual');
    XLSX.writeFile(wb, `workload-${type}-${exportDateFrom}-to-${exportDateTo}.xlsx`);
  };

  const generatePDF = async (data: any[], type: 'plan' | 'actual') => {
    let jsPDF: typeof import('jspdf')['jsPDF'];
    try {
      ({ jsPDF } = await import('jspdf'));
    } catch {
      toast.error(t('common.error'));
      return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 20;

    // Title
    doc.setFontSize(18);
    doc.setTextColor(31, 41, 55);
    const title = type === 'plan' ? t('workload.exportTypePlan') : t('workload.exportTypeActual');
    doc.text(title, pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;

    // Period
    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);
    doc.text(`${t('workload.exportPeriod')}: ${exportDateFrom} - ${exportDateTo}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;

    // Table header
    doc.setFontSize(9);
    doc.setTextColor(107, 114, 128);

    if (type === 'plan') {
      doc.text(t('workload.date'), 14, yPos);
      doc.text(t('workload.employee'), 55, yPos);
      doc.text(t('workload.project'), 110, yPos);
      doc.text(t('workload.planHours'), 170, yPos);
      yPos += 2;
      doc.setDrawColor(200, 200, 200);
      doc.line(14, yPos, pageWidth - 14, yPos);
      yPos += 6;

      doc.setFontSize(8);
      doc.setTextColor(55, 65, 81);
      data.forEach((entry: any) => {
        if (yPos > 270) { doc.addPage(); yPos = 20; }
        doc.text(new Date(entry.date).toLocaleDateString(), 14, yPos);
        doc.text(`${entry.user.firstName} ${entry.user.lastName}`, 55, yPos);
        const projName = entry.project.name.length > 35 ? entry.project.name.substring(0, 35) + '...' : entry.project.name;
        doc.text(projName, 110, yPos);
        doc.text(entry.hours != null ? String(entry.hours) : '', 170, yPos);
        yPos += 6;
      });
    } else {
      doc.text(t('workload.date'), 14, yPos);
      doc.text(t('workload.employee'), 45, yPos);
      doc.text(t('workload.hours'), 95, yPos);
      doc.text(t('workload.project'), 115, yPos);
      yPos += 2;
      doc.setDrawColor(200, 200, 200);
      doc.line(14, yPos, pageWidth - 14, yPos);
      yPos += 6;

      doc.setFontSize(8);
      doc.setTextColor(55, 65, 81);
      data.forEach((entry: any) => {
        const employee = entry.user ? `${entry.user.firstName} ${entry.user.lastName}` : '';
        if (entry.distributions && entry.distributions.length > 0) {
          entry.distributions.forEach((dist: any) => {
            if (yPos > 270) { doc.addPage(); yPos = 20; }
            doc.text(new Date(entry.date).toLocaleDateString(), 14, yPos);
            doc.text(employee, 45, yPos);
            doc.text(`${dist.hours} ${t('workload.hours')}`, 95, yPos);
            const projName = dist.project.name.length > 35 ? dist.project.name.substring(0, 35) + '...' : dist.project.name;
            doc.text(projName, 115, yPos);
            yPos += 6;
          });
        } else {
          if (yPos > 270) { doc.addPage(); yPos = 20; }
          doc.text(new Date(entry.date).toLocaleDateString(), 14, yPos);
          doc.text(employee, 45, yPos);
          doc.text(`${entry.hoursWorked} ${t('workload.hours')}`, 95, yPos);
          yPos += 6;
        }
      });
    }

    doc.save(`workload-${type}-${exportDateFrom}-to-${exportDateTo}.pdf`);
  };

  // ---- submit handler -----------------------------------------------------

  const handleExportSubmit = async () => {
    setIsExporting(true);
    try {
      const endpoint = exportType === 'plan' ? '/workload-plan' : '/workload-actual';
      const params: Record<string, string> = {
        startDate: exportDateFrom,
        endDate: exportDateTo,
        limit: '10000',
      };
      if (exportEmployee) params.userId = exportEmployee;

      const res = await api.get(endpoint, { params });
      const data = res.data.data;

      if (!data || data.length === 0) {
        toast.error(t('workload.exportNoData'));
        return;
      }

      if (exportFormat === 'csv') {
        generateCSV(data, exportType);
      } else if (exportFormat === 'xlsx') {
        await generateXLSX(data, exportType);
      } else {
        await generatePDF(data, exportType);
      }

      toast.success(t('workload.exportSuccess'));
      setShowExportModal(false);
    } catch (error) {
      console.error('Export failed:', error);
      toast.error(t('common.error'));
    } finally {
      setIsExporting(false);
    }
  };

  // ---- public surface -----------------------------------------------------
  return {
    showExportModal,
    setShowExportModal,
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
    handleExportSubmit,
  };
}
