"use client"

import { Square } from "lucide-react"
import { cn } from "@/lib/utils"

interface StopButtonProps {
  onClick: () => void
  visible: boolean
}

export function StopButton({ onClick, visible }: StopButtonProps) {
  if (!visible) return null

  return (
    <button
      id="stop-button"
      onClick={onClick}
      className={cn(
        "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200",
        "bg-destructive/10 text-destructive hover:bg-destructive/20 hover:scale-105 active:scale-95",
        "animate-fade-in"
      )}
    >
      <Square className="size-4" fill="currentColor" />
    </button>
  )
}
