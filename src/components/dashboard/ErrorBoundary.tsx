"use client";

import { Component, ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100/80 dark:bg-red-950/40">
            <AlertCircle size={26} className="text-red-500" />
          </div>
          <h2 className="mb-2 text-lg font-semibold text-foreground">Algo salió mal</h2>
          <p className="apple-copy mb-1 max-w-md text-center text-sm">
            Ocurrió un error inesperado en esta sección.
          </p>
          <p className="mb-5 max-w-md text-center text-xs font-mono text-[color:color-mix(in_srgb,var(--gray-500)_72%,transparent)]">
            {this.state.error?.message || "Error desconocido"}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="apple-button-primary text-sm"
            >
              <RefreshCw size={14} />
              Reintentar sección
            </button>
            <button
              onClick={() => window.location.reload()}
              className="apple-button-secondary text-sm"
            >
              Recargar página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
