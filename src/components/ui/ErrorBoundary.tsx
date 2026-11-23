import React from 'react';
import { RotateCcw } from 'lucide-react';

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-porcelain flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white border border-hairline rounded-atelier p-8 text-center space-y-4">
            <div className="font-editorial text-2xl text-charcoal">
              LVB Pulse encountered an unexpected view state
            </div>
            <p className="text-sm text-softgray leading-relaxed">
              Your local demo data is safe. Reload the workspace to continue seamlessly.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 h-10 px-5 rounded-lg bg-olive text-white text-sm font-medium hover:bg-olive-dark transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Reload Workspace
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
