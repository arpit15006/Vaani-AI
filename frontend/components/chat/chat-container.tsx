"use client"

import { useRef, useEffect } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MessageBubble, type Message } from "./message-bubble"
import { Skeleton } from "@/components/ui/skeleton"
import { Bot, Mic } from "lucide-react"

interface ChatContainerProps {
  messages: Message[]
  isLoading: boolean
  onSuggestionClick?: (suggestion: string) => void
}

export function ChatContainer({ messages, isLoading, onSuggestionClick }: ChatContainerProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const lastMessageIdRef = useRef<string | null>(null)
  
  useEffect(() => {
    const lastMessageId = messages.length > 0 ? messages[messages.length - 1].id : null
    
    if (lastMessageId !== lastMessageIdRef.current || isLoading) {
      lastMessageIdRef.current = lastMessageId
      
      // Use requestAnimationFrame for smoother and more reliable scrolling after render
      requestAnimationFrame(() => {
        if (bottomRef.current) {
          bottomRef.current.scrollIntoView({ behavior: "auto" })
        }
      })
    }
  }, [messages, isLoading])

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-y-auto px-4 pt-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {messages.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-foreground/5 flex items-center justify-center mb-4">
              <Bot className="size-8 text-foreground/40" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Welcome to VaaniAI</h3>
            <p className="text-muted-foreground text-sm max-w-md mb-6">
              Your voice-powered AI assistant. Ask me to schedule meetings,
              send emails, check weather, or just have a conversation.
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Mic className="size-3.5" />
              <span>Click the mic or type to get started</span>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} onSuggestionClick={onSuggestionClick} />
        ))}

        {isLoading && (
          <div className="flex items-start gap-3 animate-fade-in">
            <div className="w-8 h-8 rounded-full bg-foreground/5 flex items-center justify-center shrink-0">
              <Bot className="size-4 text-foreground/50" />
            </div>
            <div className="space-y-2 pt-1">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        )}

        <div ref={bottomRef} className="h-40 shrink-0 w-full pointer-events-none" />
      </div>
    </div>
  )
}
