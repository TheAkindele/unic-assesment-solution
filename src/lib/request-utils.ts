/**
 * Enhanced request utilities with timeout, cancellation, and error handling
 */

export interface RequestConfig {
  timeout?: number
  signal?: AbortSignal
  retries?: number
  retryDelay?: number
}

export interface RequestError extends Error {
  status?: number
  code?: string
  isTimeout?: boolean
  isAborted?: boolean
  isNetworkError?: boolean
}

export class RequestTimeoutError extends Error {
  constructor(message = "Request timeout") {
    super(message)
    this.name = "RequestTimeoutError"
  }
}

export class RequestAbortedError extends Error {
  constructor(message = "Request aborted") {
    super(message)
    this.name = "RequestAbortedError"
  }
}

export class NetworkError extends Error {
  constructor(message = "Network error") {
    super(message)
    this.name = "NetworkError"
  }
}

/**
 * Enhanced fetch with timeout, cancellation, and retry logic
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  config: RequestConfig = {}
): Promise<Response> {
  const {
    timeout = 30000, // 30 seconds default
    signal: externalSignal,
    retries = 2,
    retryDelay = 1000,
  } = config

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  // Combine external signal with timeout signal
  const combinedSignal = externalSignal
    ? (() => {
        const combined = new AbortController()
        const abort = () => combined.abort()
        externalSignal.addEventListener("abort", abort)
        controller.signal.addEventListener("abort", abort)
        return combined.signal
      })()
    : controller.signal

  const fetchOptions: RequestInit = {
    ...options,
    signal: combinedSignal,
  }

  let lastError: Error | undefined

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, fetchOptions)
      clearTimeout(timeoutId)
      return response
    } catch (error) {
      lastError = error as Error
      
      // Don't retry on abort or if it's the last attempt
      if (controller.signal.aborted || attempt === retries) {
        break
      }

      // Wait before retrying
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt)))
      }
    }
  }

  clearTimeout(timeoutId)

  // Classify the error
  if (controller.signal.aborted) {
    throw new RequestTimeoutError("Request timed out")
  }
  
  if (externalSignal?.aborted) {
    throw new RequestAbortedError("Request was cancelled")
  }

  if (lastError?.name === "TypeError" && lastError.message.includes("fetch")) {
    throw new NetworkError("Network connection failed")
  }

  throw lastError || new Error("Request failed")
}

/**
 * Debounce function for API calls
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

/**
 * Throttle function for API calls
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

/**
 * Check if the browser is online
 */
export function isOnline(): boolean {
  return typeof navigator !== "undefined" ? navigator.onLine : true
}

/**
 * Wait for the browser to come back online
 */
export function waitForOnline(): Promise<void> {
  return new Promise((resolve) => {
    if (isOnline()) {
      resolve()
      return
    }

    const handleOnline = () => {
      window.removeEventListener("online", handleOnline)
      resolve()
    }

    window.addEventListener("online", handleOnline)
  })
}

/**
 * Enhanced error handler that provides user-friendly messages
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof RequestTimeoutError) {
    return "Request timed out. Please try again."
  }
  
  if (error instanceof RequestAbortedError) {
    return "Request was cancelled."
  }
  
  if (error instanceof NetworkError) {
    return "Network error. Please check your connection."
  }
  
  if (error instanceof Error) {
    return error.message
  }
  
  return "An unexpected error occurred."
}

/**
 * Retry with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | undefined

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error
      
      if (attempt === maxRetries) {
        break
      }

      const delay = baseDelay * Math.pow(2, attempt)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError || new Error("Retry failed")
}
