"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ToastProvider, useToast } from "@/components/ui/toast"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { ChatContainer } from "@/components/chat/chat-container"
import { ChatInput } from "@/components/chat/chat-input"
import { MicButton } from "@/components/chat/mic-button"
import { StopButton } from "@/components/chat/stop-button"
import { StatusIndicator, type Status } from "@/components/chat/status-indicator"
import { type Message } from "@/components/chat/message-bubble"
import { useSpeechRecognition } from "@/hooks/use-speech-recognition"
import { useSpeechSynthesis } from "@/hooks/use-speech-synthesis"
import { sendMessage, getAuthUrl, getAuthRedirectUrl, exchangeCode, getConversationMessages } from "@/lib/api"
import { Sidebar } from "@/components/dashboard/sidebar"
import { ConversationList } from "@/components/dashboard/conversation-list"
import { ActionHistoryPanel } from "@/components/dashboard/action-history"
import { MemoryPanel } from "@/components/dashboard/memory-panel"
import { AnalyticsPanel } from "@/components/dashboard/analytics-panel"
import { SettingsPanel } from "@/components/dashboard/settings-panel"
import {
  Menu,
  LogIn,
  LogOut,
  User,
  Settings,
  Shield,
  MessageSquarePlus,
  Radio
} from "lucide-react"

