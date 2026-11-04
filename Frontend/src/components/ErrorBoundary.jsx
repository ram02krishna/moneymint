import React from "react";
import { LuTriangleAlert } from "react-icons/lu";

// Sits above the router/theme providers, so it styles itself with Tailwind's `dark` class only.
class ErrorBoundary extends React.Component {
  state = { error: null, componentStack: "" };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
    this.setState({ componentStack: errorInfo?.componentStack || "" });
  }

  render() {
    const { error, componentStack } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50 dark:bg-gray-900">
        <div className="card max-w-md w-full text-center">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-900/30 text-red-500 flex items-center justify-center text-3xl mb-4">
            <LuTriangleAlert />
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Something went wrong</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            We&apos;re sorry, but something unexpected happened. Reloading usually fixes it.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <button type="button" className="btn-primary" onClick={() => window.location.reload()}>
              Reload page
            </button>
            <a href="/dashboard" className="btn-secondary w-full">
              Go to dashboard
            </a>
          </div>

          {import.meta.env.DEV && (
            <details className="mt-6 text-left">
              <summary className="cursor-pointer text-xs text-gray-500">Error details (development)</summary>
              <pre className="mt-2 p-3 rounded-lg bg-gray-100 dark:bg-gray-900 text-xs overflow-auto text-gray-700 dark:text-gray-300">
                {String(error)}
                {componentStack}
              </pre>
            </details>
          )}
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
