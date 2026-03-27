'use client';

import { Component, ErrorInfo, ReactNode } from 'react';
import { ErrorDetails } from '@common/services/error-reporting';
import { ErrorFallback } from './error-fallback';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorDetails: ErrorDetails | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorDetails: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      errorDetails: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState((prev) => ({
      ...prev,
      errorDetails: {
        ...prev.errorDetails!,
        componentStack: errorInfo.componentStack ?? undefined,
      },
    }));
  }

  handleReset = (): void => {
    this.setState({ hasError: false, errorDetails: null });
  };

  render() {
    if (this.state.hasError) {
      return <ErrorFallback errorDetails={this.state.errorDetails} onReset={this.handleReset} />;
    }

    return this.props.children;
  }
}
