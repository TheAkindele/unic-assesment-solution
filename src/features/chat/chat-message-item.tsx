"use client"

import { useState } from "react"
import { ChatMessage } from "./types"
import { cn } from "@/lib/utils"
import { Markdown } from "@/components/markdown"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface ChatMessageItemProps {
  message: ChatMessage
}

const PREVIEW_THRESHOLD = 480

export function ChatMessageItem({ message }: ChatMessageItemProps) {
  const [expanded, setExpanded] = useState(false)
  const isUser = message.role === "user"
  const bubbleStyles = cn(
    "rounded-lg px-4 py-3 text-sm shadow-sm",
    isUser ? "bg-blue-600 text-white ml-auto" : "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100",
  )

  const shouldTruncate = message.content.length > PREVIEW_THRESHOLD
  const previewContent = shouldTruncate && !expanded ? `${message.content.slice(0, PREVIEW_THRESHOLD)}…` : message.content

  return (
    <li className={cn("flex max-w-3xl flex-col gap-1", isUser ? "items-end" : "items-start")}
        aria-live={isUser ? undefined : "polite"}>
      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <Badge variant={isUser ? "default" : message.role === "tool" ? "warning" : "outline"}>{message.label ?? message.role}</Badge>
        <span>{new Date(message.createdAt).toLocaleTimeString()}</span>
      </div>
      <div className={bubbleStyles}>
        <Markdown content={previewContent} className="prose prose-sm max-w-none dark:prose-invert" />
        {shouldTruncate && (
          <div className="mt-2 text-right">
            <Button variant="ghost" size="sm" onClick={() => setExpanded((current) => !current)}>
              {expanded ? "Show less" : "Expand"}
            </Button>
          </div>
        )}
      </div>
    </li>
  )
}
