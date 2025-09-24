"use client"

import { FormEvent, useEffect, useMemo, useState, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { ChatMessage, ChatResponse } from "./types"
import { ChatMessageItem } from "./chat-message-item"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Alert } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ErrorBoundary } from "@/components/error-boundary"
import { useAuthStore } from "@/stores/auth-store"
import { useHydrated } from "@/hooks/use-hydrated"
import { useOfflineDetection } from "@/hooks/use-offline"
import { fetchWithTimeout, getErrorMessage, debounce } from "@/lib/request-utils"

const MODELS = [
  { id: "creative-pro", name: "Creative Pro" },
  { id: "balanced", name: "Balanced" },
  { id: "analytics", name: "Analyst" },
]

interface UsageMetrics {
  totalTokens: number
  model: string
  latencyMs: number
}

export function ChatPanel() {
  const hydrated = useHydrated()
  const router = useRouter()
  const { isOnline, wasOffline } = useOfflineDetection()
  // const { user, token, incrementChat } = useAuthStore((state) => ({
  //   user: state.user,
  //   token: state.token,
  //   incrementChat: state.incrementChat,
  // }))
  const user = useAuthStore((state) => state.user)
  const token = useAuthStore((state) => state.token)
  const incrementChat = useAuthStore((state) => state.incrementChat)

  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: "welcome",
      role: "assistant",
      label: "Guide",
      content: "Hello! I combine a creative model with an analytical reviewer. Ask for planning help, summaries, or try a calculator/weather question to trigger tool usage.",
      createdAt: Date.now(),
    },
  ])
  const [draft, setDraft] = useState("")
  const [model, setModel] = useState(MODELS[1].id)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [usage, setUsage] = useState<UsageMetrics | null>(null)
  const [pendingMessage, setPendingMessage] = useState<string | null>(null)
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

  const canSubmit = draft.trim().length > 1 && !isSending && isOnline

  const sendToModel = async (content: string, history: ChatMessage[]) => {
    setPendingMessage(content)
    setIsSending(true)
    setError(null)

    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    // Create new abort controller
    abortControllerRef.current = new AbortController()

    try {
      const response = await fetchWithTimeout(
        "/api/chat",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: content, history, model }),
        },
        {
          timeout: 45000, // 45 seconds for chat
          signal: abortControllerRef.current.signal,
          retries: 2,
        }
      )

      const payload: ChatResponse | { message: string } = await response.json()

      if (!response.ok) {
        throw new Error((payload as { message?: string }).message ?? "Unable to respond")
      }

      const chatResponse = payload as ChatResponse

      for (const step of chatResponse.steps) {
        await new Promise<void>((resolve) => {
          setTimeout(() => {
            setMessages((current) => [
              ...current,
              {
                id: step.id,
                role: step.role,
                label: step.label,
                content: step.content,
                createdAt: Date.now(),
              },
            ])
            resolve()
          }, 280)
        })
      }

      setUsage(chatResponse.usage)
      incrementChat()
      setPendingMessage(null)
      setRetryCount(0) // Reset retry count on success
    } catch (caughtError) {
      const errorMessage = getErrorMessage(caughtError)
      setError(errorMessage)
      setDraft(content)
      
      // Increment retry count for timeout/network errors
      if (errorMessage.includes("timeout") || errorMessage.includes("Network")) {
        setRetryCount(prev => prev + 1)
      }
    } finally {
      setIsSending(false)
      abortControllerRef.current = null
    }
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const trimmed = draft.trim()
    if (!trimmed) return

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      label: user?.name ?? "You",
      content: trimmed,
      createdAt: Date.now(),
    }

    const nextHistory = [...messages, userMessage]
    setMessages(nextHistory)
    setDraft("")
    await sendToModel(trimmed, nextHistory)
  }

  const retry = useCallback(() => {
    if (!pendingMessage || retryCount >= 3) return
    sendToModel(pendingMessage, messages)
  }, [pendingMessage, retryCount, messages])

  // Debounced draft update for better performance
  const debouncedDraftUpdate = useCallback(
    debounce((text: string) => {
      setDraft(text)
    }, 200),
    []
  )

  const historyCount = useMemo(() => messages.filter((message) => message.role !== "system").length, [messages])

  return (
    <ErrorBoundary>
      <div className="flex h-full flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Conversation</CardTitle>
            <CardDescription>
              Model chaining demonstrates creative ideation followed by analytical refinement. Each assistant reply appears in stages.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-md bg-slate-50 p-4 text-sm dark:bg-slate-900/50">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
                <div>
                  <p className="font-medium text-slate-700 dark:text-slate-200">Active model</p>
                  <p className="text-slate-500">{MODELS.find((item) => item.id === model)?.name}</p>
                </div>
                <div className="flex items-center gap-2">
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
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                <label className="text-sm font-medium" htmlFor="model-select">
                  Switch model
                </label>
                <select
                  id="model-select"
                  className="h-10 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-blue-500 dark:bg-slate-900 dark:border-slate-700 w-full sm:w-auto"
                  value={model}
                  onChange={(event) => setModel(event.target.value)}
                >
                  {MODELS.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        <CardFooter className="flex flex-col gap-4">
          {usage && (
            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
              <Badge variant="outline">{usage.model}</Badge>
              <span>{usage.totalTokens} tokens</span>
              <span>{usage.latencyMs} ms</span>
              <span>{historyCount} turns</span>
            </div>
          )}
          <form className="flex w-full flex-col gap-3" onSubmit={handleSubmit} aria-label="Send a chat message">
            <Label htmlFor="chat-input">Message</Label>
            <Textarea
              id="chat-input"
              required
              aria-required
              placeholder="Ask about sales trends or request a quick calculation."
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  if (canSubmit) {
                    event.preventDefault()
                    handleSubmit(event)
                  }
                }
              }}
              className="min-h-[80px] resize-y"
            />
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <p className="text-xs text-slate-500">Enter to send · Shift+Enter for new line</p>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <Button 
                  type="submit" 
                  isLoading={isSending} 
                  disabled={!canSubmit}
                  className="w-full sm:w-auto"
                >
                  {isSending ? "Sending..." : "Send"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setMessages((current) => current.slice(0, 1))}
                  disabled={messages.length <= 1 || isSending}
                  className="w-full sm:w-auto"
                >
                  Clear conversation
                </Button>
              </div>
            </div>
          </form>
          {error && (
            <Alert variant="error">
              <div className="space-y-2">
                <p className="font-medium">{error}</p>
                {error.toLowerCase().includes("timeout") && (
                  <p className="text-sm">The request took too long. Try a shorter message or different model.</p>
                )}
                {error.toLowerCase().includes("network") && (
                  <p className="text-sm">Check your internet connection and try again.</p>
                )}
                {!isOnline && (
                  <p className="text-sm">You're currently offline. Messages will be queued until you're back online.</p>
                )}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  {pendingMessage && retryCount < 3 && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={retry}
                      disabled={!pendingMessage || isSending}
                      className="w-full sm:w-auto"
                    >
                      Retry ({3 - retryCount} left)
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setError(null)}
                    className="w-full sm:w-auto"
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            </Alert>
          )}
        </CardFooter>
      </Card>

        <section aria-label="Conversation history" className="flex-1 overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="flex h-full max-h-[60vh] flex-col gap-4 overflow-y-auto p-6" role="log">
            <ol className="flex flex-col gap-4">
              {messages.map((message) => (
                <ChatMessageItem key={message.id} message={message} />
              ))}
              {isSending && (
                <li className="flex items-center gap-2 text-sm text-slate-500" aria-live="assertive">
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />
                  Thinking…
                </li>
              )}
            </ol>
          </div>
        </section>
      </div>
    </ErrorBoundary>
  )
}
