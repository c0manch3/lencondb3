import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import {
  fetchPlansForExport,
  fetchActualsForExport,
} from './useWorkloadData';
import type { ExportFormData } from '../types';
import type { WorkloadPlan, WorkloadActual } from '@/shared/types';

// ─── Filename helper ────────────────────────────────────────────────────────

function buildFilename(type: string, dateFrom: string, dateTo: string, ext: string): string {
  return `workload-${type}-${dateFrom}-to-${dateTo}.${ext}`;
}

// ─── BOM for CSV Excel compatibility ────────────────────────────────────────

const BOM = '\uFEFF';

/** Escape a CSV field to prevent CSV injection (=, +, -, @, |, %) */
function escapeCsvField(value: string): string {
  const dangerous = /^[=+\-@|%]/;
  let escaped = value.replace(/"/g, '""');
  if (dangerous.test(escaped)) {
    escaped = `'${escaped}`;
  }
  return `"${escaped}"`;
}

// ─── CSV generation ─────────────────────────────────────────────────────────

function generatePlanCsv(plans: WorkloadPlan[]): string {
  const headers = ['Date', 'Employee', 'Project', 'Hours', 'Manager'];
  const rows = plans.map((p) => [
    p.date.slice(0, 10),
    p.user ? `${p.user.firstName} ${p.user.lastName}` : '',
    p.project?.name ?? '',
    p.hours != null ? String(p.hours) : '',
    p.manager ? `${p.manager.firstName} ${p.manager.lastName}` : '',
  ]);

  const lines = [
    headers.map(escapeCsvField).join('\t'),
    ...rows.map((row) => row.map(escapeCsvField).join('\t')),
  ];

  return BOM + lines.join('\r\n');
}

function generateActualCsv(actuals: WorkloadActual[]): string {
  const headers = ['Date', 'Employee', 'Hours Worked', 'Notes', 'Project', 'Project Hours', 'Description'];
  const rows: string[][] = [];

  for (const actual of actuals) {
    const userName = actual.user
      ? `${actual.user.firstName} ${actual.user.lastName}`
      : '';

    if (actual.distributions && actual.distributions.length > 0) {
      for (const dist of actual.distributions) {
        rows.push([
          actual.date.slice(0, 10),
          userName,
          String(actual.hoursWorked),
          actual.userText ?? '',
          dist.project?.name ?? '',
          String(dist.hours),
          dist.description ?? '',
        ]);
      }
    } else {
      rows.push([
        actual.date.slice(0, 10),
        userName,
        String(actual.hoursWorked),
        actual.userText ?? '',
        '',
        '',
        '',
      ]);
    }
  }

  const lines = [
    headers.map(escapeCsvField).join('\t'),
    ...rows.map((row) => row.map(escapeCsvField).join('\t')),
  ];

  return BOM + lines.join('\r\n');
}

// ─── Download helper ────────────────────────────────────────────────────────

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Hook ───────────────────────────────────────────────────────────────────

interface UseWorkloadExportResult {
  isExporting: boolean;
  exportWorkload: (formData: ExportFormData) => Promise<void>;
}

export function useWorkloadExport(): UseWorkloadExportResult {
  const { t } = useTranslation();
  const [isExporting, setIsExporting] = useState(false);

  const exportWorkload = useCallback(
    async (formData: ExportFormData) => {
      setIsExporting(true);

      try {
        const params = {
          startDate: formData.dateFrom,
          endDate: formData.dateTo,
          userId: formData.userId || undefined,
        };

        if (formData.type === 'plan') {
          const plans = await fetchPlansForExport(params);
          if (plans.length === 0) {
            toast.error(t('workload.exportNoData'));
            return;
          }
          await exportPlanData(plans, formData);
        } else {
          const actuals = await fetchActualsForExport(params);
          if (actuals.length === 0) {
            toast.error(t('workload.exportNoData'));
            return;
          }
          await exportActualData(actuals, formData);
        }

        toast.success(t('workload.exportSuccess'));
      } catch {
        toast.error(t('workload.loadError'));
      } finally {
        setIsExporting(false);
      }
    },
    [t],
  );

  return { isExporting, exportWorkload };
}

// ─── Format dispatchers ─────────────────────────────────────────────────────

async function exportPlanData(plans: WorkloadPlan[], form: ExportFormData): Promise<void> {
  const filename = buildFilename('plan', form.dateFrom, form.dateTo, form.format);

  switch (form.format) {
    case 'csv': {
      const csv = generatePlanCsv(plans);
      downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), filename);
      break;
    }
    case 'xlsx': {
      const XLSX = await import('xlsx');
      const wsData = [
        ['Date', 'Employee', 'Project', 'Hours', 'Manager'],
        ...plans.map((p) => [
          p.date.slice(0, 10),
          p.user ? `${p.user.firstName} ${p.user.lastName}` : '',
          p.project?.name ?? '',
          p.hours ?? '',
          p.manager ? `${p.manager.firstName} ${p.manager.lastName}` : '',
        ]),
      ];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Planned Workload');
      XLSX.writeFile(wb, filename);
      break;
    }
    case 'pdf': {
      const { default: jsPDF } = await import('jspdf');
      const doc = new jsPDF({ orientation: 'landscape' });

      doc.setFontSize(16);
      doc.text('Planned Workload Report', 14, 20);
      doc.setFontSize(10);
      doc.text(`Period: ${form.dateFrom} to ${form.dateTo}`, 14, 28);
      doc.text(`Total entries: ${plans.length}`, 14, 34);

      let y = 44;
      const colX = [14, 44, 100, 170, 200];
      const headers = ['Date', 'Employee', 'Project', 'Hours', 'Manager'];

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      for (let i = 0; i < headers.length; i++) {
        doc.text(headers[i], colX[i], y);
      }
      doc.setFont('helvetica', 'normal');
      y += 6;

      // Limit to prevent PDF from being too large
      const maxRows = Math.min(plans.length, 200);
      for (let r = 0; r < maxRows; r++) {
        if (y > 190) {
          doc.addPage();
          y = 20;
        }
        const p = plans[r];
        const row = [
          p.date.slice(0, 10),
          p.user ? `${p.user.firstName} ${p.user.lastName}` : '',
          (p.project?.name ?? '').slice(0, 30),
          p.hours != null ? String(p.hours) : '-',
          p.manager ? `${p.manager.firstName} ${p.manager.lastName}` : '',
        ];
        for (let i = 0; i < row.length; i++) {
          doc.text(row[i], colX[i], y);
        }
        y += 5;
      }

      doc.save(filename);
      break;
    }
  }
}

