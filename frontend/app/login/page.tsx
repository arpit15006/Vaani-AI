"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getAuthUrl } from "@/lib/api"
import { ToastProvider, useToast } from "@/components/ui/toast"
import { LogIn, ArrowLeft } from "lucide-react"
import Link from "next/link"

function LoginContent() {
  const { addToast } = useToast()

  const handleLogin = async () => {
    try {
      const url = await getAuthUrl()
      window.location.href = url
    } catch {
      addToast({ description: "Failed to connect to authentication server. Is the backend running?", variant: "destructive" })
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      
      {/* Background decorations */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />

      <Link href="/" className="absolute top-8 left-8">
        <Button variant="ghost" className="text-muted-foreground">
          <ArrowLeft className="mr-2 size-4" /> Back to Home
        </Button>
      </Link>

      <Card className="w-full max-w-md border-border/50 glass-strong relative z-10 shadow-2xl">
        <CardHeader className="space-y-3 text-center pb-8">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-2">
            <span className="text-3xl font-bold text-primary">V</span>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Welcome back</CardTitle>
          <CardDescription className="text-sm">
            Sign in to access your AI assistant, personal memory, and workflow automation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            className="w-full py-6 text-base font-medium shadow-sm transition-all hover:shadow-md" 
            onClick={handleLogin}
          >
            <LogIn className="mr-2 size-5" />
            Continue with Google
          </Button>
          <p className="text-xs text-center text-muted-foreground pt-4 leading-relaxed px-4">
            By connecting, you allow VaaniAI to manage your calendar events and send emails on your behalf as explicitly requested.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export default function LoginPage() {
  return (
    <ToastProvider>
      <LoginContent />
    </ToastProvider>
  )
}
