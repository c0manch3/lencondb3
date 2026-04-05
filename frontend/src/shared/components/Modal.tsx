import {
  type FC,
  type ReactNode,
  useEffect,
  useRef,
  useCallback,
  useId,
} from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  actions?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses: Record<NonNullable<ModalProps['size']>, string> = {
  sm: 'max-w-[400px]',
  md: 'max-w-[500px]',
  lg: 'max-w-[700px]',
};

const Modal: FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  actions,
  size = 'md',
}) => {
  const titleId = useId();
  const overlayRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<Element | null>(null);

  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose],
  );

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === overlayRef.current) {
        onClose();
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement;
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
      if (previousActiveElement.current instanceof HTMLElement) {
        previousActiveElement.current.focus();
      }
    };
  }, [isOpen, handleEscape]);

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      data-lenis-prevent
      className="fixed inset-0 z-50 flex items-center justify-center bg-brown-900/50 backdrop-blur-sm p-4"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div
        className={`
          w-full ${sizeClasses[size]}
          bg-cream-50 rounded-xl border border-brown-200
          max-h-[90vh]
          flex flex-col
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-brown-200">
          <h2
            id={titleId}
            className="text-lg font-semibold text-brown-900"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="
              inline-flex items-center justify-center
              w-8 h-8 rounded
              text-brown-400 hover:text-brown-900
              hover:bg-cream-200
              transition-colors duration-150
              cursor-pointer
            "
            aria-label="Close modal"
          >
            <svg
              className="w-5 h-5"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 flex-1 min-h-0 overflow-y-auto">
          {children}
        </div>

        {/* Actions */}
        {actions && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-brown-200">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
