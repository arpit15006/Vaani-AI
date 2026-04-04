"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { X } from "lucide-react"

export interface ToastProps {
  id: string
  title?: string
  description: string
  variant?: "default" | "success" | "destructive"
  duration?: number
}

interface ToastContextValue {
  toasts: ToastProps[]
  addToast: (toast: Omit<ToastProps, "id">) => void
  removeToast: (id: string) => void
}

const ToastContext = React.createContext<ToastContextValue | undefined>(undefined)

export function useToast() {
  const context = React.useContext(ToastContext)
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider")
  }
  return context
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastProps[]>([])

  const addToast = React.useCallback((toast: Omit<ToastProps, "id">) => {
    const id = Math.random().toString(36).substring(2, 9)
    const newToast = { ...toast, id }
    setToasts((prev) => [...prev, newToast])

    const duration = toast.duration || 4000
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, duration)
  }, [])

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  )
}

function ToastContainer({
  toasts,
  removeToast,
}: {
  toasts: ToastProps[]
  removeToast: (id: string) => void
}) {
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  )
}

function ToastItem({
  toast,
  onClose,
}: {
  toast: ToastProps
  onClose: () => void
}) {
  const variantStyles = {
    default: "border-border bg-card text-card-foreground",
    success: "border-green-500/30 bg-green-950/80 text-green-100",
    destructive: "border-destructive/30 bg-red-950/80 text-red-100",
  }

  return (
    <div
      className={cn(
        "pointer-events-auto rounded-xl border p-4 shadow-2xl backdrop-blur-xl animate-slide-in-right flex items-start gap-3",
        variantStyles[toast.variant || "default"]
      )}
    >
      <div className="flex-1 min-w-0">
        {toast.title && (
          <p className="text-sm font-semibold mb-0.5">{toast.title}</p>
        )}
        <p className="text-sm opacity-90">{toast.description}</p>
      </div>
      <button
        onClick={onClose}
        className="shrink-0 rounded-md p-1 opacity-60 hover:opacity-100 transition-opacity"
      >
        <X className="size-3.5" />
      </button>
    </div>
  )
}
