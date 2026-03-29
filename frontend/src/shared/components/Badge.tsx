import type { FC, ReactNode } from 'react';

type BadgeVariant =
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral'
  | 'admin'
  | 'manager'
  | 'employee'
  | 'trial'
  | 'customer'
  | 'contractor';

interface BadgeProps {
  variant: BadgeVariant;
  children: ReactNode;
  className?: string;
}

/**
 * Badge color map derived from TABLE_DESIGN.md
 * All combinations verified to meet WCAG AA 4.5:1 contrast ratio.
 */
const variantClasses: Record<BadgeVariant, string> = {
  // Status badges
  success:    'bg-[rgba(75,108,56,0.12)] text-[#3d5a2a] border border-[rgba(75,108,56,0.25)]',
  warning:    'bg-[rgba(180,130,50,0.12)] text-[#7a5c1f] border border-[rgba(180,130,50,0.25)]',
  danger:     'bg-[rgba(156,60,40,0.12)] text-[#8b3a2a] border border-[rgba(156,60,40,0.25)]',
  info:       'bg-[rgba(80,120,110,0.12)] text-[#3a5f56] border border-[rgba(80,120,110,0.25)]',
  neutral:    'bg-[rgba(34,21,13,0.06)] text-[#7d6b5d] border border-[rgba(34,21,13,0.15)]',

  // Role badges
  admin:      'bg-[rgba(92,74,62,0.15)] text-[#3e2c1e] border border-[rgba(92,74,62,0.30)]',
  manager:    'bg-[rgba(180,145,50,0.12)] text-[#6b5520] border border-[rgba(180,145,50,0.25)]',
  employee:   'bg-[rgba(80,120,110,0.12)] text-[#3a5f56] border border-[rgba(80,120,110,0.25)]',
  trial:      'bg-[rgba(34,21,13,0.06)] text-[#7d6b5d] border border-[rgba(34,21,13,0.12)]',

  // Company type badges
  customer:   'bg-[rgba(75,108,56,0.12)] text-[#3d5a2a] border border-[rgba(75,108,56,0.25)]',
  contractor: 'bg-[rgba(140,110,70,0.12)] text-[#5c4a3e] border border-[rgba(140,110,70,0.25)]',
};

const Badge: FC<BadgeProps> = ({ variant, children, className = '' }) => {
  return (
    <span
      className={`
        inline-flex items-center
        px-2.5 py-0.5
        rounded-full
        text-xs font-medium
        whitespace-nowrap
        ${variantClasses[variant]}
        ${className}
      `}
    >
      {children}
    </span>
  );
};

export default Badge;
