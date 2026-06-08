import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: React.ReactNode;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[200px] rounded-2xl border border-border bg-card p-8 text-center">
          <AlertTriangle className="h-8 w-8 text-destructive mb-3" />
          <p className="text-sm font-medium text-foreground mb-1">
            {this.props.fallbackMessage || "문제가 발생했습니다"}
          </p>
          <p className="text-xs text-muted-foreground mb-4">
            잠시 후 다시 시도해주세요
          </p>
          <button
            onClick={this.handleRetry}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <RefreshCw className="h-3 w-3" />
            다시 시도
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}