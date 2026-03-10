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
          <h2 className="mb-2 text-lg font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
            Algo salió mal
          </h2>
          <p className="mb-1 text-sm text-[#86868b] text-center max-w-md">
            Ocurrió un error inesperado en esta sección.
          </p>
          <p className="mb-5 text-xs text-[#86868b]/60 text-center max-w-md font-mono">
            {this.state.error?.message || "Error desconocido"}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-[#0071e3] text-white hover:bg-[#0077ED] transition-colors"
          >
            <RefreshCw size={14} />
            Reintentar
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
