// admin/src/Components/Shared/ErrorBoundary.jsx
import React from "react";
import { AlertTriangle } from "lucide-react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error("Unhandled UI error:", error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[50vh] flex flex-col items-center justify-center text-center px-6">
          <AlertTriangle size={40} className="text-amber-500 mb-4" />
          <h2 className="text-lg font-bold text-slate-800 mb-2">
            Something went wrong
          </h2>
          <p className="text-sm text-slate-500 mb-6 max-w-sm">
            This section hit an unexpected error. Your data is safe — try again
            below.
          </p>
          <button
            type="button"
            onClick={this.handleReset}
            className="bg-emerald-700 text-white font-bold px-5 py-2.5 rounded-lg text-sm hover:bg-emerald-800 transition"
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
