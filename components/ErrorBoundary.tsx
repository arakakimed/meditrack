import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        // Update state so the next render will show the fallback UI.
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        // You can also log the error to an error reporting service
        console.error('Uncaught error:', error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
                    <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-8 text-center border border-red-100 dark:border-red-900/30">
                        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                            <span className="material-symbols-outlined text-3xl">error_outline</span>
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Ops! Algo deu errado.</h2>
                        <p className="text-slate-500 dark:text-slate-400 mb-6">
                            Ocorreu um erro inesperado na interface. Por favor, tente recarregar a página.
                        </p>
                        {this.state.error && (
                            <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-900 rounded-xl text-left border border-slate-200 dark:border-slate-700 overflow-auto max-h-40">
                                <p className="text-xs font-mono text-rose-600 dark:text-rose-400 break-all">
                                    {this.state.error.name}: {this.state.error.message}
                                </p>
                            </div>
                        )}
                        <button
                            onClick={() => window.location.reload()}
                            className="w-full py-3 bg-primary text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/30 font-display"
                        >
                            Recarregar Sistema
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
