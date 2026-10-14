import React, { Component } from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, message: '' };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { hasError: true, message: error instanceof Error ? error.message : String(error) };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, info.componentStack);
  }

  handleReload = (): void => {
    window.location.reload();
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full flex items-center justify-center onyx-glass-panel">
          <div className="max-w-md p-8 text-center rounded-lg bg-[var(--onyx-accent)]/[0.05] border border-white/10">
            <h2 className="text-xl font-semibold text-white mb-2">Something went wrong</h2>
            <p className="text-sm text-gray-400 mb-4">
              Onyx hit an unexpected error while rendering. Your library is safe — reload to continue.
            </p>
            <p className="text-xs text-gray-500 mb-6 break-words select-text">{this.state.message}</p>
            <button
              onClick={this.handleReload}
              className="px-4 py-2 rounded text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white transition-colors"
            >
              Reload Onyx
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}