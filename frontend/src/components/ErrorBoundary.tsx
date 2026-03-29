import { Component, ErrorInfo, ReactNode } from 'react';
import { Translation } from 'react-i18next';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Translation>
          {(t) => (
            <div className="min-h-dvh flex items-center justify-center bg-cream-50">
              <div className="max-w-md w-full bg-cream-50 rounded-[0.4rem] shadow-lg border border-brown-200 p-8 text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-red-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-brown-900 mb-2">
                  {t('errors.somethingWentWrong')}
                </h2>
                <p className="text-brown-600 mb-6">
                  {t('errors.somethingWentWrongMessage')}
                </p>
                <div className="space-y-3">
                  <button
                    onClick={this.handleRetry}
                    className="w-full px-4 py-2 bg-brown-900 text-cream-50 rounded-[0.4rem] hover:bg-brown-800 transition-colors duration-200"
                  >
                    {t('errors.tryAgain')}
                  </button>
                  <button
                    onClick={() => window.location.href = '/'}
                    className="w-full px-4 py-2 bg-brown-100 text-brown-700 rounded-[0.4rem] hover:bg-brown-200 transition-colors duration-200"
                  >
                    {t('errors.goHome')}
                  </button>
                </div>
                {import.meta.env.DEV && this.state.error && (
                  <details className="mt-6 text-left">
                    <summary className="cursor-pointer text-sm text-brown-500 hover:text-brown-700">
                      {t('errors.technicalDetails')}
                    </summary>
                    <pre className="mt-2 p-3 bg-brown-900 text-cream-100 rounded-[0.4rem] text-xs overflow-auto max-h-40">
                      {this.state.error.toString()}
                      {'\n'}
                      {this.state.error.stack}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          )}
        </Translation>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
