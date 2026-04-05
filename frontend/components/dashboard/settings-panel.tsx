import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/toast"
import { Mic, Volume2, Shield, Trash2, Key } from "lucide-react"
import { clearAllMemory } from "@/lib/api"

export function SettingsPanel({ token, email }: { token: string | null, email: string | null }) {
  const { addToast } = useToast()
  
  const [wakeWordEnabled, setWakeWordEnabled] = useState(false)
  const [voiceResponses, setVoiceResponses] = useState(true)
  const [proactiveEnabled, setProactiveEnabled] = useState(true)

  useEffect(() => {
    const savedWakeWord = localStorage.getItem("vaaniai_wakeword") === "true"
    const savedVoice = localStorage.getItem("vaaniai_voice") !== "false"
    const savedProactive = localStorage.getItem("vaaniai_proactive") !== "false"
    setWakeWordEnabled(savedWakeWord)
    setVoiceResponses(savedVoice)
    setProactiveEnabled(savedProactive)
  }, [])

  const handleSave = () => {
    localStorage.setItem("vaaniai_wakeword", wakeWordEnabled ? "true" : "false")
    localStorage.setItem("vaaniai_voice", voiceResponses ? "true" : "false")
    localStorage.setItem("vaaniai_proactive", proactiveEnabled ? "true" : "false")
    addToast({ description: "Settings saved successfully", variant: "success" })
    setTimeout(() => window.location.reload(), 1000)
  }

  const handleClearMemory = async () => {
    try {
      await clearAllMemory(token, email)
      addToast({ description: "All extracted memories have been permanently cleared.", variant: "default" })
    } catch (err) {
      addToast({ description: "Failed to clear memory. Try again.", variant: "destructive" })
    }
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-12">
      <div>
        <h2 className="text-2xl font-semibold">Settings</h2>
        <p className="text-sm text-muted-foreground">Manage your AI assistant preferences.</p>
      </div>

      <div className="space-y-4">
        <Card className="glass-strong">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Mic className="size-5" /> Voice Experience
            </CardTitle>
            <CardDescription>Configure how VaaniAI listens and speaks.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg border bg-background/50">
              <div className="space-y-0.5">
                <div className="font-medium">Voice Responses (TTS)</div>
                <div className="text-sm text-muted-foreground">AI will speak its replies out loud</div>
              </div>
              <Button 
                variant={voiceResponses ? "default" : "outline"}
                onClick={() => setVoiceResponses(!voiceResponses)}
              >
                {voiceResponses ? "Enabled" : "Disabled"}
              </Button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border bg-background/50">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 font-medium">
                  Wake Word Detection
                  <span className="text-[10px] bg-primary/20 text-primary px-1.5 rounded uppercase tracking-wider">Beta</span>
                </div>
                <div className="text-sm text-muted-foreground">Say "Hey Vaani" to activate listening</div>
              </div>
              <Button 
                variant={wakeWordEnabled ? "default" : "outline"}
                onClick={() => setWakeWordEnabled(!wakeWordEnabled)}
              >
                {wakeWordEnabled ? "Enabled" : "Disabled"}
              </Button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border bg-background/50">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 font-medium">
                  Proactive Agent (Phase 4)
                  <span className="text-[10px] bg-blue-500/20 text-blue-500 px-1.5 rounded uppercase tracking-wider">New</span>
                </div>
                <div className="text-sm text-muted-foreground">Vaani will speak to you unprompted for important events.</div>
              </div>
              <Button 
                variant={proactiveEnabled ? "default" : "outline"}
                onClick={() => setProactiveEnabled(!proactiveEnabled)}
              >
                {proactiveEnabled ? "Enabled" : "Disabled"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-strong border-destructive/20">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-destructive">
              <Shield className="size-5" /> Privacy & Data
            </CardTitle>
            <CardDescription>Manage your personal data and connections.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="flex items-center justify-between p-3 rounded-lg border border-destructive/20 bg-destructive/5">
              <div className="space-y-0.5">
                <div className="font-medium text-destructive">Wipe Subconscious Memory</div>
                <div className="text-sm text-muted-foreground">Permanently delete all facts, preferences, and habits learned about you.</div>
              </div>
              <Button variant="destructive" onClick={handleClearMemory}>
                <Trash2 className="size-4 mr-2" /> Clear Memory
              </Button>
            </div>
            
            <div className="flex items-center justify-between p-3 rounded-lg border bg-background/50">
              <div className="space-y-0.5">
                <div className="font-medium">Revoke API Key Access</div>
                <div className="text-sm text-muted-foreground">Remove stored Google OAuth tokens from the database.</div>
              </div>
              <Button variant="outline">
                <Key className="size-4 mr-2" /> Revoke Keys
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end pt-4">
           <Button onClick={handleSave} className="w-full sm:w-auto">Save Preferences</Button>
        </div>
      </div>
    </div>
  )
}
