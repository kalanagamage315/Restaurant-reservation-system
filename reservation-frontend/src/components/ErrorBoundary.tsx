import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

/**
 * ErrorBoundary wraps page-level routes to catch render errors gracefully.
 * Without this, a single component crash will blank the whole page.
 */
export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error("[ErrorBoundary] Caught a render error:", error, info.componentStack);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) return this.props.fallback;

            return (
                <div
                    style={{
                        minHeight: "50vh",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 16,
                        color: "#f87171",
                        textAlign: "center",
                        padding: 24,
                    }}
                >
                    <div style={{ fontSize: 48 }}>⚠️</div>
                    <h2 style={{ fontWeight: 700, fontSize: 22, color: "#fff", margin: 0 }}>
                        Something went wrong
                    </h2>
                    <p style={{ color: "rgba(255,255,255,0.6)", maxWidth: 400, margin: 0 }}>
                        {this.state.error?.message || "An unexpected error occurred while rendering this page."}
                    </p>
                    <button
                        onClick={this.handleReset}
                        style={{
                            marginTop: 8,
                            padding: "10px 24px",
                            borderRadius: 999,
                            border: "1px solid rgba(255,255,255,0.15)",
                            background: "rgba(255,255,255,0.08)",
                            color: "#fff",
                            fontWeight: 600,
                            cursor: "pointer",
                            fontSize: 14,
                        }}
                    >
                        Try Again
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
