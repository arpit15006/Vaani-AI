const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001"

export interface ChatResponse {
  reply: string
  action?: string
  suggestions?: string[]
  conversationId?: string
  agentTrace?: {
    planner?: { thinking: string; steps?: string[]; durationMs: number }
    toolRouter?: { decision: string; toolName: string | null; confidence: number; reason: string; durationMs: number }
    executor?: { thinking: string; toolCalled: string | null; result: string; durationMs: number }
    critic?: { thinking: string; refinement: string; durationMs: number }
    totalDurationMs?: number
  }
}

export interface ChatHistoryItem {
  role: "user" | "assistant"
  content: string
}

export interface Conversation {
  id: string
  title: string
  created_at: string
  updated_at: string
}

export interface UserMemory {
  id: string
  category: "preference" | "fact" | "habit"
  key: string
  value: string
}

export interface ActionLog {
  id: string
  action_type: string
  tool_name: string
  input_summary: string
  result_summary: string
  success: boolean
  created_at: string
}

// ==== CHAT API ====
export async function sendMessage(
  message: string,
  history: ChatHistoryItem[],
  accessToken?: string | null,
  userEmail?: string | null,
  onStatusUpdate?: (status: string) => void
): Promise<ChatResponse> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 60000) // Extended to 60s for agent loops

    const headers: Record<string, string> = { "Content-Type": "application/json" }
    if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`
    if (userEmail) headers["x-user-email"] = userEmail

    const res = await fetch(`${API_URL}/api/chat`, {
      method: "POST",
      headers,
      body: JSON.stringify({ message, history }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (res.status === 429) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || "Too many requests. Please slow down.")
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || "Something went wrong")
    }

    // Handle NDJSON stream
    if (!res.body) throw new Error("No response body")
    
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ""
    let finalPayload: ChatResponse | null = null

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      
      const lines = buffer.split("\n")
      // The last element is either an empty string (if it ended with \n) or incomplete JSON
      buffer = lines.pop() || ""

      for (const line of lines) {
        if (!line.trim()) continue
        try {
          const data = JSON.parse(line)
          if (data.type === "status" && onStatusUpdate) {
            onStatusUpdate(data.message)
          } else if (data.type === "result") {
            finalPayload = data.payload
          }
        } catch (e) {
          console.error("Failed to parse stream chunk:", line, e)
        }
      }
    }

    if (!finalPayload) {
      throw new Error("Failed to receive complete response")
    }

    return finalPayload
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Request timed out. Please try again.")
    }
    throw error
  }
}

// ==== USER API (Requires Auth) ====

async function fetchWithAuth(url: string, method = "GET", accessToken: string | null, userEmail: string | null) {
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`
  if (userEmail) headers["x-user-email"] = userEmail

  const res = await fetch(`${API_URL}${url}`, { method, headers })
  if (!res.ok) throw new Error(`API Error: ${res.statusText}`)
  return await res.json()
}

export async function getConversations(token: string | null, email: string | null): Promise<Conversation[]> {
  return fetchWithAuth("/api/user/conversations", "GET", token, email)
}

export async function getConversationMessages(id: string, token: string | null, email: string | null): Promise<ChatHistoryItem[]> {
  return fetchWithAuth(`/api/user/conversations/${id}/messages`, "GET", token, email)
}

export async function deleteConversation(id: string, token: string | null, email: string | null): Promise<void> {
  await fetchWithAuth(`/api/user/conversations/${id}`, "DELETE", token, email)
}

export async function getMemories(token: string | null, email: string | null): Promise<UserMemory[]> {
  return fetchWithAuth("/api/user/memory", "GET", token, email)
}

export async function deleteMemory(id: string, token: string | null, email: string | null): Promise<void> {
  await fetchWithAuth(`/api/user/memory/${id}`, "DELETE", token, email)
}

export async function clearAllMemory(token: string | null, email: string | null): Promise<void> {
  await fetchWithAuth(`/api/user/memory/all`, "DELETE", token, email)
}

export async function getActionHistory(token: string | null, email: string | null): Promise<ActionLog[]> {
  return fetchWithAuth("/api/user/actions", "GET", token, email)
}

export async function getAnalytics(token: string | null, email: string | null): Promise<any> {
  return fetchWithAuth("/api/user/analytics", "GET", token, email)
}


// ==== AUTH API ====
export async function getAuthUrl(): Promise<string> {
  const res = await fetch(`${API_URL}/api/auth/url`)
  if (!res.ok) throw new Error("Failed to get auth URL")
  const data = await res.json()
  return data.url
}

export function getAuthRedirectUrl(): string {
  return `${API_URL}/api/auth/google`
}

export async function exchangeCode(code: string): Promise<{ access_token: string; refresh_token?: string }> {
  const res = await fetch(`${API_URL}/api/auth/callback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  })
  if (!res.ok) throw new Error("Failed to exchange auth code")
  return await res.json()
}

export async function checkAuthStatus(): Promise<{ authenticated: boolean; hasToken: boolean }> {
  const res = await fetch(`${API_URL}/api/auth/status`)
  if (!res.ok) return { authenticated: false, hasToken: false }
  return await res.json()
}
