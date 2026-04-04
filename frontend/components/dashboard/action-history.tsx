import { useState, useEffect } from "react"
import { getActionHistory, type ActionLog } from "@/lib/api"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Calendar, Mail, Cloud, Wrench, CheckCircle2, XCircle } from "lucide-react"
import { useToast } from "@/components/ui/toast"

export function ActionHistoryPanel({ token, email }: { token: string | null, email: string | null }) {
  const [actions, setActions] = useState<ActionLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { addToast } = useToast()

  useEffect(() => {
    if (!token) {
      setIsLoading(false)
      return
    }

    getActionHistory(token, email)
      .then(data => {
        setActions(data)
        setIsLoading(false)
      })
      .catch((err) => {
        console.error("Failed to load actions", err)
        addToast({ description: "Failed to load recent actions", variant: "destructive" })
        setIsLoading(false)
      })
  }, [token, email, addToast])

  const getToolIcon = (toolName: string) => {
    if (toolName.includes("calendar")) return <Calendar className="size-4" />
    if (toolName.includes("email")) return <Mail className="size-4" />
    if (toolName.includes("weather")) return <Cloud className="size-4" />
    return <Wrench className="size-4" />
  }

  if (isLoading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading actions...</div>
  
  if (!token) return (
    <div className="p-8 text-center border rounded-lg border-dashed mt-4 bg-muted/20">
      <h3 className="font-medium text-lg mb-2">Connect your account</h3>
      <p className="text-sm text-muted-foreground">Sign in with Google to view your action history.</p>
    </div>
  )

  if (actions.length === 0) return (
    <div className="p-8 text-center border rounded-lg border-dashed mt-4 text-muted-foreground">
      No actions recorded yet.
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Recent Actions</h2>
        <Badge variant="outline">{actions.length} Total</Badge>
      </div>
      
      <ScrollArea className="h-[calc(100vh-180px)] pr-4">
        <div className="space-y-3">
          {actions.map((act) => (
            <div key={act.id} className="p-4 rounded-lg border glass-strong hover:bg-muted/30 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${act.success ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>
                    {getToolIcon(act.tool_name)}
                  </div>
                  <div>
                    <h4 className="text-sm font-medium capitalize">{act.action_type.replace(/_/g, ' ')}</h4>
                    <p className="text-xs text-muted-foreground mt-1 max-w-md truncate">
                      {act.result_summary}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {act.success ? (
                    <Badge variant="secondary" className="bg-green-500/10 text-green-500 border-green-500/20"><CheckCircle2 className="size-3 mr-1" /> Success</Badge>
                  ) : (
                    <Badge variant="destructive"><XCircle className="size-3 mr-1" /> Failed</Badge>
                  )}
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(act.created_at).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
