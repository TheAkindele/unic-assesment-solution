"use client"

import { ChangeEvent, FormEvent, useEffect, useMemo, useState, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { AnalysisResult } from "@/lib/analysis"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert } from "@/components/ui/alert"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { HorizontalBars } from "@/components/charts/horizontal-bars"
import { Markdown } from "@/components/markdown"
import { ErrorBoundary } from "@/components/error-boundary"
import { useAuthStore } from "@/stores/auth-store"
import { useHydrated } from "@/hooks/use-hydrated"
import { useOfflineDetection } from "@/hooks/use-offline"
import { fetchWithTimeout, getErrorMessage, debounce } from "@/lib/request-utils"

interface AnalysisResponse {
  result: AnalysisResult
  model: string
  largeNarrative: string
}

const MODELS = [
  { id: "fast-lite", name: "Fast Lite", description: "Quick heuristics" },
  { id: "balanced", name: "Balanced Analyst", description: "Default chain" },
  { id: "ultra-slow", name: "Deep Dive", description: "High quality, may throttle" },
]

const ACCEPTED_MIME = ["text/csv", "application/vnd.ms-excel", "application/json", "text/plain"]

function detectFileType(fileName: string): "csv" | "json" {
  return fileName.toLowerCase().endsWith(".json") ? "json" : "csv"
}

