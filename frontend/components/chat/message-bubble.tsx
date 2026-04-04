"use client"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Bot, User } from "lucide-react"
import { AgentTrace } from "./agent-trace"
import { TypingAnimation } from "./typing-animation"

export interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  action?: string
  agentTrace?: {
    planner?: { thinking: string; steps?: string[]; durationMs: number }
    toolRouter?: { decision: string; toolName: string | null; confidence: number; reason: string; durationMs: number }
    executor?: { thinking: string; toolCalled: string | null; result: string; durationMs: number }
    critic?: { thinking: string; refinement: string; durationMs: number }
    totalDurationMs?: number
  }
  suggestions?: string[]
  isTyping?: boolean
  timestamp?: Date
}

export function MessageBubble({ message, onSuggestionClick }: { message: Message; onSuggestionClick?: (s: string) => void }) {
  const isUser = message.role === "user"

  return (
    <div
      className={`flex items-start gap-3 ${isUser ? "justify-end" : "justify-start"} ${
        isUser ? "animate-slide-in-right" : "animate-slide-in-left"
      }`}
    >
      {!isUser && (
        <Avatar className="size-8 shrink-0 mt-0.5">
          <AvatarFallback className="bg-foreground/5 text-foreground/70 text-xs">
            <Bot className="size-4" />
          </AvatarFallback>
        </Avatar>
      )}

      <div className={`max-w-[80%] ${isUser ? "order-first" : ""}`}>
        <div
          className={`rounded-2xl px-4 py-3 ${
            isUser
              ? "rounded-tr-md bg-foreground/10 border border-foreground/10"
              : "rounded-tl-md bg-secondary border border-border/50"
          }`}
        >
          {message.isTyping ? (
            <TypingAnimation text={message.content} />
          ) : (
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
          )}

          {!isUser && message.action && !message.isTyping && (
            <Badge
              variant="secondary"
              className="mt-2 text-[10px] bg-foreground/5 text-foreground/60 border-foreground/10"
            >
              ✓ {message.action}
            </Badge>
          )}
        </div>

        {/* Timestamp */}
        {message.timestamp && (
          <p className={`text-[10px] text-muted-foreground mt-1 ${isUser ? "text-right" : "text-left"} px-1`}>
            {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>
        )}

        {/* Agent Trace */}
        {!isUser && message.agentTrace && !message.isTyping && (
          <AgentTrace trace={message.agentTrace} />
        )}

        {/* Smart Suggestions */}
        {!isUser && message.suggestions && message.suggestions.length > 0 && !message.isTyping && (
          <div className="flex flex-wrap gap-2 mt-3 mb-1 pl-1">
            {message.suggestions.map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => onSuggestionClick?.(suggestion)}
                className="text-[11px] px-3 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 transition-colors shadow-sm"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>

      {isUser && (
        <Avatar className="size-8 shrink-0 mt-0.5">
          <AvatarFallback className="bg-foreground/5 text-foreground/70 text-xs">
            <User className="size-4" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  )
}
