import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** Optional custom fallback UI. If omitted, the default error card is shown. */
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Catches uncaught rendering errors anywhere in its subtree and displays
 * a user-friendly fallback with a retry button.
 */
export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  private handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    if (this.props.fallback) {
      return this.props.fallback;
    }

    return (
      <div
        className="flex items-center justify-center min-h-screen px-4"
        style={{ backgroundColor: '#f9f0d9' }}
      >
        <div
          className="max-w-md w-full rounded-xl p-8 text-center"
          style={{
            backgroundColor: '#f9f0d9',
            color: '#22150d',
            border: '1px solid rgba(34, 21, 13, 0.15)',
          }}
        >
          <h1 className="text-2xl font-bold mb-2" style={{ color: '#22150d' }}>
            Something went wrong
          </h1>

          <p className="mb-6 text-sm" style={{ color: 'rgba(34, 21, 13, 0.7)' }}>
            An unexpected error occurred. Please try again.
          </p>

          {this.state.error && (
            <pre
              className="mb-6 text-left text-xs overflow-x-auto p-3 rounded"
              style={{
                backgroundColor: 'rgba(34, 21, 13, 0.05)',
                color: '#22150d',
                borderRadius: '0.4rem',
                maxHeight: '8rem',
              }}
            >
              {this.state.error.message}
            </pre>
          )}

          <button
            type="button"
            onClick={this.handleRetry}
            className="inline-flex items-center justify-center px-6 py-2 font-medium cursor-pointer"
            style={{
              backgroundColor: '#22150d',
              color: '#f9f0d9',
              borderRadius: '0.4rem',
              border: 'none',
              transition: 'background-color 0.3s ease',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#000';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#22150d';
            }}
          >
            Try again
          </button>
        </div>
      </div>
    );
  }
}
