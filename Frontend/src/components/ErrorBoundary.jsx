import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(_) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo,
    });
  }

  render() {
    if (this.state.hasError) {
      // render any custom fallback UI
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100vh",
            padding: "20px",
            textAlign: "center",
            backgroundColor: "#f8f9fa",
          }}
        >
          <h2 style={{ color: "#dc3545", marginBottom: "20px" }}>
            Something went wrong
          </h2>
          <p style={{ color: "#6c757d", marginBottom: "20px" }}>
            We&apos;re sorry, but something unexpected happened. Please try
            refreshing the page.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "10px 20px",
              backgroundColor: "#007bff",
              color: "white",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
              fontSize: "16px",
            }}
          >
            Refresh Page
          </button>
          {import.meta.env.DEV && this.state.error && (
            <details
              style={{
                marginTop: "20px",
                textAlign: "left",
                maxWidth: "600px",
              }}
            >
              <summary style={{ cursor: "pointer", color: "#6c757d" }}>
                Error Details (Development)
              </summary>
              <pre
                style={{
                  backgroundColor: "#f8f9fa",
                  padding: "10px",
                  borderRadius: "5px",
                  overflow: "auto",
                  fontSize: "12px",
                }}
              >
                {this.state.error && this.state.error.toString()}
                {this.state.errorInfo && this.state.errorInfo.componentStack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
