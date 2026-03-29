import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import type { OverdueSummary } from '@/shared/hooks/useOverdueBadge';

// ─── Constants ───────────────────────────────────────────────────────────────

const SESSION_KEY = 'overdue-banner-dismissed';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(value: number): string {
  return value.toLocaleString('ru-RU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }) + ' \u0440.';
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface OverdueBannerProps {
  summary: OverdueSummary | undefined;
  isLoading: boolean;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function OverdueBanner({ summary, isLoading }: OverdueBannerProps) {
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(SESSION_KEY) === 'true';
    } catch {
      return false;
    }
  });

  // Sync back when dismissing
  const handleDismiss = useCallback(() => {
    setDismissed(true);
    try {
      sessionStorage.setItem(SESSION_KEY, 'true');
    } catch {
      // sessionStorage unavailable — dismiss still works for this render
    }
  }, []);

  // Reset dismissed state if new overdue data arrives with a different count
  // (e.g. if a payment becomes overdue while the user is on the page)
  const [lastSeenCount, setLastSeenCount] = useState<number | null>(null);
  useEffect(() => {
    if (summary && summary.count > 0) {
      if (lastSeenCount !== null && summary.count !== lastSeenCount) {
        setDismissed(false);
        try {
          sessionStorage.removeItem(SESSION_KEY);
        } catch {
          // no-op
        }
      }
      setLastSeenCount(summary.count);
    }
  }, [summary, lastSeenCount]);

  // Don't render if dismissed, loading, no data, or zero overdue
  if (dismissed || isLoading || !summary || summary.count === 0) {
    return null;
  }

  return (
    <div
      className="
        relative flex flex-col gap-2 p-4
        bg-[rgba(180,130,50,0.12)] border border-[rgba(180,130,50,0.30)]
        rounded-xl
      "
      role="alert"
    >
      {/* Dismiss button */}
      <button
        type="button"
        onClick={handleDismiss}
        className="
          absolute top-3 right-3
          inline-flex items-center justify-center
          w-7 h-7 rounded
          text-[#7a5c1f] hover:text-[#22150d]
          hover:bg-[rgba(180,130,50,0.15)]
          transition-colors duration-150
          cursor-pointer
        "
        aria-label={t('common.close')}
      >
        <svg
          className="w-4 h-4"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
        </svg>
      </button>

      {/* Title line */}
      <div className="flex items-center gap-2 pr-8">
        <svg
          className="w-5 h-5 text-[#8b3a2a] shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
          />
        </svg>
        <p className="text-sm font-semibold text-[#8b3a2a]">
          {t('expenses.overdueBannerTitle', {
            count: summary.count,
            amount: formatCurrency(summary.totalAmount),
          })}
        </p>
      </div>

      {/* Project list */}
      {summary.projects.length > 0 && (
        <ul className="ml-7 space-y-1">
          {summary.projects.map((project) => (
            <li key={project.projectId} className="text-sm text-[#5c4a3e]">
              <Link
                to={`/projects/${project.projectId}#payments`}
                className="
                  underline decoration-[rgba(92,74,62,0.3)]
                  hover:decoration-[rgba(92,74,62,0.8)]
                  hover:text-[#22150d]
                  transition-colors duration-150
                "
              >
                {project.projectName}
              </Link>
              <span className="text-[#7d6b5d] ml-1">
                — {t('expenses.overdueProjectDetail', {
                  count: project.overdueCount,
                  amount: formatCurrency(project.overdueAmount),
                })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
