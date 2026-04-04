"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Brain, Route, Zap, Eye, ChevronDown, ChevronUp, Clock, CheckCircle2, AlertCircle, AlertTriangle } from "lucide-react"

interface AgentTraceData {
  planner?: { thinking: string; steps?: string[]; durationMs: number }
  toolRouter?: { decision: string; toolName: string | null; confidence: number; reason: string; durationMs: number }
  executor?: { thinking: string; toolCalled: string | null; result: string; durationMs: number }
  critic?: { thinking: string; refinement: string; durationMs: number; error?: string }
  totalDurationMs?: number
  error?: string
}

const agents = [
  { key: "planner" as const, label: "Planner", icon: Brain },
  { key: "toolRouter" as const, label: "Router", icon: Route },
  { key: "executor" as const, label: "Executor", icon: Zap },
  { key: "critic" as const, label: "Critic", icon: Eye },
]

export function AgentTrace({ trace }: { trace: AgentTraceData }) {
  const [isOpen, setIsOpen] = useState(false)

  const getStatusColor = (agentKey: string) => {
    if (trace.error) return "bg-destructive/20 text-destructive border-destructive/30"
    
    const data = trace[agentKey as keyof AgentTraceData]
    if (!data) return "bg-muted text-muted-foreground border-transparent"

    if (agentKey === "critic" && typeof data === "object" && data !== null && "error" in data && (data as any).error) {
       return "bg-destructive/20 text-destructive border-destructive/30"
    }

    if (agentKey === "executor") {
      const exec = data as { toolCalled: string | null, result: string }
      if (exec.result?.toLowerCase().includes("fail") || exec.result?.toLowerCase().includes("error")) {
        return "bg-destructive/20 text-destructive border-destructive/30"
      }
      if (exec.toolCalled === null) {
        return "bg-primary/20 text-primary border-primary/30" // successful text response
      }
    }

    if (agentKey === "toolRouter") {
       const router = data as { confidence: number }
       if (router.confidence < 0.5) return "bg-yellow-500/20 text-yellow-500 border-yellow-500/30"
    }

    return "bg-green-500/20 text-green-500 border-green-500/30"
  }

  const getStatusIcon = (agentKey: string) => {
    const colorClass = getStatusColor(agentKey)
    if (colorClass.includes("destructive")) return <AlertCircle className="size-3" />
    if (colorClass.includes("yellow")) return <AlertTriangle className="size-3" />
    if (colorClass.includes("muted")) return null
    return <CheckCircle2 className="size-3" />
  }

  return (
    <div className="mt-3 w-full max-w-2xl">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full p-2 text-xs rounded-md border glass-strong hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Brain className="size-3.5 text-primary" />
          <span className="font-medium">Agent Pipeline Trace</span>
        </div>
        <div className="flex items-center gap-3">
          {trace.totalDurationMs && (
            <span className="flex items-center text-muted-foreground">
              <Clock className="size-3 mr-1" />
              {trace.totalDurationMs}ms
            </span>
          )}
          {isOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </div>
      </button>

      {isOpen && (
        <div className="mt-2 p-3 rounded-md border glass-strong animate-fade-in divide-y divide-border/50">
          
          {/* Stepper Visualization */}
          <div className="flex items-center justify-between pb-4 relative">
            <div className="absolute top-4 left-4 right-4 h-0.5 bg-muted z-0"></div>
            {agents.map((agent, i) => {
              const data = trace[agent.key]
              const isActive = !!data
              const colorClass = isActive ? getStatusColor(agent.key) : "bg-muted text-muted-foreground border-transparent"
              
              return (
                <div key={agent.key} className="relative z-10 flex flex-col items-center gap-1.5 w-1/4">
                  <div className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors ${colorClass}`}>
                    <agent.icon className="size-4" />
                  </div>
                  <span className={`text-[10px] font-medium ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {agent.label}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Details Feed */}
          <div className="pt-3 space-y-3">
            {agents.map((agent) => {
              const data = trace[agent.key]
              if (!data) return null

              return (
                <div key={agent.key} className="flex items-start gap-3">
                  <div className={`mt-0.5 p-1 rounded-full ${getStatusColor(agent.key)}`}>
                    {getStatusIcon(agent.key)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-[11px] font-semibold uppercase tracking-wider">{agent.label}</span>
                      <span className="text-[10px] text-muted-foreground">{data.durationMs}ms</span>
                      
                      {agent.key === "toolRouter" && "toolName" in data && (
                        <Badge variant="secondary" className="text-[9px] px-1.5 h-4">
                          Tool: {(data as { toolName: string | null }).toolName || "None"}
                        </Badge>
                      )}
                      {agent.key === "executor" && "toolCalled" in data && (
                        <Badge variant="outline" className="text-[9px] px-1.5 h-4">
                          Executed: {(data as { toolCalled: string | null }).toolCalled || "Text Only"}
                        </Badge>
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground leading-relaxed bg-foreground/5 p-2 rounded-md mt-1">
                      {"thinking" in data ? data.thinking : "reason" in data ? (data as any).reason : ""}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
