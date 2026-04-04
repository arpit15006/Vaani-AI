"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Mic, Brain, Plug, Calendar, Mail, Cloud } from "lucide-react"

const features = [
  {
    icon: Mic,
    title: "Voice Interface",
    description:
      "Speak naturally and VaaniAI understands. Real-time speech recognition with continuous conversation support.",
    badge: "Core",
  },
  {
    icon: Brain,
    title: "Multi-Agent Reasoning",
    description:
      "Planner → Tool Router → Executor → Critic pipeline. Each agent specializes in its task for intelligent responses.",
    badge: "AI Engine",
  },
  {
    icon: Plug,
    title: "Real Integrations",
    description:
      "Not just talk — action. Create Google Calendar events, send Gmail emails, get weather updates. All real APIs.",
    badge: "Live APIs",
  },
]

const integrations = [
  { icon: Calendar, label: "Google Calendar" },
  { icon: Mail, label: "Gmail" },
  { icon: Cloud, label: "Weather" },
]

export function Features() {
  return (
    <section id="features" className="relative py-24 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4">
            Features
          </Badge>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Intelligence meets <span className="gradient-text">execution</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            VaaniAI combines voice understanding, multi-agent AI reasoning, and real-world
            API integrations into one seamless experience.
          </p>
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {features.map((feature, index) => (
            <Card
              key={feature.title}
              className="group relative overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm hover:border-foreground/20 transition-all duration-300 hover:-translate-y-1"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="absolute inset-0 bg-foreground/[0.02] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <CardContent className="relative p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-foreground/5 flex items-center justify-center">
                    <feature.icon className="size-5 text-foreground/70" />
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {feature.badge}
                  </Badge>
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Integration pills */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-4">Powered by real integrations</p>
          <div className="flex flex-wrap justify-center gap-3">
            {integrations.map((item) => (
              <div
                key={item.label}
                className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-card/30 px-4 py-2 text-sm"
              >
                <item.icon className="size-4 text-muted-foreground" />
                {item.label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
