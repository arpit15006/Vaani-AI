import { useState, useEffect } from "react"
import { getConversations, deleteConversation, type Conversation } from "@/lib/api"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MessageSquare, Trash2, ChevronRight } from "lucide-react"
import { useToast } from "@/components/ui/toast"
import { Button } from "@/components/ui/button"

export function ConversationList({ 
  token, 
  email,
  onSelectConversation
}: { 
  token: string | null
  email: string | null
  onSelectConversation: (id: string, title: string) => void
}) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { addToast } = useToast()

  const fetchConvs = async () => {
    if (!token) return
    setIsLoading(true)
    try {
      const data = await getConversations(token, email)
      setConversations(data)
    } catch {
      addToast({ description: "Failed to load history", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchConvs()
  }, [token, email])

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation() // prevent selecting the conversation
    try {
      await deleteConversation(id, token, email)
      setConversations(conversations.filter(c => c.id !== id))
      addToast({ description: "Conversation deleted", variant: "default" })
    } catch {
      addToast({ description: "Failed to delete conversation", variant: "destructive" })
    }
  }

  if (isLoading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading history...</div>

  if (!token) return (
    <div className="p-8 text-center border rounded-lg border-dashed mt-4 bg-muted/20">
      <h3 className="font-medium text-lg mb-2">Connect your account</h3>
      <p className="text-sm text-muted-foreground">Sign in with Google to save chat history.</p>
    </div>
  )

  if (conversations.length === 0) return (
    <div className="p-8 text-center border rounded-lg border-dashed mt-4 text-muted-foreground">
      No conversations yet. Start chatting to save history.
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Conversations</h2>
        <Badge variant="outline">{conversations.length} Saved</Badge>
      </div>

      <ScrollArea className="h-[calc(100vh-180px)] pr-4">
        <div className="space-y-2">
          {conversations.map((conv) => (
            <div 
              key={conv.id} 
              onClick={() => onSelectConversation(conv.id, conv.title)}
              className="p-3 rounded-lg border glass-strong hover:bg-muted/50 transition-colors cursor-pointer group flex items-center justify-between"
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="p-2 rounded-full bg-primary/10 text-primary shrink-0">
                  <MessageSquare className="size-4" />
                </div>
                <div className="overflow-hidden">
                  <h4 className="text-sm font-medium truncate">{conv.title}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(conv.updated_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <Button 
                  variant="ghost" 
                  size="icon-sm" 
                  className="text-muted-foreground hover:text-destructive"
                  onClick={(e) => handleDelete(e, conv.id)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
                <ChevronRight className="size-4 text-muted-foreground" />
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
