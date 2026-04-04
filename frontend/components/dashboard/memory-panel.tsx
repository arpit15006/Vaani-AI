import { useState, useEffect } from "react"
import { getMemories, deleteMemory, type UserMemory } from "@/lib/api"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { BrainCircuit, Heart, Info, Clock, Trash2 } from "lucide-react"
import { useToast } from "@/components/ui/toast"

export function MemoryPanel({ token, email }: { token: string | null, email: string | null }) {
  const [memories, setMemories] = useState<UserMemory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { addToast } = useToast()

  const fetchMemories = async () => {
    if (!token) return
    setIsLoading(true)
    try {
      const data = await getMemories(token, email)
      setMemories(data)
    } catch {
      addToast({ description: "Failed to load memory", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchMemories()
  }, [token, email])

  const handleDelete = async (id: string) => {
    try {
      await deleteMemory(id, token, email)
      setMemories(memories.filter(m => m.id !== id))
      addToast({ description: "Memory deleted", variant: "default" })
    } catch {
      addToast({ description: "Failed to delete memory", variant: "destructive" })
    }
  }

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'preference': return <Heart className="size-4 text-pink-500" />
      case 'fact': return <Info className="size-4 text-blue-500" />
      case 'habit': return <Clock className="size-4 text-orange-500" />
      default: return <BrainCircuit className="size-4" />
    }
  }

  if (isLoading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Accessing memory core...</div>

  if (!token) return (
    <div className="p-8 text-center border rounded-lg border-dashed mt-4 bg-muted/20">
      <h3 className="font-medium text-lg mb-2">Connect your account</h3>
      <p className="text-sm text-muted-foreground">Sign in with Google to enable long-term memory.</p>
    </div>
  )

  const preferences = memories.filter(m => m.category === 'preference')
  const facts = memories.filter(m => m.category === 'fact')
  const habits = memories.filter(m => m.category === 'habit')

  const MemoryGroup = ({ title, items, icon }: { title: string, items: UserMemory[], icon: React.ReactNode }) => {
    if (items.length === 0) return null
    
    return (
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          {icon}
          <h3 className="text-lg font-semibold">{title}</h3>
          <Badge variant="secondary" className="ml-2">{items.length}</Badge>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map(mem => (
            <div key={mem.id} className="p-3 rounded-lg border glass-strong relative group">
              <div className="pr-8">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">{mem.key.replace(/_/g, ' ')}</p>
                <p className="text-sm font-medium">{mem.value}</p>
              </div>
              <Button 
                variant="ghost" 
                size="icon-sm" 
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                onClick={() => handleDelete(mem.id)}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-xl font-semibold">User Memory Matrix</h2>
          <p className="text-sm text-muted-foreground">Information I have learned about you.</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchMemories} className="hidden sm:flex">
          Refresh
        </Button>
      </div>

      <ScrollArea className="h-[calc(100vh-180px)] pr-4">
        {memories.length === 0 ? (
          <div className="p-8 text-center border rounded-lg border-dashed mt-4 text-muted-foreground">
            Memory bank is empty. Ask me to remember something!
          </div>
        ) : (
          <>
            <MemoryGroup title="Preferences" items={preferences} icon={<Heart className="size-5 text-pink-500" />} />
            <MemoryGroup title="Personal Facts" items={facts} icon={<Info className="size-5 text-blue-500" />} />
            <MemoryGroup title="Habits" items={habits} icon={<Clock className="size-5 text-orange-500" />} />
          </>
        )}
      </ScrollArea>
    </div>
  )
}
