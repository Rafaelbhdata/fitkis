'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo })
    // Log to console in development
    console.error('ErrorBoundary caught an error:', error, errorInfo)

    // TODO: Send to error tracking service (Sentry, etc.) in production
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-[50vh] flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center">
            <div className="w-16 h-16 rounded-full bg-berry-soft flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-berry" />
            </div>

            <h2 className="font-serif text-2xl font-light mb-2">
              Algo salió mal
            </h2>

            <p className="text-ink-4 text-sm mb-6">
              Ocurrió un error inesperado. Puedes intentar recargar la página.
            </p>

            <div className="flex flex-col gap-3">
              <button
                onClick={this.handleRetry}
                className="w-full py-3 rounded-xl bg-ink text-paper font-medium flex items-center justify-center gap-2 hover:bg-ink/90 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Intentar de nuevo
              </button>

              <button
                onClick={() => window.location.href = '/dashboard'}
                className="w-full py-3 rounded-xl border border-ink-7 text-ink-3 font-medium hover:bg-paper-2 transition-colors"
              >
                Ir al inicio
              </button>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-6 text-left">
                <summary className="text-xs text-ink-5 cursor-pointer hover:text-ink-3">
                  Detalles del error (dev only)
                </summary>
                <pre className="mt-2 p-3 bg-paper-3 rounded-lg text-xs text-berry overflow-auto max-h-40">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