function DashboardContent() {
  const [messages, setMessages] = useState<Message[]>([])
  const [status, setStatus] = useState<Status>("idle")
  const [isLoading, setIsLoading] = useState(false)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [wakeWordEnabled, setWakeWordEnabled] = useState(false)
  const [ttsEnabled, setTtsEnabled] = useState(true)
  const [proactiveEnabled, setProactiveEnabled] = useState(true)
  const [sseConnected, setSseConnected] = useState(false)
  
  // Dashboard UI State
  const [activeTab, setActiveTab] = useState("chat")
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [currentConversationTitle, setCurrentConversationTitle] = useState("New Conversation")
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const { addToast } = useToast()
  
  // Create these refs to avoid stale closures in callbacks
  const messagesRef = useRef(messages)
  messagesRef.current = messages

  const stt = useSpeechRecognition({
    continuous: wakeWordEnabled,
    wakeWord: wakeWordEnabled ? "hey vaani" : undefined,
    onWakeWordDetected: () => {
      addToast({ description: "Wake word detected. Recording...", variant: "default" })
    }
  })
  
  const tts = useSpeechSynthesis()
  const prevTranscriptRef = useRef("")

  // Load auth state
  useEffect(() => {
    const token = localStorage.getItem("vaaniai_access_token")
    const email = localStorage.getItem("vaaniai_user_email")
    if (token) {
      setAccessToken(token)
      setIsAuthenticated(true)
      if (email) setUserEmail(email)
    }

    setWakeWordEnabled(localStorage.getItem("vaaniai_wakeword") === "true")
    setTtsEnabled(localStorage.getItem("vaaniai_voice") !== "false")
    setProactiveEnabled(localStorage.getItem("vaaniai_proactive") !== "false")
  }, [])

  // Handle OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)

    const tokenFromUrl = params.get("access_token")
    if (tokenFromUrl) {
      localStorage.setItem("vaaniai_access_token", tokenFromUrl)
      const email = params.get("email")
      if (email) {
        localStorage.setItem("vaaniai_user_email", email)
        setUserEmail(email)
      }
      setAccessToken(tokenFromUrl)
      setIsAuthenticated(true)
      addToast({ description: "Google account connected!", variant: "success" })
      window.history.replaceState({}, "", "/dashboard")
      return
    }

    if (params.get("auth_error")) {
      addToast({ description: "Failed to connect Google account", variant: "destructive" })
      window.history.replaceState({}, "", "/dashboard")
      return
    }

    const code = params.get("code")
    if (code) {
      exchangeCode(code)
        .then((tokens) => {
          localStorage.setItem("vaaniai_access_token", tokens.access_token)
          setAccessToken(tokens.access_token)
          setIsAuthenticated(true)
          addToast({ description: "Google account connected!", variant: "success" })
          window.history.replaceState({}, "", "/dashboard")
        })
        .catch(() => {
          addToast({ description: "Failed to connect Google account", variant: "destructive" })
        })
    }
  }, [addToast])

  // Handle STT
  useEffect(() => {
    if (!stt.isListening && stt.transcript && stt.transcript !== prevTranscriptRef.current) {
      prevTranscriptRef.current = stt.transcript
      handleSend(stt.transcript)
    }
  }, [stt.isListening, stt.transcript])

  // ==========================================
  // PROACTIVE AGENT (PHASE 4) SSE PIPELINE
  // ==========================================
  useEffect(() => {
    if (!isAuthenticated || !accessToken) return;

    let eventSource: EventSource | null = null;
    let reconnectTimer: NodeJS.Timeout;

    const connectSSE = () => {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
      const emailQuery = userEmail ? `&email=${encodeURIComponent(userEmail)}` : '';
      
      eventSource = new EventSource(`${apiUrl}/api/notifications/stream?token=${accessToken}${emailQuery}&tz=${tz}`);

      eventSource.onopen = () => {
        console.log("🤖 [Proactive AI] Connected to Vaani engine");
        setSseConnected(true);
      };

      eventSource.onmessage = (event) => {
        try {
          // Keep-alive checks
          if (event.data === ":") return; 

          const data = JSON.parse(event.data);
          
          if (data.type === "proactive_alert") {
             // 1. Non-voice visual fallback (always show)
             addToast({ 
               title: "✦ Vaani Alert", 
               description: data.message, 
               variant: "default"
             });
             
             // 2. Interrupt Control & Voice (Respect user settings)
             if (proactiveEnabled && ttsEnabled) {
                tts.speak(data.message);
             }
          }
        } catch (e) {
           console.error("[SSE] Parse error", e);
        }
      };

      eventSource.onerror = () => {
        console.warn("🤖 [Proactive AI] Connection lost. Reconnecting in 10s...");
        setSseConnected(false);
        if (eventSource) eventSource.close();
        reconnectTimer = setTimeout(connectSSE, 10000);
      };
    };

    connectSSE();

    return () => {
      if (eventSource) eventSource.close();
      clearTimeout(reconnectTimer);
    };
  }, [isAuthenticated, accessToken, userEmail, proactiveEnabled, ttsEnabled, tts.speak, addToast]);
  // ==========================================

  // Status management
  useEffect(() => {
    if (stt.isListening) setStatus("listening")
    else if (isLoading) setStatus("thinking")
    else if (tts.isSpeaking) setStatus("speaking")
    else setStatus("idle")
  }, [stt.isListening, isLoading, tts.isSpeaking])

  // Orchestrate STT lifecycle dynamically for Continuous Listening
  useEffect(() => {
    if (isLoading || tts.isSpeaking) {
      if (stt.isListening) stt.stopListening()
      return
    }

    if (!isLoading && !tts.isSpeaking && wakeWordEnabled && !stt.isListening && stt.isSupported) {
      const startTimer = setTimeout(() => {
         stt.startListening()
      }, 500)
      return () => clearTimeout(startTimer)
    }
  }, [isLoading, tts.isSpeaking, wakeWordEnabled, stt.isListening, stt.isSupported, stt.startListening, stt.stopListening])

  const loadConversation = async (id: string, title: string) => {
    if (!accessToken) return
    setIsLoading(true)
    try {
      const msgs = await getConversationMessages(id, accessToken, userEmail)
      setMessages(msgs.map((m: any, i: number) => ({
        id: `hist_${i}`,
        role: m.role,
        content: m.content,
        action: m.action,
        agentTrace: m.agent_trace,
        timestamp: new Date(m.created_at || Date.now())
      })))
      setCurrentConversationTitle(title)
      setCurrentConversationId(id)
      setActiveTab("chat")
      if (window.innerWidth < 768) setIsSidebarOpen(false)
    } catch {
      addToast({ description: "Failed to load conversation", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  const startNewConversation = () => {
    setMessages([])
    setCurrentConversationTitle("New Conversation")
    setCurrentConversationId(null)
    setActiveTab("chat")
    if (window.innerWidth < 768) setIsSidebarOpen(false)
  }

  const handleSend = useCallback(
    async (text: string) => {
      const userMessage: Message = {
        id: Date.now().toString(),
        role: "user",
        content: text,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, userMessage])
      setIsLoading(true)
      setStatus("thinking")

      try {
        const historyList = messagesRef.current.slice(-10).map((m: any) => ({ 
          role: m.role, 
          content: m.agentTrace?.executor?.rawContext 
            ? `${m.content}\n\n[SYSTEM: Data from this turn: ${m.agentTrace.executor.rawContext}]` 
            : m.content as string 
        }))
        const response = await sendMessage(
          text, 
          historyList as any, 
          accessToken, 
          userEmail,
          (liveStatus) => { setStatus(liveStatus) }
        )

        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: response.reply,
          action: response.action,
          agentTrace: response.agentTrace as any,
          suggestions: response.suggestions,
          isTyping: true,
          timestamp: new Date(),
        }

        // If this was the first message in a new conversation, refresh the sidebar
        if (!currentConversationId && response.conversationId) {
          setCurrentConversationId(response.conversationId)
          setRefreshTrigger(prev => prev + 1)
        }

        setMessages((prev) => [...prev, aiMessage])
        setIsLoading(false)

        const typingDuration = response.reply.length * 18 + 200
        setTimeout(() => {
          setMessages((prev) => prev.map((m) => (m.id === aiMessage.id ? { ...m, isTyping: false } : m)))
          if (ttsEnabled) {
             tts.speak(response.reply)
          }
        }, typingDuration)
      } catch (error: unknown) {
        setIsLoading(false)
        const errMsg = error instanceof Error ? error.message : "Something went wrong"
        addToast({ description: errMsg, variant: "destructive" })
        setMessages((prev) => [...prev, { id: Date.now().toString(), role: "assistant", content: errMsg, timestamp: new Date() }])
      }
    },
    [accessToken, userEmail, messages, tts, addToast]
  )

  const handleMicToggle = () => {
    if (!stt.isSupported) {
      addToast({ description: "Voice input not supported", variant: "destructive" })
      return
    }
    if (stt.isListening) stt.stopListening()
    else { tts.stop(); stt.startListening() }
  }

  const handleStop = () => { tts.stop(); stt.stopListening() }

  const handleLogin = () => {
    window.location.href = getAuthRedirectUrl()
  }

  const handleLogout = () => {
    localStorage.removeItem("vaaniai_access_token")
    localStorage.removeItem("vaaniai_user_email")
    setAccessToken(null)
    setUserEmail(null)
    setIsAuthenticated(false)
    addToast({ description: "Disconnected", variant: "default" })
  }

  // ==== MAIN RENDER ====
  return (
    <div className="flex h-screen bg-background overflow-hidden relative">
      
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        
        {/* Header */}
        <header className="shrink-0 flex items-center justify-between px-4 h-14 border-b border-border/50 glass-strong">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setIsSidebarOpen(true)}>
              <Menu className="size-5" />
            </Button>
            <div className="flex flex-col">
              <h1 className="text-sm font-semibold truncate max-w-[200px] sm:max-w-xs">
                {activeTab === 'chat' ? currentConversationTitle : 
                 activeTab === 'history' ? 'Conversations' : 
                 activeTab === 'memory' ? 'User Memory' : 
                 activeTab === 'actions' ? 'Action History' : 
                 activeTab === 'analytics' ? 'Analytics' : 'Settings'}
              </h1>
              {userEmail && <p className="text-[10px] text-muted-foreground">{userEmail}</p>}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAuthenticated && proactiveEnabled && (
               <div className="flex items-center gap-1.5 px-2 py-1 bg-muted/50 rounded-full border border-border/50">
                 <Radio className={`size-3 ${sseConnected ? "text-blue-400 animate-pulse" : "text-muted-foreground"}`} />
                 <span className="text-[10px] uppercase font-bold tracking-wider opacity-70">
                   {sseConnected ? "Active" : "Connecting"}
                 </span>
               </div>
            )}
            <StatusIndicator status={status} />
            <ThemeToggle />

            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md p-1 hover:bg-muted transition-colors">
                <Avatar className="size-7">
                  <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">
                    {isAuthenticated ? userEmail?.charAt(0).toUpperCase() : <User className="size-3.5" />}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {isAuthenticated ? (
                    <>
                      <DropdownMenuItem disabled>
                        <Shield className="size-4 mr-2 text-green-500" />
                        Connected
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleLogout}>
                        <LogOut className="size-4 mr-2" />
                        Disconnect
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <DropdownMenuItem onClick={handleLogin}>
                      <LogIn className="size-4 mr-2" />
                      Connect Google
                    </DropdownMenuItem>
                  )}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Dynamic Content Body */}
        <main className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
          {!isAuthenticated && activeTab === 'chat' ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-background/50 z-50">
              <div className="max-w-md w-full text-center space-y-6 bg-card border border-border/50 p-8 rounded-[2rem] shadow-2xl">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2 relative">
                  <div className="absolute inset-0 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                  <Shield className="size-8 text-primary relative z-10" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold tracking-tight mb-2">Authentication Required</h2>
                  <p className="text-muted-foreground leading-relaxed text-sm">
                    Please connect your Google account to authorize VaaniAI to safely access your calendar, send emails, and contextually build your personal memory.
                  </p>
                </div>
                <Button size="lg" className="w-full text-base h-14 rounded-2xl shadow-lg shadow-primary/20 hover:-translate-y-1 transition-all duration-300" onClick={handleLogin}>
                  <LogIn className="size-5 mr-2" />
                  Login with Google
                </Button>
              </div>
            </div>
          ) : !isAuthenticated && activeTab !== 'chat' ? (
            <div className="absolute inset-0 overflow-y-auto p-4 sm:p-6 lg:p-8 flex items-start justify-center pt-20">
              <div className="max-w-3xl w-full border border-dashed rounded-xl p-12 text-center bg-card/10">
                <h3 className="text-lg font-medium mb-2 text-foreground">Connect your account</h3>
                <p className="text-sm text-muted-foreground">
                  Sign in with Google to view your {
                    activeTab === 'history' ? 'conversations' :
                    activeTab === 'actions' ? 'action history' :
                    activeTab === 'analytics' ? 'analytics metrics' :
                    activeTab === 'memory' ? 'personal memory' : 'settings'
                  }.
                </p>
              </div>
            </div>
          ) : (
            <>
              {activeTab === 'chat' && (
                <div className="absolute inset-0 overflow-hidden bg-background">
                  {messages.length > 0 && (
                     <div className="absolute top-4 right-4 z-20 hidden md:block">
                       <Button variant="outline" size="sm" onClick={startNewConversation} className="shadow-md glass hover:bg-white/5 border-border/50 transition-all rounded-full px-4">
                         <MessageSquarePlus className="size-4 mr-2" /> New Chat
                       </Button>
                     </div>
                  )}
                  
                  <div className="absolute inset-0 overflow-hidden">
                    <ChatContainer messages={messages} isLoading={isLoading} onSuggestionClick={handleSend} />
                  </div>
                  
                  {/* Gradient fade mask - prevents text from showing behind input */}
                  <div className="absolute bottom-0 left-0 right-0 h-44 z-30 pointer-events-none bg-gradient-to-t from-background via-background/95 to-transparent" />
                  
                  {/* Floating chat input */}
                  <div className="absolute bottom-6 left-0 right-0 px-4 z-40 pointer-events-none">
                    <div className="max-w-3xl mx-auto pointer-events-auto">
                      <div className="bg-card rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.5)] border border-border/30 p-2 sm:p-3 relative overflow-hidden">
                        <div className="relative flex items-end gap-2 sm:gap-3">
                          <MicButton isListening={stt.isListening} onClick={handleMicToggle} disabled={isLoading} />
                          <div className="flex-1">
                            <ChatInput onSend={handleSend} disabled={isLoading || stt.isListening} />
                          </div>
                          <StopButton onClick={handleStop} visible={tts.isSpeaking || stt.isListening} />
                        </div>
                      </div>
                      <div className="text-center mt-3">
                        <p className="text-[10px] text-muted-foreground/60 tracking-wide uppercase font-medium">
                          VaaniAI can make mistakes. Verify critical actions.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'history' && (
                <div className="absolute inset-0 overflow-y-auto p-4 sm:p-6 lg:p-8">
                  <div className="max-w-4xl mx-auto">
                    <ConversationList 
                      key={refreshTrigger} 
                      token={accessToken} 
                      email={userEmail} 
                      onSelectConversation={loadConversation} 
                    />
                  </div>
                </div>
              )}

              {activeTab === 'actions' && (
                <div className="absolute inset-0 overflow-y-auto p-4 sm:p-6 lg:p-8">
                  <div className="max-w-4xl mx-auto">
                     <ActionHistoryPanel token={accessToken} email={userEmail} />
                  </div>
                </div>
              )}

              {activeTab === 'analytics' && (
                <div className="absolute inset-0 overflow-y-auto p-4 sm:p-6 lg:p-8">
                  <div className="max-w-4xl mx-auto">
                     <AnalyticsPanel token={accessToken} email={userEmail} />
                  </div>
                </div>
              )}

              {activeTab === 'memory' && (
                <div className="absolute inset-0 overflow-y-auto p-4 sm:p-6 lg:p-8">
                  <div className="max-w-6xl mx-auto">
                     <MemoryPanel token={accessToken} email={userEmail} />
                  </div>
                </div>
              )}

              {activeTab === 'settings' && (
                <div className="absolute inset-0 overflow-y-auto p-4 sm:p-6 lg:p-8">
                  <div className="max-w-3xl mx-auto">
                     <SettingsPanel token={accessToken} email={userEmail} />
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <ToastProvider>
      <DashboardContent />
    </ToastProvider>
  )
}
