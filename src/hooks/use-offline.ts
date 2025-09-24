"use client"

import { useEffect, useState, useCallback } from "react"

interface OfflineState {
  isOnline: boolean
  wasOffline: boolean
  retryCount: number
}

export function useOfflineDetection() {
  const [state, setState] = useState<OfflineState>({
    isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
    wasOffline: false,
    retryCount: 0,
  })

  const handleOnline = useCallback(() => {
    setState(prev => ({
      isOnline: true,
      wasOffline: prev.isOnline === false,
      retryCount: prev.isOnline === false ? prev.retryCount + 1 : prev.retryCount,
    }))
  }, [])

  const handleOffline = useCallback(() => {
    setState(prev => ({
      ...prev,
      isOnline: false,
    }))
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [handleOnline, handleOffline])

  return state
}

/**
 * Hook for handling requests with offline detection
 */
export function useOfflineAwareRequest() {
  const { isOnline, wasOffline } = useOfflineDetection()
  const [pendingRequests, setPendingRequests] = useState<Array<() => Promise<any>>>([])

  const queueRequest = useCallback((request: () => Promise<any>) => {
    if (isOnline) {
      return request()
    } else {
      setPendingRequests(prev => [...prev, request])
      return Promise.reject(new Error("Offline - request queued"))
    }
  }, [isOnline])

  const retryPendingRequests = useCallback(async () => {
    if (pendingRequests.length === 0) return

    const requests = [...pendingRequests]
    setPendingRequests([])

    const results = await Promise.allSettled(requests.map(request => request()))
    return results
  }, [pendingRequests])

  useEffect(() => {
    if (wasOffline && isOnline && pendingRequests.length > 0) {
      retryPendingRequests()
    }
  }, [wasOffline, isOnline, pendingRequests.length, retryPendingRequests])

  return {
    isOnline,
    wasOffline,
    queueRequest,
    retryPendingRequests,
    pendingCount: pendingRequests.length,
  }
}
