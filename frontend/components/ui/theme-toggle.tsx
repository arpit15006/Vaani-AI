"use client"

import { useState, useEffect } from "react"
import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem("vaaniai_theme")
    if (stored === "dark") {
      document.documentElement.classList.add("dark")
      setIsDark(true)
    }
  }, [])

  const toggle = () => {
    if (isDark) {
      document.documentElement.classList.remove("dark")
      localStorage.setItem("vaaniai_theme", "light")
      setIsDark(false)
    } else {
      document.documentElement.classList.add("dark")
      localStorage.setItem("vaaniai_theme", "dark")
      setIsDark(true)
    }
  }

  return (
    <Button variant="ghost" size="icon-sm" onClick={toggle} className="rounded-full">
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  )
}
