"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Bot, User, Mic } from "lucide-react"

const demoMessages = [
  {
    role: "user" as const,
    text: "Schedule a meeting tomorrow at 5 PM with the design team",
  },
  {
    role: "assistant" as const,
    text: 'Your meeting "Design Team Sync" has been scheduled for tomorrow at 5:00 PM. I\'ve added it to your Google Calendar. Would you like me to send an email invite to the team?',
    action: "calendar_event_created",
  },
]

export function DemoPreview() {
  const [visibleMessages, setVisibleMessages] = useState<number>(0)
  const [displayedText, setDisplayedText] = useState("")
  const [isTyping, setIsTyping] = useState(false)

  useEffect(() => {
    const timer1 = setTimeout(() => setVisibleMessages(1), 800)
    const timer2 = setTimeout(() => {
      setIsTyping(true)
      setVisibleMessages(2)
    }, 2000)

    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
    }
  }, [])

  useEffect(() => {
    if (visibleMessages >= 2 && isTyping) {
      const fullText = demoMessages[1].text
      let i = 0
      const interval = setInterval(() => {
        setDisplayedText(fullText.substring(0, i + 1))
        i++
        if (i >= fullText.length) {
          clearInterval(interval)
          setIsTyping(false)
        }
      }, 20)
      return () => clearInterval(interval)
    }
  }, [visibleMessages, isTyping])

  return (
    <section className="relative py-24 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <Badge variant="outline" className="mb-4">
            Live Demo
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            See it in <span className="gradient-text">action</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Watch VaaniAI process a voice command through its multi-agent pipeline
            and execute a real calendar action.
          </p>
        </div>

        {/* Demo chat window */}
        <div className="relative mx-auto max-w-2xl">
          <div className="glass-strong rounded-2xl overflow-hidden shadow-2xl shadow-black/20">
            {/* Window header */}
            <div className="flex items-center gap-3 px-5 py-3 border-b border-border/50">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-foreground/15" />
                <div className="w-3 h-3 rounded-full bg-foreground/15" />
                <div className="w-3 h-3 rounded-full bg-foreground/15" />
              </div>
              <div className="flex-1 text-center">
                <span className="text-xs text-muted-foreground font-medium">
                  VaaniAI Dashboard
                </span>
              </div>
              <Mic className="size-3.5 text-muted-foreground" />
            </div>

            {/* Messages area */}
            <div className="p-5 space-y-4 min-h-[260px]">
              {/* User message */}
              {visibleMessages >= 1 && (
                <div className="flex items-start gap-3 justify-end animate-slide-in-right">
                  <div className="max-w-[80%]">
                    <div className="rounded-2xl rounded-tr-md bg-foreground/10 border border-foreground/10 px-4 py-3">
                      <p className="text-sm">{demoMessages[0].text}</p>
                    </div>
                  </div>
                  <Avatar className="size-8 shrink-0">
                    <AvatarFallback className="bg-foreground/5 text-foreground/70 text-xs">
                      <User className="size-4" />
                    </AvatarFallback>
                  </Avatar>
                </div>
              )}

              {/* AI message */}
              {visibleMessages >= 2 && (
                <div className="flex items-start gap-3 animate-slide-in-left">
                  <Avatar className="size-8 shrink-0">
                    <AvatarFallback className="bg-foreground/5 text-foreground/70 text-xs">
                      <Bot className="size-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="max-w-[80%]">
                    <div className="rounded-2xl rounded-tl-md bg-secondary border border-border/50 px-4 py-3">
                      <p className="text-sm">
                        {displayedText}
                        {isTyping && (
                          <span
                            className="inline-block w-0.5 h-4 bg-foreground ml-0.5 align-middle"
                            style={{ animation: "typing-cursor 1s steps(1) infinite" }}
                          />
                        )}
                      </p>
                      {!isTyping && displayedText.length > 0 && (
                        <Badge
                          variant="secondary"
                          className="mt-2 text-[10px] bg-foreground/5 text-foreground/60 border-foreground/10"
                        >
                          ✓ calendar_event_created
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Typing indicator */}
              {visibleMessages >= 1 && visibleMessages < 2 && (
                <div className="flex items-start gap-3 animate-fade-in">
                  <Avatar className="size-8 shrink-0">
                    <AvatarFallback className="bg-foreground/5 text-foreground/70 text-xs">
                      <Bot className="size-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="rounded-2xl bg-secondary border border-border/50 px-5 py-4">
                    <div className="flex gap-1.5">
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          className="w-2 h-2 rounded-full bg-muted-foreground/50"
                          style={{
                            animation: "bounce-dots 1.4s infinite ease-in-out both",
                            animationDelay: `${i * 0.16}s`,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom bar */}
            <div className="px-5 py-3 border-t border-border/50 flex items-center gap-3">
              <div className="flex-1 rounded-xl bg-muted/50 px-4 py-2.5">
                <span className="text-sm text-muted-foreground">
                  Speak or type a message...
                </span>
              </div>
              <div className="w-9 h-9 rounded-full bg-foreground/5 flex items-center justify-center">
                <Mic className="size-4 text-muted-foreground" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
