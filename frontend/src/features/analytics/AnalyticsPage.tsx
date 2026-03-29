import { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, DatePicker, Spinner } from '@/shared/components';
import { useProjectsWorkload, useEmployeeWorkHours, type DateRangeParams } from './hooks/useAnalytics';
import ProjectsWorkloadTab from './components/ProjectsWorkloadTab';
import EmployeeHoursTab from './components/EmployeeHoursTab';
import FinanceTab from './components/FinanceTab';

// ─── Tab type ───────────────────────────────────────────────────────────────

type TabKey = 'projects' | 'employees' | 'finance';

interface TabItem {
  key: TabKey;
  labelKey: string;
}

const TABS: TabItem[] = [
  { key: 'projects', labelKey: 'analytics.projectWorkload' },
  { key: 'employees', labelKey: 'analytics.employeeHours' },
  { key: 'finance', labelKey: 'finance.tabTitle' },
];

// ─── Session storage helpers ────────────────────────────────────────────────

const DATES_KEY = 'analytics-main-dates';

function getStoredDates(): DateRangeParams {
  try {
    const stored = sessionStorage.getItem(DATES_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as DateRangeParams;
      if (parsed.startDate && parsed.endDate) return parsed;
    }
  } catch {
    // ignore
  }

  const end = new Date();
  const start = new Date();
  start.setMonth(start.getMonth() - 1);

  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
  };
}

// ─── PDF export icon ────────────────────────────────────────────────────────

function DownloadIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z" />
      <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
    </svg>
  );
}

// ─── Summary card ───────────────────────────────────────────────────────────

function SummaryCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-cream-50 border border-brown-200 rounded-xl p-4">
      <p className="text-xs font-medium text-brown-500 uppercase tracking-wider">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold text-brown-900">{value}</p>
    </div>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const { t } = useTranslation();

  // Date range state
  const [dateRange, setDateRange] = useState<DateRangeParams>(getStoredDates);
  const [startInput, setStartInput] = useState(dateRange.startDate);
  const [endInput, setEndInput] = useState(dateRange.endDate);

  // Active tab
  const [activeTab, setActiveTab] = useState<TabKey>('projects');

  // PDF export state
  const [exporting, setExporting] = useState(false);

  // Fetch data for summary cards (projects + employees tabs share this date range)
  const { data: projectsData } = useProjectsWorkload(dateRange);
  const { data: employeesData } = useEmployeeWorkHours(dateRange);

  const handleApply = useCallback(() => {
    const next: DateRangeParams = { startDate: startInput, endDate: endInput };
    setDateRange(next);
    try {
      sessionStorage.setItem(DATES_KEY, JSON.stringify(next));
    } catch {
      // sessionStorage may be unavailable
    }
  }, [startInput, endInput]);

  // ─── PDF export ────────────────────────────────────────────────────
  const handleExportPdf = useCallback(async () => {
    if (exporting) return;
    setExporting(true);

    try {
      const { default: jsPDF } = await import('jspdf');
      const doc = new jsPDF();

      const pageWidth = doc.internal.pageSize.getWidth();
      let y = 20;

      // Title
      doc.setFontSize(16);
      doc.text('Analytics Report', pageWidth / 2, y, { align: 'center' });
      y += 10;

      // Period
      doc.setFontSize(10);
      doc.text(
        `Period: ${dateRange.startDate} - ${dateRange.endDate}`,
        pageWidth / 2,
        y,
        { align: 'center' },
      );
      y += 15;

      // Summary
      doc.setFontSize(12);
      doc.text('Summary', 14, y);
      y += 8;
      doc.setFontSize(10);
      doc.text(`Total Projects: ${projectsData?.totalProjects ?? 0}`, 14, y);
      y += 6;
      doc.text(`Active Projects: ${projectsData?.activeProjects ?? 0}`, 14, y);
      y += 6;
      doc.text(`Total Employees: ${employeesData?.totalEmployees ?? 0}`, 14, y);
      y += 12;

      // Projects table (top 15)
      const projects = projectsData?.projects ?? [];
      if (projects.length > 0) {
        doc.setFontSize(12);
        doc.text('Projects Workload (Top 15)', 14, y);
        y += 8;

        doc.setFontSize(8);
        const headers = ['Project', 'Customer', 'Status', 'Employees', 'Hours'];
        const colWidths = [55, 40, 25, 25, 25];
        let x = 14;

        // Header row
        headers.forEach((h, i) => {
          doc.text(h, x, y);
          x += colWidths[i];
        });
        y += 5;

        // Data rows
        const topProjects = projects.slice(0, 15);
        for (const p of topProjects) {
          if (y > 270) {
            doc.addPage();
            y = 20;
          }
          x = 14;
          doc.text(p.projectName.substring(0, 30), x, y);
          x += colWidths[0];
          doc.text(p.customerName.substring(0, 22), x, y);
          x += colWidths[1];
          doc.text(p.status, x, y);
          x += colWidths[2];
          doc.text(String(p.employeeCount), x, y);
          x += colWidths[3];
          doc.text(String(p.totalHours), x, y);
          y += 5;
        }
        y += 8;
      }

      // Employees table
      const employees = employeesData?.employees ?? [];
      if (employees.length > 0) {
        if (y > 230) {
          doc.addPage();
          y = 20;
        }
        doc.setFontSize(12);
        doc.text('Employee Hours', 14, y);
        y += 8;

        doc.setFontSize(8);
        const empHeaders = ['Employee', 'Hours Worked', 'Expected', 'Deviation'];
        const empWidths = [60, 30, 30, 30];
        let x = 14;

        empHeaders.forEach((h, i) => {
          doc.text(h, x, y);
          x += empWidths[i];
        });
        y += 5;

        for (const e of employees) {
          if (y > 270) {
            doc.addPage();
            y = 20;
          }
          x = 14;
          doc.text(`${e.firstName} ${e.lastName}`.substring(0, 32), x, y);
          x += empWidths[0];
          doc.text(String(e.hoursWorked), x, y);
          x += empWidths[1];
          doc.text(String(e.expectedHours), x, y);
          x += empWidths[2];
          const sign = e.deviation > 0 ? '+' : '';
          doc.text(`${sign}${e.deviation}`, x, y);
          y += 5;
        }
      }

      const filename = `analytics-report-${dateRange.startDate}-to-${dateRange.endDate}.pdf`;
      doc.save(filename);
    } catch {
      // PDF generation failed silently — toast would be shown in production
    } finally {
      setExporting(false);
    }
  }, [exporting, dateRange, projectsData, employeesData]);

  // ─── Tab content ───────────────────────────────────────────────────
  const tabContent = useMemo(() => {
    switch (activeTab) {
      case 'projects':
        return <ProjectsWorkloadTab dateRange={dateRange} />;
      case 'employees':
        return <EmployeeHoursTab dateRange={dateRange} />;
      case 'finance':
        return <FinanceTab />;
      default:
        return null;
    }
  }, [activeTab, dateRange]);

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-brown-900">{t('analytics.title')}</h1>
        <Button
          variant="secondary"
          icon={<DownloadIcon />}
          onClick={handleExportPdf}
          loading={exporting}
        >
          {t('analytics.exportPdf')}
        </Button>
      </div>

      {/* Date range controls (for projects & employees tabs) */}
      {activeTab !== 'finance' && (
        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3">
          <DatePicker
            label={t('analytics.startDate')}
            value={startInput}
            onChange={(e) => setStartInput(e.target.value)}
          />
          <DatePicker
            label={t('analytics.endDate')}
            value={endInput}
            onChange={(e) => setEndInput(e.target.value)}
          />
          <Button onClick={handleApply} size="md">
            {t('common.apply')}
          </Button>
        </div>
      )}

      {/* Global summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <SummaryCard
          label={t('analytics.totalProjects')}
          value={projectsData?.totalProjects ?? '-'}
        />
        <SummaryCard
          label={t('analytics.activeProjects')}
          value={projectsData?.activeProjects ?? '-'}
        />
        <SummaryCard
          label={t('analytics.totalEmployees')}
          value={employeesData?.totalEmployees ?? '-'}
        />
      </div>

      {/* Tab navigation */}
      <div
        className="flex border-b border-brown-200 overflow-x-auto"
        role="tablist"
        aria-label="Analytics tabs"
      >
        {TABS.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={activeTab === tab.key}
            aria-controls={`tabpanel-${tab.key}`}
            id={`tab-${tab.key}`}
            className={`
              px-4 py-2.5 text-sm font-medium whitespace-nowrap
              transition-colors duration-200
              cursor-pointer
              border-b-2
              ${
                activeTab === tab.key
                  ? 'border-brown-900 text-brown-900'
                  : 'border-transparent text-brown-500 hover:text-brown-700 hover:border-brown-300'
              }
            `}
            onClick={() => setActiveTab(tab.key)}
          >
            {t(tab.labelKey)}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div
        id={`tabpanel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`tab-${activeTab}`}
      >
        {tabContent}
      </div>
    </div>
  );
}
