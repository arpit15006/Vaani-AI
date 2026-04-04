"use client"

import { useState, useCallback, useRef, useEffect } from "react"

interface UseSpeechSynthesisReturn {
  isSpeaking: boolean
  speak: (text: string) => void
  stop: () => void
  isSupported: boolean
}

export function useSpeechSynthesis(): UseSpeechSynthesisReturn {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const isSupported = typeof window !== "undefined" && "speechSynthesis" in window
  const queueRef = useRef<string[]>([])
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  // Safari bug fix: eagerly trigger voice loading if possible
  useEffect(() => {
    if (isSupported) {
      window.speechSynthesis.getVoices()
      window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices()
    }
  }, [isSupported])

  const getBestVoice = useCallback(() => {
    if (!isSupported) return null
    const voices = window.speechSynthesis.getVoices()
    if (!voices.length) return null

    const enVoices = voices.filter((v) => v.lang.startsWith("en"))

    let bestVoice = enVoices.find((v) => {
      const name = v.name.toLowerCase()
      const isPremium = name.includes("google") || name.includes("natural") || name.includes("enhanced")
      const isFemaleish = name.includes("female") || name.includes("zira") || name.includes("samantha") || v.lang === "en-IN"
      return isPremium && isFemaleish
    })

    if (!bestVoice) bestVoice = enVoices.find((v) => v.name.toLowerCase().includes("google"))
    if (!bestVoice) bestVoice = enVoices.find((v) => v.name.toLowerCase().includes("female"))
    return bestVoice || enVoices[0] || voices[0]
  }, [isSupported])

  const optimizeSpeech = (text: string): string[] => {
    // Safety check: if text is extremely unformatted or code-like, bypass heavy rewrite
    if (text.includes("{") || text.includes("```")) {
      return [text.replace(/[*#_`]+/g, "").trim()]
    }

    let optimized = text
      .replace(/[*#_]+/g, "")
      .replace(/I have checked the/gi, "I looked up the")
      .replace(/I have checked/gi, "I checked")
      .replace(/As per your request,?\s?/gi, "")
      .replace(/I found that/gi, "It looks like")
      .replace(/I found/gi, "There are")
      .replace(/Here is the information/gi, "Here's what I found")
      .replace(/I will now/gi, "I'll go ahead and")
      .replace(/Let me assist you/gi, "Sure,")
      .replace(/I listed your recent emails/gi, "Here are your emails")
      .replace(/I'm not able to understand your question or perform any actions with the given information/gi, "I didn't quite catch that. Could you say that again?")
      .replace(/\s+/g, " ")
      .trim()

    // First word hook (human touch)
    if (optimized.length > 50 && Math.random() > 0.6) {
      const fillers = ["Okay, so ", "Alright, ", "Got it — "]
      const filler = fillers[Math.floor(Math.random() * fillers.length)]
      if (!optimized.startsWith("I ") && !optimized.startsWith("There ")) {
        optimized = filler + optimized.charAt(0).toLowerCase() + optimized.slice(1)
      }
    }

    // Split text into arrays
    const rawMatch = optimized.match(/[^.!?]+[.!?]*/g)
    let roughChunks: string[] = rawMatch ? Array.from(rawMatch) : [optimized]
    roughChunks = roughChunks.map((c) => c.trim()).filter((c) => c.length > 0)

    // Hard Limit Long Text: if a specific chunk is > 150 chars (run-on sentence), split it by comma
    const finalChunks: string[] = []
    roughChunks.forEach(chunk => {
      if (chunk.length > 150 && chunk.includes(",")) {
        const subChunks = chunk.split(/(?<=,)\s+/)
        finalChunks.push(...subChunks.map(sc => sc.trim()))
      } else {
        finalChunks.push(chunk)
      }
    })

    return finalChunks
  }

  const processQueue = useCallback(() => {
    if (!isSupported) return
    if (queueRef.current.length === 0) {
      setIsSpeaking(false)
      return
    }

    const nextText = queueRef.current.shift()
    if (!nextText) return

    const utterance = new SpeechSynthesisUtterance(nextText)
    
    // Intent-based tone
    let rate = 0.9 // Default info rate
    const lowerText = nextText.toLowerCase()
    
    if (lowerText.includes("!") || lowerText.includes("urgent")) {
      rate = 1.0 // Alert/Excited tone
    } else if (lowerText.startsWith("okay") || lowerText.startsWith("alright") || lowerText.startsWith("got it")) {
      rate = 0.95 // Casual / Transitional
    }

    utterance.rate = rate
    utterance.pitch = 1.05

    const voice = getBestVoice()
    if (voice) utterance.voice = voice

    utterance.onstart = () => setIsSpeaking(true)

    utterance.onend = () => {
      if (queueRef.current.length > 0) {
        // Micro pause between sentences for natural flow
        setTimeout(() => processQueue(), 150)
      } else {
        setIsSpeaking(false)
      }
    }

    utterance.onerror = (e) => {
      console.warn("TTS Utterance Error:", e)
      setIsSpeaking(false)
      queueRef.current = [] 
    }

    utteranceRef.current = utterance
    window.speechSynthesis.speak(utterance)
  }, [isSupported, getBestVoice])

  const speak = useCallback(
    (text: string) => {
      if (!isSupported) return

      window.speechSynthesis.cancel()
      queueRef.current = []
      setIsSpeaking(false)

      const chunks = optimizeSpeech(text)
      queueRef.current = chunks

      const voices = window.speechSynthesis.getVoices()
      if (voices.length === 0) {
        const onVoicesReady = () => {
          window.speechSynthesis.removeEventListener("voiceschanged", onVoicesReady)
          processQueue()
        }
        window.speechSynthesis.addEventListener("voiceschanged", onVoicesReady)
      } else {
        processQueue()
      }
    },
    [isSupported, processQueue]
  )

  const stop = useCallback(() => {
    if (!isSupported) return
    window.speechSynthesis.cancel()
    queueRef.current = []
    setIsSpeaking(false)
  }, [isSupported])

  useEffect(() => {
    return () => {
      if (isSupported) window.speechSynthesis.cancel()
    }
  }, [isSupported])

  return { isSpeaking, speak, stop, isSupported }
}
