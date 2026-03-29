import type { FC } from 'react';

interface SkeletonProps {
  /** Number of skeleton rows to render */
  rows?: number;
  /** Height of each row */
  height?: string;
  className?: string;
}

/**
 * Varying widths for skeleton rows to look natural,
 * as specified in TABLE_DESIGN.md (80%, 65%, 90%, 55%, 75%).
 */
const defaultWidths = ['80%', '65%', '90%', '55%', '75%'];

const Skeleton: FC<SkeletonProps> = ({
  rows = 5,
  height = 'h-4',
  className = '',
}) => {
  return (
    <div className={`flex flex-col gap-3 ${className}`} role="status" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className={`${height} rounded bg-[rgba(34,21,13,0.06)] animate-pulse`}
          style={{ width: defaultWidths[i % defaultWidths.length] }}
        />
      ))}
      <span className="sr-only">Loading...</span>
    </div>
  );
};

export default Skeleton;
