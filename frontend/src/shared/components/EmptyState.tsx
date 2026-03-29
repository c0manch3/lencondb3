import type { FC, ReactNode } from 'react';
import Button from './Button';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  className?: string;
}

const EmptyState: FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center py-16 px-8 text-center ${className}`}
    >
      {icon && (
        <div className="mb-4 text-[#7d6b5d] opacity-50">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-medium text-brown-900 mb-1">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-[#7d6b5d] max-w-xs mb-6">
          {description}
        </p>
      )}
      {action && (
        <Button
          variant="primary"
          size="sm"
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
