import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary component for catching and handling errors in React components.
 * 
 * Usage:
 * ```jsx
 * <ErrorBoundary>
 *   <YourComponent />
 * </ErrorBoundary>
 * ```
 * 
 * With custom fallback:
 * ```jsx
 * <ErrorBoundary fallback={<div>Something went wrong</div>}>
 *   <YourComponent />
 * </ErrorBoundary>
 * ```
 */
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log the error to the console
    console.error('Error caught by ErrorBoundary:', error);
    console.error('Component stack:', errorInfo.componentStack);
    
    // You can also log the error to an error reporting service
    // reportErrorToService(error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      return (
        <div className="error-boundary">
          <div className="error-container p-4 bg-error-100 border border-error-500 rounded-lg">
            <h2 className="text-lg font-semibold text-error-700 mb-2">Something went wrong</h2>
            <p className="text-sm text-error-700">
              An error occurred while rendering this component.
            </p>
            {process.env.NODE_ENV !== 'production' && this.state.error && (
              <details className="mt-2">
                <summary className="text-sm cursor-pointer">Error details</summary>
                <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
            <button
              onClick={() => window.location.reload()}
              className="mt-3 btn btn-secondary btn-sm"
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 