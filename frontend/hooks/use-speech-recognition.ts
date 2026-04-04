"use client"

import { useState, useCallback, useRef, useEffect } from "react"

interface UseSpeechRecognitionReturn {
  isListening: boolean
  transcript: string
  startListening: () => void
  stopListening: () => void
  isSupported: boolean
}

interface UseSpeechRecognitionOptions {
  continuous?: boolean
  wakeWord?: string
  onWakeWordDetected?: () => void
}

export function useSpeechRecognition({ 
  continuous = false, 
  wakeWord, 
  onWakeWordDetected 
}: UseSpeechRecognitionOptions = {}): UseSpeechRecognitionReturn {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [isSupported, setIsSupported] = useState(false)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const isContinuousRef = useRef(continuous)

  useEffect(() => {
    isContinuousRef.current = continuous
  }, [continuous])

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (SpeechRecognition) {
      setIsSupported(true)
      const recognition = new SpeechRecognition()
      recognition.continuous = false
      recognition.interimResults = true
      recognition.lang = "en-US"

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let final = ""
        let interim = ""
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const t = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            final += t
            
            // Wake word detection
            if (wakeWord && t.toLowerCase().includes(wakeWord.toLowerCase())) {
              onWakeWordDetected?.()
            }
          } else {
            interim += t
          }
        }
        setTranscript(final || interim)
      }

      recognition.onend = () => {
        setIsListening(false)
        // Auto-restart if in continuous mode
        if (isContinuousRef.current && recognitionRef.current) {
          try {
             recognitionRef.current.start()
             setIsListening(true)
          } catch {
             // Avoid crash on rapid restart
          }
        }
      }

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error("[STT] Error:", event.error)
        setIsListening(false)
      }

      recognitionRef.current = recognition
    }
  }, [])

  const startListening = useCallback(() => {
    if (!recognitionRef.current) return
    setTranscript("")
    try {
      recognitionRef.current.start()
      setIsListening(true)
    } catch {
      // Already started
    }
  }, [])

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return
    try {
      recognitionRef.current.stop()
    } catch {
      // Already stopped
    }
    setIsListening(false)
  }, [])

  return { isListening, transcript, startListening, stopListening, isSupported }
}
