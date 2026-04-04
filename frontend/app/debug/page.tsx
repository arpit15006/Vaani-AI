"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import {
  ArrowLeft,
  LogIn,
  Calendar,
  Mail,
  Cloud,
  Brain,
  CheckCircle2,
  XCircle,
  Loader2,
  Send,
} from "lucide-react"
import Link from "next/link"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001"

interface TestResult {
  loading: boolean
  data: Record<string, unknown> | null
  error: string | null
}

export default function DebugPage() {
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [systemStatus, setSystemStatus] = useState<Record<string, unknown> | null>(null)
  const [calendarResult, setCalendarResult] = useState<TestResult>({ loading: false, data: null, error: null })
  const [emailResult, setEmailResult] = useState<TestResult>({ loading: false, data: null, error: null })
  const [weatherResult, setWeatherResult] = useState<TestResult>({ loading: false, data: null, error: null })
  const [chatResult, setChatResult] = useState<TestResult>({ loading: false, data: null, error: null })
  const [chatInput, setChatInput] = useState("What is the weather in Mumbai?")

  useEffect(() => {
    // Load stored token
    const token = localStorage.getItem("vaaniai_access_token")
    const email = localStorage.getItem("vaaniai_user_email")
    if (token) setAccessToken(token)
    if (email) setUserEmail(email)

    // Handle redirect callback
    const params = new URLSearchParams(window.location.search)
    const tokenFromUrl = params.get("access_token")
    if (tokenFromUrl) {
      localStorage.setItem("vaaniai_access_token", tokenFromUrl)
      setAccessToken(tokenFromUrl)
      const emailFromUrl = params.get("email")
      if (emailFromUrl) {
        localStorage.setItem("vaaniai_user_email", emailFromUrl)
        setUserEmail(emailFromUrl)
      }
      window.history.replaceState({}, "", "/debug")
    }

    // Fetch system status
    fetchStatus()
  }, [])

  const fetchStatus = async () => {
    try {
      const res = await fetch(`${API_URL}/api/test/status`)
      const data = await res.json()
      setSystemStatus(data)
    } catch {
      setSystemStatus({ error: "Backend not running" })
    }
  }

  const handleLogin = () => {
    window.location.href = `${API_URL}/api/auth/google`
  }

  const handleLogout = () => {
    localStorage.removeItem("vaaniai_access_token")
    localStorage.removeItem("vaaniai_user_email")
    setAccessToken(null)
    setUserEmail(null)
  }

  const testCalendar = async () => {
    setCalendarResult({ loading: true, data: null, error: null })
    try {
      const url = accessToken
        ? `${API_URL}/api/test/calendar?token=${accessToken}`
        : `${API_URL}/api/test/calendar`
      const res = await fetch(url)
      const data = await res.json()
      setCalendarResult({ loading: false, data, error: data.success ? null : data.error })
    } catch (e) {
      setCalendarResult({ loading: false, data: null, error: (e as Error).message })
    }
  }

  const testEmail = async () => {
    setEmailResult({ loading: true, data: null, error: null })
    try {
      const url = accessToken
        ? `${API_URL}/api/test/email?token=${accessToken}`
        : `${API_URL}/api/test/email`
      const res = await fetch(url)
      const data = await res.json()
      setEmailResult({ loading: false, data, error: data.success ? null : data.error })
    } catch (e) {
      setEmailResult({ loading: false, data: null, error: (e as Error).message })
    }
  }

  const testWeather = async () => {
    setWeatherResult({ loading: true, data: null, error: null })
    try {
      const res = await fetch(`${API_URL}/api/test/weather?city=Delhi`)
      const data = await res.json()
      setWeatherResult({ loading: false, data, error: data.success ? null : data.error })
    } catch (e) {
      setWeatherResult({ loading: false, data: null, error: (e as Error).message })
    }
  }

  const testChat = async () => {
    if (!chatInput.trim()) return
    setChatResult({ loading: true, data: null, error: null })
    try {
      const res = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ message: chatInput, history: [] }),
      })
      const data = await res.json()
      setChatResult({ loading: false, data, error: null })
    } catch (e) {
      setChatResult({ loading: false, data: null, error: (e as Error).message })
    }
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <Button variant="ghost" size="icon-sm">
                <ArrowLeft className="size-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">VaaniAI Debug Panel</h1>
              <p className="text-sm text-muted-foreground">End-to-end integration testing</p>
            </div>
          </div>
          <ThemeToggle />
        </div>

        {/* System Status */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">System Status</CardTitle>
          </CardHeader>
          <CardContent>
            {systemStatus ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {Object.entries(systemStatus).filter(([k]) => k !== "timestamp" && k !== "system").map(([key, value]) => (
                  <div key={key} className="flex items-center gap-2">
                    {value === true ? (
                      <CheckCircle2 className="size-4 text-emerald-500" />
                    ) : value === false ? (
                      <XCircle className="size-4 text-red-500" />
                    ) : (
                      <div className="size-4" />
                    )}
                    <span className="text-sm">{key}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Loading...</p>
            )}
          </CardContent>
        </Card>

        {/* Auth */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <LogIn className="size-4" />
              Authentication
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <Badge variant={accessToken ? "default" : "secondary"}>
                {accessToken ? "Authenticated" : "Not Authenticated"}
              </Badge>
              {userEmail && <span className="text-sm text-muted-foreground">{userEmail}</span>}
            </div>
            <div className="flex gap-2">
              {!accessToken ? (
                <Button onClick={handleLogin} className="gap-2">
                  <LogIn className="size-4" />
                  Login with Google
                </Button>
              ) : (
                <Button variant="outline" onClick={handleLogout} className="gap-2">
                  Disconnect
                </Button>
              )}
            </div>
            {accessToken && (
              <details className="text-xs">
                <summary className="cursor-pointer text-muted-foreground">Token (click to view)</summary>
                <code className="block mt-1 p-2 bg-muted rounded text-[10px] break-all">{accessToken}</code>
              </details>
            )}
          </CardContent>
        </Card>

        {/* Test Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Calendar Test */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="size-4" />
                Calendar
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">Creates &quot;VaaniAI Test Event&quot; tomorrow at 5 PM</p>
              <Button onClick={testCalendar} disabled={calendarResult.loading} className="w-full gap-2">
                {calendarResult.loading ? <Loader2 className="size-4 animate-spin" /> : <Calendar className="size-4" />}
                Test Calendar
              </Button>
              <ResultDisplay result={calendarResult} />
            </CardContent>
          </Card>

          {/* Email Test */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Mail className="size-4" />
                Email
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">Sends test email to your Google account</p>
              <Button onClick={testEmail} disabled={emailResult.loading} className="w-full gap-2">
                {emailResult.loading ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
                Test Email
              </Button>
              <ResultDisplay result={emailResult} />
            </CardContent>
          </Card>

          {/* Weather Test */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Cloud className="size-4" />
                Weather
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">Fetches real weather for Delhi</p>
              <Button onClick={testWeather} disabled={weatherResult.loading} className="w-full gap-2">
                {weatherResult.loading ? <Loader2 className="size-4 animate-spin" /> : <Cloud className="size-4" />}
                Test Weather
              </Button>
              <ResultDisplay result={weatherResult} />
            </CardContent>
          </Card>
        </div>

        {/* AI Chat Test */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Brain className="size-4" />
              AI Chat (Multi-Agent Pipeline)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && testChat()}
                className="flex-1 px-3 py-2 text-sm rounded-lg border border-input bg-background"
                placeholder="Type a message to test AI..."
              />
              <Button onClick={testChat} disabled={chatResult.loading} className="gap-2">
                {chatResult.loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                Ask AI
              </Button>
            </div>

            {chatResult.data && (
              <div className="space-y-3">
                {/* Reply */}
                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Reply:</p>
                  <p className="text-sm">{(chatResult.data as { reply?: string }).reply}</p>
                </div>

                {/* Agent Trace */}
                {(chatResult.data as { agentTrace?: Record<string, unknown> }).agentTrace && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Agent Trace:</p>
                    {Object.entries(
                      (chatResult.data as { agentTrace: Record<string, unknown> }).agentTrace
                    ).map(([agent, trace]) => (
                      <details key={agent} className="border border-border rounded-lg">
                        <summary className="px-3 py-2 text-sm font-medium cursor-pointer hover:bg-muted/50 rounded-lg">
                          {agent}
                          {typeof trace === "object" && trace !== null && "durationMs" in trace && (
                            <Badge variant="secondary" className="ml-2 text-[10px]">
                              {String((trace as { durationMs: number }).durationMs)}ms
                            </Badge>
                          )}
                        </summary>
                        <pre className="px-3 pb-3 text-[11px] text-muted-foreground overflow-x-auto">
                          {JSON.stringify(trace, null, 2)}
                        </pre>
                      </details>
                    ))}
                  </div>
                )}
              </div>
            )}

            {chatResult.error && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                {chatResult.error}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground pb-8">
          VaaniAI Debug Panel — All API calls are real (no mocks)
        </p>
      </div>
    </div>
  )
}

function ResultDisplay({ result }: { result: TestResult }) {
  if (!result.data && !result.error) return null

  if (result.error) {
    return (
      <div className="p-2 rounded-lg bg-destructive/10 text-destructive text-xs">
        ✗ {result.error}
      </div>
    )
  }

  if (result.data) {
    const success = (result.data as { success?: boolean }).success
    return (
      <div className={`p-2 rounded-lg text-xs ${success ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-destructive/10 text-destructive"}`}>
        {success ? "✓ " : "✗ "}
        {(result.data as { message?: string }).message || JSON.stringify(result.data)}
      </div>
    )
  }

  return null
}
