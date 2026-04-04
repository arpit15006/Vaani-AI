import { Mic } from "lucide-react"

export function Footer() {
  return (
    <footer className="relative border-t border-border/50 py-12 px-4">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex flex-col items-center md:items-start gap-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-foreground/5 flex items-center justify-center">
              <Mic className="size-4 text-foreground/60" />
            </div>
            <span className="font-semibold text-lg">VaaniAI</span>
          </div>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Designed and Engineered fully by Arpit Patel
          </p>
        </div>

        <p className="text-sm text-muted-foreground text-center flex-1">
          Built with Next.js, Node.js, Groq LLaMA 3.3, and Supabase
        </p>

        <div className="flex items-center gap-6 text-sm text-muted-foreground">
          <a
            href="https://github.com/arpit15006/Vaani-AI"
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
