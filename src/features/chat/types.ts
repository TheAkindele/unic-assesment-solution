export type ChatRole = "user" | "assistant" | "system" | "tool"

export interface ChatMessage {
  id: string
  role: ChatRole
  content: string
  label?: string
  createdAt: number
}

export interface ChatResponse {
  steps: {
    id: string
    role: ChatRole
    label?: string
    content: string
  }[]
  usage: {
    totalTokens: number
    model: string
    latencyMs: number
  }
}
