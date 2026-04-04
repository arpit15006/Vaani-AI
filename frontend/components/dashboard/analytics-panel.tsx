import { useState, useEffect } from "react"
import { getAnalytics } from "@/lib/api"
import { PieChart, Activity, Zap, Mail, TrendingUp, BarChart2, Clock } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function AnalyticsPanel({ token, email }: { token: string | null, email: string | null }) {
  const [stats, setStats] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!token) return
    getAnalytics(token, email)
      .then(setStats)
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [token, email])

  if (isLoading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Calculating metrics...</div>
  if (!token || !stats) return <div className="p-8 text-center text-muted-foreground mt-4">Login required for analytics.</div>

  const { totalTasksDone, emailsSent, toolsUsage, avgResponseTimeMs } = stats
  const topTool = Object.entries(toolsUsage).sort((a: any, b: any) => b[1] - a[1])[0] as [string, number] | undefined

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <BarChart2 className="size-5" /> Activity Analytics
        </h2>
        <p className="text-sm text-muted-foreground">Insights into your AI workflow usage.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass-strong border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Total Automations</CardTitle>
            <Activity className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTasksDone}</div>
            <p className="text-xs text-muted-foreground">Tasks executed by AI</p>
          </CardContent>
        </Card>

        <Card className="glass-strong border-green-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Emails Sent</CardTitle>
            <Mail className="size-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{emailsSent}</div>
            <p className="text-xs text-muted-foreground">Automated correspondence</p>
          </CardContent>
        </Card>

        <Card className="glass-strong border-blue-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Most Used Tool</CardTitle>
            <Zap className="size-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold capitalize truncate">
              {topTool ? topTool[0] : "None"}
            </div>
            <p className="text-xs text-muted-foreground">
              {topTool ? `Used ${topTool[1]} times` : "Start automating!"}
            </p>
          </CardContent>
        </Card>

        <Card className="glass-strong border-orange-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Execution Speed</CardTitle>
            <Clock className="size-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{avgResponseTimeMs ? `${(avgResponseTimeMs / 1000).toFixed(1)}s` : "0s"}</div>
            <p className="text-xs text-muted-foreground">Avg response time</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="glass-strong border-border/30">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <PieChart className="size-4" /> Tool Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(toolsUsage).sort((a: any, b: any) => b[1] - a[1]).map(([tool, count]: any) => {
                const percentage = (count / totalTasksDone) * 100
                return (
                  <div key={tool}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="capitalize">{tool}</span>
                      <span>{percentage.toFixed(0)}%</span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all duration-1000 ease-out" 
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
              {Object.keys(toolsUsage).length === 0 && (
                <div className="text-sm text-center text-muted-foreground py-4">No tool data recorded.</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
