import { 
  MessageSquare, 
  History, 
  Activity, 
  BrainCircuit, 
  Settings,
  BarChart2,
  X
} from "lucide-react"
import { Button } from "@/components/ui/button"

interface SidebarProps {
  activeTab: string
  setActiveTab: (tab: string) => void
  isOpen: boolean
  onClose: () => void
}

export function Sidebar({ activeTab, setActiveTab, isOpen, onClose }: SidebarProps) {
  const navItems = [
    { id: "chat", label: "Current Chat", icon: <MessageSquare className="size-4" /> },
    { id: "history", label: "Conversations", icon: <History className="size-4" /> },
    { id: "actions", label: "Recent Actions", icon: <Activity className="size-4" /> },
    { id: "memory", label: "User Memory", icon: <BrainCircuit className="size-4" /> },
    { id: "analytics", label: "Analytics", icon: <BarChart2 className="size-4" /> },
    { id: "settings", label: "Settings", icon: <Settings className="size-4" /> },
  ]

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden" 
          onClick={onClose}
        />
      )}

      {/* Sidebar sidebar */}
      <aside className={`
        fixed md:sticky top-0 left-0 z-50 h-screen w-64 border-r border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0
        flex flex-col
      `}>
        <div className="flex h-14 items-center justify-between px-4 border-b border-border/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <span className="font-bold text-primary">V</span>
            </div>
            <h2 className="font-semibold">VaaniAI Workspace</h2>
          </div>
          <Button variant="ghost" size="icon" className="md:hidden" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
          <div className="px-2 pb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Menu
          </div>
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id)
                if (window.innerWidth < 768) onClose()
              }}
              className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors ${
                activeTab === item.id 
                  ? 'bg-primary/10 text-primary font-medium' 
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      </aside>
    </>
  )
}
