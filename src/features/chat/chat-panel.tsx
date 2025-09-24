"use client"

import { FormEvent, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ChatMessage, ChatResponse } from "./types"
import { ChatMessageItem } from "./chat-message-item"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Alert } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuthStore } from "@/stores/auth-store"
import { useHydrated } from "@/hooks/use-hydrated"

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
  const { user, token, incrementChat } = useAuthStore((state) => ({
    user: state.user,
    token: state.token,
    incrementChat: state.incrementChat,
  }))

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

  useEffect(() => {
    if (hydrated && !token) {
      router.replace("/")
    }
  }, [hydrated, token, router])

  const canSubmit = draft.trim().length > 1 && !isSending

  const sendToModel = async (content: string, history: ChatMessage[]) => {
    setPendingMessage(content)
    setIsSending(true)
    setError(null)

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content, history, model }),
      })

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
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Chat failed")
      setDraft(content)
    } finally {
      setIsSending(false)
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

  const retry = () => {
    if (!pendingMessage) return
    sendToModel(pendingMessage, messages)
  }

  const historyCount = useMemo(() => messages.filter((message) => message.role !== "system").length, [messages])

  return (
    <div className="flex h-full flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Conversation</CardTitle>
          <CardDescription>
            Model chaining demonstrates creative ideation followed by analytical refinement. Each assistant reply appears in stages.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4 rounded-md bg-slate-50 p-4 text-sm dark:bg-slate-900/50">
            <div>
              <p className="font-medium text-slate-700 dark:text-slate-200">Active model</p>
              <p className="text-slate-500">{MODELS.find((item) => item.id === model)?.name}</p>
            </div>
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium" htmlFor="model-select">
                Switch model
              </label>
              <select
                id="model-select"
                className="h-10 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 dark:bg-slate-900 dark:border-slate-700"
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
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-slate-500">Enter to send · Shift+Enter for new line</p>
              <div className="flex items-center gap-2">
                <Button type="submit" isLoading={isSending} disabled={!canSubmit}>
                  Send
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setMessages((current) => current.slice(0, 1))}
                  disabled={messages.length <= 1 || isSending}
                >
                  Clear conversation
                </Button>
              </div>
            </div>
          </form>
          {error && (
            <Alert variant="error">
              <div className="flex flex-col gap-2">
                <p className="font-medium">{error}</p>
                <Button size="sm" variant="outline" onClick={retry}>
                  Retry last message
                </Button>
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
  )
}
