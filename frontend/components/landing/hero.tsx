"use client"

import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import Link from "next/link"
import { Mic } from "lucide-react"

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden px-4">
      {/* Theme toggle */}
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>
      {/* Background gradient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-80 h-80 rounded-full bg-foreground/5 blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-foreground/5 blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-foreground/3 blur-[100px]" />
      </div>

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(oklch(0.985 0 0) 1px, transparent 1px), linear-gradient(90deg, oklch(0.985 0 0) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative z-10 max-w-4xl mx-auto text-center">
        {/* Badge */}
        <div className="animate-fade-in-up inline-flex items-center gap-2 rounded-full border border-foreground/10 bg-foreground/5 px-4 py-1.5 text-sm text-foreground/80 mb-8">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-foreground/80 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-foreground/80"></span>
          </span>
          AI-Powered Voice Assistant
        </div>

        {/* Title */}
        <h1 className="animate-fade-in-up text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-6">
          Meet{" "}
          <span className="gradient-text">VaaniAI</span>
        </h1>

        {/* Subtitle */}
        <p className="animate-fade-in-up delay-100 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed opacity-0">
          AI that doesn&apos;t just respond — it{" "}
          <span className="text-foreground font-medium">executes</span>. Schedule meetings,
          send emails, get weather updates — all through natural voice commands powered by
          multi-agent reasoning.
        </p>

        {/* CTA Buttons */}
        <div className="animate-fade-in-up delay-200 flex flex-col sm:flex-row gap-4 justify-center items-center opacity-0">
          <Link href="/dashboard">
            <Button size="lg" className="text-base px-8 h-12 rounded-xl animate-glow">
              <Mic className="size-5 mr-2" data-icon="inline-start" />
              Try VaaniAI Now
            </Button>
          </Link>
          <a href="#features">
            <Button variant="outline" size="lg" className="text-base px-8 h-12 rounded-xl">
              See Features
            </Button>
          </a>
        </div>

        {/* Floating mic icon */}
        <div className="animate-fade-in-up delay-300 mt-16 opacity-0">
          <div className="relative inline-flex items-center justify-center">
            <div className="absolute w-24 h-24 rounded-full bg-foreground/5 animate-pulse-ring" />
            <div className="absolute w-32 h-32 rounded-full bg-foreground/3 animate-pulse-ring delay-500" />
            <div className="relative w-16 h-16 rounded-full bg-foreground/10 flex items-center justify-center animate-float">
              <Mic className="size-7 text-foreground/70" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
