import { type ReactNode, useCallback } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { useState } from 'react';
import Pagination from './Pagination';

// ─── Pagination config type (maps to shared Pagination props) ───────────────

interface PaginationConfig {
  page: number;
  limit: number;
  total: number;
  onPageChange: (page: number) => void;
}

// ─── Skeleton loading ───────────────────────────────────────────────────────

const SKELETON_WIDTHS = ['80%', '65%', '90%', '55%', '75%'] as const;

function SkeletonRows({ columns }: { columns: number }) {
  return (
    <>
      {SKELETON_WIDTHS.map((w, rowIdx) => (
        <tr
          key={rowIdx}
          className="border-b border-[rgba(34,21,13,0.10)] last:border-b-0"
        >
          {Array.from({ length: columns }, (_, colIdx) => (
            <td key={colIdx} className="px-4 py-2">
              <div
                className="h-4 rounded bg-[rgba(34,21,13,0.06)] animate-pulse"
                style={{ width: colIdx === 0 ? w : '60%' }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// ─── Empty state ────────────────────────────────────────────────────────────

interface EmptyStateConfig {
  title: string;
  description?: string;
}

function EmptyState({ title, description }: EmptyStateConfig) {
  return (
    <tr>
      <td colSpan={999}>
        <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
          {/* Generic document icon */}
          <svg
            className="w-12 h-12 text-[#7d6b5d] opacity-50 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
            />
          </svg>
          <p className="text-lg font-medium text-[#22150d]">{title}</p>
          {description && (
            <p className="mt-1 text-sm text-[#7d6b5d] max-w-xs">{description}</p>
          )}
        </div>
      </td>
    </tr>
  );
}

// ─── Sort indicator icons ───────────────────────────────────────────────────

function SortIndicator({ direction }: { direction: false | 'asc' | 'desc' }) {
  if (direction === 'asc') {
    return (
      <span className="inline-flex ml-1.5 text-[#22150d]" aria-hidden="true">
        <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 10 10">
          <path d="M5 2L9 7H1L5 2Z" />
        </svg>
      </span>
    );
  }

  if (direction === 'desc') {
    return (
      <span className="inline-flex ml-1.5 text-[#22150d]" aria-hidden="true">
        <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 10 10">
          <path d="M5 8L1 3H9L5 8Z" />
        </svg>
      </span>
    );
  }

  // Unsorted (but sortable) — faint double chevron
  return (
    <span className="inline-flex flex-col items-center ml-1.5 opacity-30 group-hover:opacity-60 transition-opacity" aria-hidden="true">
      <svg className="w-2.5 h-2" fill="currentColor" viewBox="0 0 10 6">
        <path d="M5 0L9 5H1L5 0Z" />
      </svg>
      <svg className="w-2.5 h-2 -mt-0.5" fill="currentColor" viewBox="0 0 10 6">
        <path d="M5 6L1 1H9L5 6Z" />
      </svg>
    </span>
  );
}

// ─── Main Table component ───────────────────────────────────────────────────

interface TableProps<T> {
  data: T[];
  columns: ColumnDef<T, unknown>[];
  isLoading?: boolean;
  emptyState?: EmptyStateConfig;
  /** Enable client-side sorting via TanStack Table. */
  sorting?: boolean;
  /** Server-side pagination config. If omitted, no pagination is rendered. */
  pagination?: PaginationConfig;
  /** Called when a row body is clicked. */
  onRowClick?: (row: T) => void;
  /** Render a mobile card for each row (shown at <=767px). */
  renderMobileCard?: (row: T) => ReactNode;
}

export default function Table<T>({
  data,
  columns,
  isLoading = false,
  emptyState: emptyConfig,
  sorting: enableSorting = false,
  pagination: paginationConfig,
  onRowClick,
  renderMobileCard,
}: TableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: enableSorting ? setSorting : undefined,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: enableSorting ? getSortedRowModel() : undefined,
    enableSorting,
  });

  const handleRowClick = useCallback(
    (row: T) => {
      onRowClick?.(row);
    },
    [onRowClick],
  );

  const headerGroups = table.getHeaderGroups();
  const rows = table.getRowModel().rows;
  const isEmpty = !isLoading && rows.length === 0;

  return (
    <div className="bg-[#fdfaf0] border border-[rgba(34,21,13,0.15)] rounded-xl overflow-hidden">
      {/* ─── Desktop table (>=768px) ─────────────────────────────────── */}
      <div className="hidden md:block overflow-x-auto" role="region" aria-label="Data table" tabIndex={0}>
        <table className="w-full" aria-busy={isLoading}>
          <thead>
            {headerGroups.map((hg) => (
              <tr key={hg.id} className="bg-[#f5ecd4]">
                {hg.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const sorted = header.column.getIsSorted();
                  const ariaSort = sorted === 'asc'
                    ? 'ascending'
                    : sorted === 'desc'
                      ? 'descending'
                      : canSort
                        ? 'none'
                        : undefined;

                  return (
                    <th
                      key={header.id}
                      className={`
                        px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider
                        whitespace-nowrap align-middle
                        border-b border-[rgba(34,21,13,0.20)]
                        ${sorted ? 'text-[#22150d] font-bold' : 'text-[#5c4a3e]'}
                        ${canSort ? 'cursor-pointer select-none group' : ''}
                      `}
                      onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                      aria-sort={ariaSort}
                      tabIndex={canSort ? 0 : undefined}
                      onKeyDown={
                        canSort
                          ? (e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                header.column.getToggleSortingHandler()?.(e);
                              }
                            }
                          : undefined
                      }
                      style={
                        header.column.columnDef.size
                          ? { width: header.column.columnDef.size }
                          : undefined
                      }
                    >
                      <span className="inline-flex items-center">
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                        {canSort && <SortIndicator direction={sorted} />}
                      </span>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>

          <tbody>
            {isLoading ? (
              <SkeletonRows columns={columns.length} />
            ) : isEmpty ? (
              <EmptyState
                title={emptyConfig?.title ?? 'No data'}
                description={emptyConfig?.description}
              />
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  className={`
                    border-b border-[rgba(34,21,13,0.10)] last:border-b-0
                    hover:bg-[rgba(34,21,13,0.04)] transition-colors duration-150
                    ${onRowClick ? 'cursor-pointer' : ''}
                  `}
                  onClick={() => handleRowClick(row.original)}
                  tabIndex={onRowClick ? 0 : undefined}
                  onKeyDown={
                    onRowClick
                      ? (e) => {
                          if (e.key === 'Enter') handleRowClick(row.original);
                        }
                      : undefined
                  }
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="px-4 py-2 text-sm text-[#22150d] align-middle"
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ─── Mobile card layout (<=767px) ────────────────────────────── */}
      <div className="md:hidden" aria-busy={isLoading}>
        {isLoading ? (
          <div className="p-4 space-y-3">
            {SKELETON_WIDTHS.map((w, i) => (
              <div
                key={i}
                className="bg-[#fdfaf0] border border-[rgba(34,21,13,0.15)] rounded-xl p-4"
              >
                <div
                  className="h-4 rounded bg-[rgba(34,21,13,0.06)] animate-pulse mb-2"
                  style={{ width: w }}
                />
                <div className="h-3 rounded bg-[rgba(34,21,13,0.06)] animate-pulse w-1/2" />
              </div>
            ))}
          </div>
        ) : isEmpty ? (
          <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
            <p className="text-lg font-medium text-[#22150d]">
              {emptyConfig?.title ?? 'No data'}
            </p>
            {emptyConfig?.description && (
              <p className="mt-1 text-sm text-[#7d6b5d]">
                {emptyConfig.description}
              </p>
            )}
          </div>
        ) : renderMobileCard ? (
          <div className="p-3 space-y-2">
            {rows.map((row) => (
              <div
                key={row.id}
                className={onRowClick ? 'cursor-pointer' : ''}
                onClick={() => handleRowClick(row.original)}
                role={onRowClick ? 'button' : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                onKeyDown={
                  onRowClick
                    ? (e) => {
                        if (e.key === 'Enter') handleRowClick(row.original);
                      }
                    : undefined
                }
              >
                {renderMobileCard(row.original)}
              </div>
            ))}
          </div>
        ) : (
          /* Fallback: render the table on mobile if no card renderer */
          <div className="overflow-x-auto">
            <table className="w-full" aria-busy={false}>
              <thead>
                {headerGroups.map((hg) => (
                  <tr key={hg.id} className="bg-[#f5ecd4]">
                    {hg.headers.map((header) => (
                      <th
                        key={header.id}
                        className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-[#5c4a3e] whitespace-nowrap border-b border-[rgba(34,21,13,0.20)]"
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-[rgba(34,21,13,0.10)] last:border-b-0"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-3 py-2 text-sm text-[#22150d]">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── Pagination ──────────────────────────────────────────────── */}
      {paginationConfig && !isEmpty && (
        <Pagination
          currentPage={paginationConfig.page}
          totalItems={paginationConfig.total}
          pageSize={paginationConfig.limit}
          onPageChange={paginationConfig.onPageChange}
        />
      )}
    </div>
  );
}
