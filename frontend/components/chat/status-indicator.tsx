"use client"

import { Mic, Brain, Volume2 } from "lucide-react"
import { cn } from "@/lib/utils"

export type Status = "idle" | "listening" | "thinking" | "speaking" | string

const statusConfig = {
  idle: { icon: null, label: "", color: "text-muted-foreground" },
  listening: { icon: Mic, label: "Listening...", color: "text-foreground" },
  thinking: { icon: Brain, label: "Thinking...", color: "text-foreground/80" },
  speaking: { icon: Volume2, label: "Speaking...", color: "text-foreground/80" },
}

export function StatusIndicator({ status }: { status: Status }) {
  if (status === "idle") return null

  // If status matches a predefined key, use it. Otherwise, assume it's a dynamic 
  // status streaming from SSE and use the Brain (thinking) style.
  const isCustom = !(status in statusConfig)
  const config = isCustom ? { icon: Brain, label: status, color: "text-foreground/80" } : statusConfig[status as keyof typeof statusConfig]
  const Icon = config.icon!

  return (
    <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-full animate-fade-in", config.color)}>
      <Icon className="size-3.5" />
      <span className="text-xs font-medium max-w-[200px] truncate" title={config.label}>{config.label}</span>
      <div className="flex gap-1 shrink-0">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-foreground/50 shrink-0"
            style={{
              animation: "bounce-dots 1.4s infinite ease-in-out both",
              animationDelay: `${i * 0.16}s`,
            }}
          />
        ))}
      </div>
    </div>
  )
}
