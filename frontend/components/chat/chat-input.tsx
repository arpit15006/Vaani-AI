"use client"

import { useState, KeyboardEvent } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Send } from "lucide-react"

interface ChatInputProps {
  onSend: (message: string) => void
  disabled?: boolean
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [input, setInput] = useState("")

  const handleSend = () => {
    const trimmed = input.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setInput("")
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex items-end gap-2">
      <Textarea
        id="chat-input"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type a message or use the mic..."
        disabled={disabled}
        className="min-h-[44px] max-h-[120px] bg-muted/50 border-border/50 rounded-xl resize-none text-sm"
        rows={1}
      />
      <Button
        id="send-button"
        onClick={handleSend}
        disabled={disabled || !input.trim()}
        size="icon"
        className="shrink-0 rounded-xl h-[44px] w-[44px]"
      >
        <Send className="size-4" />
      </Button>
    </div>
  )
}
