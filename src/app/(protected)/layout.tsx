"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { ReactNode, useEffect } from "react"
import { shallow } from "zustand/shallow"
import { useAuthStore } from "@/stores/auth-store"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { ErrorBoundary } from "@/components/error-boundary"
import { useHydrated } from "@/hooks/use-hydrated"
import { Badge } from "@/components/ui/badge"

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/tools/chat", label: "Chat" },
  { href: "/tools/analysis", label: "Analysis" },
]

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const hydrated = useHydrated()
  const user = useAuthStore((state) => state.user)
	const stats = useAuthStore((state) => state.stats)
	const token = useAuthStore((state) => state.token)
	const logout = useAuthStore((state) => state.logout)


  useEffect(() => {
    if (hydrated && !token) {
      router.replace("/?from=" + encodeURIComponent(pathname))
    }
  }, [hydrated, token, router, pathname])

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center border-2 border-red-500">
        <span className="h-6 w-6 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" aria-hidden />
        <span className="sr-only">Loading…</span>
      </div>
    )
  }

  if (!token) {
    return null
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <header className="border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
          <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">AI Agent Workspace</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Logged in as {user?.name ?? "Unknown"} · {user?.title}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="outline">Chat: {stats.chatRequests}</Badge>
              <Badge variant="outline">Analysis: {stats.analysisRuns}</Badge>
              <ThemeToggle />
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  logout()
                  router.replace("/")
                }}
                className="w-full sm:w-auto"
              >
                Sign out
              </Button>
            </div>
          </div>
          <nav className="border-t border-slate-200 dark:border-slate-800">
            <div className="mx-auto flex max-w-6xl items-center gap-4 overflow-x-auto px-6 py-3 text-sm">
              {NAV_LINKS.map((link) => {
                const isActive = pathname === link.href
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`rounded-md px-3 py-2 font-medium transition-colors ${
                      isActive
                        ? "bg-blue-600 text-white"
                        : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                    }`}
                    aria-current={isActive ? "page" : undefined}
                  >
                    {link.label}
                  </Link>
                )
              })}
            </div>
          </nav>
        </header>
        <main className="mx-auto flex max-w-6xl flex-1 flex-col gap-8 px-6 py-10">{children}</main>
      </div>
    </ErrorBoundary>
  )
}