async function exportActualData(actuals: WorkloadActual[], form: ExportFormData): Promise<void> {
  const filename = buildFilename('actual', form.dateFrom, form.dateTo, form.format);

  switch (form.format) {
    case 'csv': {
      const csv = generateActualCsv(actuals);
      downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), filename);
      break;
    }
    case 'xlsx': {
      const XLSX = await import('xlsx');
      const wsData: (string | number)[][] = [
        ['Date', 'Employee', 'Hours Worked', 'Notes', 'Project', 'Project Hours', 'Description'],
      ];

      for (const actual of actuals) {
        const userName = actual.user
          ? `${actual.user.firstName} ${actual.user.lastName}`
          : '';

        if (actual.distributions && actual.distributions.length > 0) {
          for (const dist of actual.distributions) {
            wsData.push([
              actual.date.slice(0, 10),
              userName,
              actual.hoursWorked,
              actual.userText ?? '',
              dist.project?.name ?? '',
              dist.hours,
              dist.description ?? '',
            ]);
          }
        } else {
          wsData.push([
            actual.date.slice(0, 10),
            userName,
            actual.hoursWorked,
            actual.userText ?? '',
            '',
            '',
            '',
          ]);
        }
      }

      const ws = XLSX.utils.aoa_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Actual Workload');
      XLSX.writeFile(wb, filename);
      break;
    }
    case 'pdf': {
      const { default: jsPDF } = await import('jspdf');
      const doc = new jsPDF({ orientation: 'landscape' });

      doc.setFontSize(16);
      doc.text('Actual Workload Report', 14, 20);
      doc.setFontSize(10);
      doc.text(`Period: ${form.dateFrom} to ${form.dateTo}`, 14, 28);
      doc.text(`Total entries: ${actuals.length}`, 14, 34);

      let y = 44;
      const colX = [14, 44, 100, 130, 170, 220];
      const headers = ['Date', 'Employee', 'Hours', 'Notes', 'Project', 'Proj. Hours'];

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      for (let i = 0; i < headers.length; i++) {
        doc.text(headers[i], colX[i], y);
      }
      doc.setFont('helvetica', 'normal');
      y += 6;

      const maxRows = Math.min(actuals.length, 200);
      for (let r = 0; r < maxRows; r++) {
        const actual = actuals[r];
        if (y > 190) {
          doc.addPage();
          y = 20;
        }

        const userName = actual.user
          ? `${actual.user.firstName} ${actual.user.lastName}`
          : '';

        if (actual.distributions && actual.distributions.length > 0) {
          for (const dist of actual.distributions) {
            if (y > 190) {
              doc.addPage();
              y = 20;
            }
            doc.text(actual.date.slice(0, 10), colX[0], y);
            doc.text(userName, colX[1], y);
            doc.text(String(actual.hoursWorked), colX[2], y);
            doc.text((actual.userText ?? '').slice(0, 20), colX[3], y);
            doc.text((dist.project?.name ?? '').slice(0, 25), colX[4], y);
            doc.text(String(dist.hours), colX[5], y);
            y += 5;
          }
        } else {
          doc.text(actual.date.slice(0, 10), colX[0], y);
          doc.text(userName, colX[1], y);
          doc.text(String(actual.hoursWorked), colX[2], y);
          doc.text((actual.userText ?? '').slice(0, 20), colX[3], y);
          y += 5;
        }
      }

      doc.save(filename);
      break;
    }
  }
}
