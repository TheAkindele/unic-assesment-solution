"use client"

import React, { Component, ErrorInfo, ReactNode } from "react"
import { Alert } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo)
    this.props.onError?.(error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex min-h-[200px] items-center justify-center p-6">
          <div className="max-w-md space-y-4">
            <Alert variant="error">
              <div className="space-y-2">
                <h3 className="font-semibold">Something went wrong</h3>
                <p className="text-sm">
                  {this.state.error?.message || "An unexpected error occurred"}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    this.setState({ hasError: false, error: undefined })
                  }}
                >
                  Try again
                </Button>
              </div>
            </Alert>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * Hook for handling async errors in functional components
 */
export function useAsyncError() {
  const [error, setError] = React.useState<Error | null>(null)

  const resetError = React.useCallback(() => {
    setError(null)
  }, [])

  const handleError = React.useCallback((error: Error) => {
    setError(error)
  }, [])

  return { error, resetError, handleError }
}
