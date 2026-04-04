"use client"

import { Mic, MicOff } from "lucide-react"
import { cn } from "@/lib/utils"

interface MicButtonProps {
  isListening: boolean
  onClick: () => void
  disabled?: boolean
}

export function MicButton({ isListening, onClick, disabled }: MicButtonProps) {
  return (
    <button
      id="mic-button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "relative w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed",
        isListening
          ? "bg-foreground/15 text-foreground hover:bg-foreground/20"
          : "bg-foreground/5 text-foreground/70 hover:bg-foreground/10 hover:scale-105 active:scale-95"
      )}
    >
      {/* Pulse rings when listening */}
      {isListening && (
        <>
          <span className="absolute inset-0 rounded-full bg-foreground/10 animate-pulse-ring" />
          <span className="absolute inset-0 rounded-full bg-foreground/5 animate-pulse-ring delay-300" />
        </>
      )}

      {isListening ? (
        <MicOff className="size-5 relative z-10" />
      ) : (
        <Mic className="size-5 relative z-10" />
      )}
    </button>
  )
}
