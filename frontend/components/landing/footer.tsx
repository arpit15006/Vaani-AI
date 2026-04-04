import { Mic } from "lucide-react"

export function Footer() {
  return (
    <footer className="relative border-t border-border/50 py-12 px-4">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-foreground/5 flex items-center justify-center">
            <Mic className="size-4 text-foreground/60" />
          </div>
          <span className="font-semibold text-lg">VaaniAI</span>
        </div>

        <p className="text-sm text-muted-foreground text-center">
          Built with Next.js, Gemini AI, and Multi-Agent Architecture
        </p>

        <div className="flex items-center gap-6 text-sm text-muted-foreground">
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            GitHub
          </a>
          <a href="#features" className="hover:text-foreground transition-colors">
            Features
          </a>
        </div>
      </div>
    </footer>
  )
}
