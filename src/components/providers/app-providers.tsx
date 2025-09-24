"use client"

import { ReactNode, useEffect } from "react"
import { initMocks } from "@/mocks"
import { ThemeProvider } from "./theme-provider"

export function AppProviders({ children }: { children: ReactNode }) {
  if (typeof window !== "undefined") {
    initMocks()
  }

  useEffect(() => {
    initMocks()
  }, [])

  return <ThemeProvider>{children}</ThemeProvider>
}
