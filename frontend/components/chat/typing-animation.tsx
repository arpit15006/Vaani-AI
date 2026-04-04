"use client"

import { useState, useEffect } from "react"

export function TypingAnimation({ text, speed = 18 }: { text: string; speed?: number }) {
  const [displayed, setDisplayed] = useState("")
  const [done, setDone] = useState(false)

  useEffect(() => {
    setDisplayed("")
    setDone(false)
    let i = 0
    const interval = setInterval(() => {
      setDisplayed(text.substring(0, i + 1))
      i++
      if (i >= text.length) {
        clearInterval(interval)
        setDone(true)
      }
    }, speed)
    return () => clearInterval(interval)
  }, [text, speed])

  return (
    <p className="text-sm whitespace-pre-wrap leading-relaxed">
      {displayed}
      {!done && (
        <span
          className="inline-block w-0.5 h-4 bg-foreground ml-0.5 align-middle"
          style={{ animation: "typing-cursor 1s steps(1) infinite" }}
        />
      )}
    </p>
  )
}
