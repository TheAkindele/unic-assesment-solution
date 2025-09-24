"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuthStore } from "@/stores/auth-store"

interface ToolSummary {
  id: string
  name: string
  description: string
  route: string
  latency: string
  status: string
}

export default function DashboardPage() {
  // const { user, stats } = useAuthStore((state) => ({ user: state.user, stats: state.stats }))
  const user = useAuthStore((state) => state.user)
  const stats = useAuthStore((state) => state.stats)
  const [tools, setTools] = useState<ToolSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    async function loadTools() {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch("/api/tools")
        const payload: { tools: ToolSummary[]; message?: string } = await response.json()
        if (!response.ok) {
          throw new Error(payload.message ?? "Failed to load tools")
        }
        if (mounted) {
          setTools(payload.tools)
        }
      } catch (caughtError) {
        if (mounted) {
          setError(caughtError instanceof Error ? caughtError.message : "Unable to load tools")
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }
    loadTools()
    return () => {
      mounted = false
    }
  }, [])

  return (
    <div className="space-y-8">
      <section className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Chat queries</CardTitle>
            <CardDescription>Total interactions sent to the assistant.</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{stats.chatRequests}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Analyses run</CardTitle>
            <CardDescription>Completed data explorations.</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{stats.analysisRuns}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Last login</CardTitle>
            <CardDescription>Timestamp from the mocked auth flow.</CardDescription>
          </CardHeader>
          <CardContent className="text-lg font-semibold">
            {stats.lastLogin ? new Date(stats.lastLogin).toLocaleString() : "—"}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2" aria-live="polite">
        <header className="md:col-span-2 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Available tools</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Each tool is fully mocked with deterministic responses for reliable demos.
            </p>
          </div>
          <p className="text-sm text-slate-500">Welcome back, {user?.name}</p>
        </header>
        {loading && (
          <div className="md:col-span-2 grid gap-4 md:grid-cols-2">
            {[0, 1, 2, 3].map((index) => (
              <Skeleton key={index} className="h-40 w-full" />
            ))}
          </div>
        )}
        {error && (
          <Alert variant="error" className="md:col-span-2">
            <span>{error}</span>
          </Alert>
        )}
        {!loading && !error &&
          tools.map((tool) => (
            <Card key={tool.id} className="flex flex-col justify-between">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-lg">
                  {tool.name}
                  <span className="text-xs font-normal text-slate-500">{tool.status}</span>
                </CardTitle>
                <CardDescription>{tool.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between text-sm text-slate-500">
                <span>Latency: {tool.latency}</span>
                <Link
                  href={tool.route}
                  className="inline-flex h-9 items-center rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Open
                </Link>
              </CardContent>
            </Card>
          ))}
      </section>
    </div>
  )
}