export function AnalysisPanel() {
  const router = useRouter()
  const hydrated = useHydrated()
  const { isOnline, wasOffline } = useOfflineDetection()
  // const { token, incrementAnalysis } = useAuthStore((state) => ({
  //   token: state.token,
  //   incrementAnalysis: state.incrementAnalysis,
  // }))
  const token = useAuthStore((state) => state.token)
  const incrementAnalysis = useAuthStore((state) => state.incrementAnalysis)

  const [fileName, setFileName] = useState<string | null>(null)
  const [fileType, setFileType] = useState<"csv" | "json">("csv")
  const [rawContent, setRawContent] = useState<string>("")
  const [preview, setPreview] = useState<string>("")
  const [model, setModel] = useState(MODELS[1].id)
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showNarrative, setShowNarrative] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (hydrated && !token) {
      router.replace("/")
    }
  }, [hydrated, token, router])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  const readyToAnalyze = rawContent.trim().length > 0 && !isLoading && isOnline

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!ACCEPTED_MIME.includes(file.type) && !file.name.endsWith(".csv") && !file.name.endsWith(".json")) {
      setError("Unsupported file format. Upload CSV or JSON.")
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : ""
      setRawContent(text)
      setPreview(text.split(/\r?\n/).slice(0, 8).join("\n"))
      setFileName(file.name)
      setFileType(detectFileType(file.name))
      setAnalysis(null)
      setShowNarrative(false)
      setError(null)
    }
    reader.onerror = () => {
      setError("Failed to read file")
    }
    reader.readAsText(file)
  }

  const loadSample = async () => {
    try {
      const response = await fetch("/sample-data/sample_sales.csv")
      const text = await response.text()
      setRawContent(text)
      setPreview(text.split(/\r?\n/).slice(0, 8).join("\n"))
      setFileName("sample_sales.csv")
      setFileType("csv")
      setAnalysis(null)
      setShowNarrative(false)
      setError(null)
    } catch {
      setError("Unable to load sample data")
    }
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!readyToAnalyze) return
    
    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    // Create new abort controller
    abortControllerRef.current = new AbortController()
    
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetchWithTimeout(
        "/api/analysis",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: rawContent, fileType, model }),
        },
        {
          timeout: 60000, // 60 seconds for analysis
          signal: abortControllerRef.current.signal,
          retries: 2,
        }
      )

      const payload: AnalysisResponse | { message: string } = await response.json()

      if (!response.ok) {
        throw new Error((payload as { message?: string }).message ?? "Analysis failed")
      }

      const result = payload as AnalysisResponse
      setAnalysis(result)
      incrementAnalysis()
      setRetryCount(0) // Reset retry count on success
    } catch (caughtError) {
      const errorMessage = getErrorMessage(caughtError)
      setError(errorMessage)
      
      // Increment retry count for timeout/network errors
      if (errorMessage.includes("timeout") || errorMessage.includes("Network")) {
        setRetryCount(prev => prev + 1)
      }
    } finally {
      setIsLoading(false)
      abortControllerRef.current = null
    }
  }

  const handleRetry = useCallback(() => {
    if (retryCount < 3) {
      handleSubmit({ preventDefault: () => {} } as FormEvent)
    }
  }, [retryCount])

  // Debounced preview update for better performance
  const debouncedPreviewUpdate = useCallback(
    debounce((text: string) => {
      setRawContent(text)
    }, 300),
    []
  )

  const summaryForScreenReader = useMemo(() => analysis?.result.summary ?? preview.slice(0, 200), [analysis, preview])

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Upload data</CardTitle>
          <CardDescription>Send CSV or JSON and the analyst model will compute KPIs, trends, and observations.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={handleSubmit} aria-live="polite">
            <div className="flex flex-col gap-2">
              <Label htmlFor="data-file">Data file</Label>
              <input
                id="data-file"
                type="file"
                accept=".csv,.json,text/csv,application/json"
                onChange={handleFileChange}
                className="block w-full rounded-md border border-dashed border-slate-300 bg-white px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-blue-500 dark:border-slate-700 dark:bg-slate-900"
              />
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span>{fileName ?? "No file selected"}</span>
                <Button type="button" size="sm" variant="ghost" onClick={loadSample}>
                  Use sample sales CSV
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="model-select">Analysis model</Label>
              <select
                id="model-select"
                className="h-10 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-blue-500 dark:border-slate-700 dark:bg-slate-900"
                value={model}
                onChange={(event) => setModel(event.target.value)}
              >
                {MODELS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name} – {option.description}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="data-preview">Preview</Label>
              <Textarea
                id="data-preview"
                value={preview}
                onChange={(event) => {
                  const text = event.target.value
                  setPreview(text)
                  debouncedPreviewUpdate(text)
                }}
                placeholder="First few rows will appear here"
                aria-describedby="preview-help"
                className="min-h-[120px] resize-y"
              />
              <p id="preview-help" className="text-xs text-slate-500">
                You can edit the preview before running the analysis. Edits replace the uploaded content.
              </p>
            </div>

            <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
                <p className="text-xs text-slate-500 sm:max-w-[85%]">
                  <span className="font-medium text-slate-700 dark:text-slate-300">Summary:</span>
                  <span className="ml-1">{summaryForScreenReader}</span>
                </p>
                {!isOnline && (
                  <Badge variant="warning" className="text-xs">
                    Offline
                  </Badge>
                )}
                {wasOffline && (
                  <Badge variant="outline" className="text-xs">
                    Back online
                  </Badge>
                )}
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                <Button 
                  type="submit" 
                  isLoading={isLoading} 
                  disabled={!readyToAnalyze}
                  className="md:min-w-[10rem] w-auto sm:w-auto"
                >
                  {isLoading ? "Analyzing..." : "Analyze data"}
                </Button>
                {error && retryCount < 3 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleRetry}
                    disabled={isLoading}
                    className="w-full sm:w-auto"
                  >
                    Retry ({3 - retryCount} left)
                  </Button>
                )}
              </div>
            </div>
          </form>
        </CardContent>
        {error && (
          <CardFooter>
            <Alert variant="error" className="w-full">
              <div className="space-y-2">
                <p className="font-medium">{error}</p>
                {error.toLowerCase().includes("rate") && (
                  <p className="text-sm">Give it a moment and try a different model tier.</p>
                )}
                {error.toLowerCase().includes("timeout") && (
                  <p className="text-sm">The request took too long. Try using a faster model or smaller dataset.</p>
                )}
                {error.toLowerCase().includes("network") && (
                  <p className="text-sm">Check your internet connection and try again.</p>
                )}
                {!isOnline && (
                  <p className="text-sm">You're currently offline. Requests will be queued until you're back online.</p>
                )}
              </div>
            </Alert>
          </CardFooter>
        )}
      </Card>

      {analysis && (
        <ErrorBoundary>
          <section className="grid gap-6 xl:grid-cols-5" aria-label="Analysis results">
            <Card className="xl:col-span-3">
              <CardHeader>
                <CardTitle>Insights</CardTitle>
                <CardDescription>Concise summary with markdown support.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Markdown content={analysis.result.summary} className="prose prose-sm max-w-none dark:prose-invert" />
                <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700 dark:text-slate-200">
                  {analysis.result.insights.map((insight) => (
                    <li key={insight}>{insight}</li>
                  ))}
                </ul>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowNarrative((current) => !current)}
                  className="w-full sm:w-auto"
                >
                  {showNarrative ? "Hide long narrative" : "Show long narrative"}
                </Button>
                {showNarrative && (
                  <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <Markdown content={analysis.largeNarrative} className="prose prose-sm max-w-none dark:prose-invert" />
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid gap-6 xl:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>KPIs</CardTitle>
                  <CardDescription>Key figures derived from numeric measures.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3">
                  {analysis.result.kpis.length === 0 && (
                    <p className="text-sm text-slate-500">No numeric metrics detected.</p>
                  )}
                  {analysis.result.kpis.map((kpi) => (
                    <div key={kpi.label} className="rounded-md border border-slate-200 p-3 text-sm dark:border-slate-700">
                      <p className="text-xs uppercase text-slate-500">{kpi.label}</p>
                      <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">{kpi.value}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Trend chart</CardTitle>
                  <CardDescription>Highest contributing segments.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <HorizontalBars data={analysis.result.trends} />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="xl:col-span-5">
              <CardHeader>
                <CardTitle>Preview table</CardTitle>
                <CardDescription>First few rows of the aggregated output.</CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <div className="min-w-full">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead>
                      <tr>
                        {analysis.result.table.headers.map((header) => (
                          <th 
                            key={header} 
                            scope="col" 
                            className="bg-slate-50 px-3 py-2 text-left font-semibold text-slate-600 capitalize dark:bg-slate-800 dark:text-slate-300"
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {analysis.result.table.rows.map((row, rowIndex) => (
                        <tr 
                          key={rowIndex} 
                          className={rowIndex % 2 === 0 ? "bg-white dark:bg-slate-900" : "bg-slate-50 dark:bg-slate-800"}
                        >
                          {row.map((value, cellIndex) => (
                            <td 
                              key={`${rowIndex}-${cellIndex}`} 
                              className="px-3 py-2 text-slate-700 dark:text-slate-300"
                            >
                              {typeof value === "number" ? value.toLocaleString() : String(value)}
                            </td>
                          ))}
                        </tr>
                      ))}
                      {analysis.result.table.rows.length === 0 && (
                        <tr>
                          <td 
                            colSpan={analysis.result.table.headers.length || 1} 
                            className="px-3 py-6 text-center text-slate-800 dark:text-slate-200"
                          >
                            No tabular preview available.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
              <CardFooter className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                <Badge variant="outline">Model: {analysis.model}</Badge>
                <span>{analysis.result.table.rows.length} rows shown</span>
              </CardFooter>
            </Card>
          </section>
        </ErrorBoundary>
      )}
    </div>
  )
}

