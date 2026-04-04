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

      {/* Premium Background Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-primary/20 blur-[120px] mix-blend-normal opacity-70 animate-pulse-slow" />
        <div className="absolute top-[60%] -right-[10%] w-[40%] h-[60%] rounded-full bg-blue-500/10 blur-[120px] mix-blend-normal opacity-70 animate-pulse-slow delay-700" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-foreground/5 blur-[150px]" />
      </div>

      {/* Modern Radial Dot Grid */}
      <div
        className="absolute inset-0 opacity-[0.4] dark:opacity-[0.2]"
        style={{
          backgroundImage: "radial-gradient(circle at center, rgb(var(--foreground-rgb) / 0.15) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
          maskImage: "radial-gradient(ellipse at center, black 40%, transparent 80%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 40%, transparent 80%)",
        }}
      />

      <div className="relative z-10 max-w-5xl mx-auto text-center pt-10">
        {/* Premium Badge */}
        <div className="animate-fade-in-up inline-flex items-center gap-2 rounded-full border border-primary/20 bg-background/50 backdrop-blur-md px-4 py-1.5 text-sm font-medium text-foreground mb-8 shadow-sm ring-1 ring-inset ring-primary/10">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
          </span>
          Next-Gen AI Voice Assistant
        </div>

        {/* Title */}
        <h1 className="animate-fade-in-up text-5xl sm:text-7xl md:text-8xl font-extrabold tracking-tight mb-8">
          Meet{" "}
          <span className="text-foreground drop-shadow-sm pb-2">
            VaaniAI
          </span>
        </h1>

        {/* Subtitle */}
        <p className="animate-fade-in-up delay-100 text-xl sm:text-2xl text-muted-foreground/90 max-w-3xl mx-auto mb-12 leading-relaxed opacity-0 font-light">
          AI that doesn&apos;t just respond — it <span className="font-semibold text-foreground">executes</span>. Schedule meetings,
          send emails, and check live data through natural voice commands powered by
          autonomous multi-agent reasoning.
        </p>

        {/* CTA Buttons */}
        <div className="animate-fade-in-up delay-200 flex flex-col sm:flex-row gap-5 justify-center items-center opacity-0">
          <Link href="/dashboard">
            <Button size="lg" className="text-lg px-10 h-14 rounded-2xl shadow-xl shadow-primary/25 hover:shadow-primary/40 transition-all duration-300 hover:-translate-y-1 group">
              <Mic className="size-5 mr-2 group-hover:scale-110 transition-transform" />
              Try VaaniAI Now
            </Button>
          </Link>
          <a href="#features">
            <Button variant="outline" size="lg" className="text-lg px-8 h-14 rounded-2xl bg-background/50 backdrop-blur border-border/50 hover:bg-muted/50 transition-all duration-300">
              Explore Architecture
            </Button>
          </a>
        </div>

        {/* Floating Abstract Element */}
        <div className="animate-fade-in-up delay-300 mt-20 opacity-0 flex justify-center">
          <div className="relative w-full max-w-2xl h-[2px] bg-gradient-to-r from-transparent via-primary/30 to-transparent">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-background rounded-full border border-primary/20 flex items-center justify-center shadow-[0_0_30px_rgba(var(--primary-rgb),0.3)]">
               <Mic className="size-5 text-primary animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
