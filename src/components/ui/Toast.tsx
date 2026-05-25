import { useState, useEffect, useCallback, createContext, useContext, useRef } from 'react'

export type ToastVariant = 'success' | 'error' | 'info'

interface Toast {
  id: string
  message: string
  variant: ToastVariant
}

interface ToastContextValue {
  showToast: (message: string, variant?: ToastVariant) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timerRefs = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
    const timer = timerRefs.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timerRefs.current.delete(id)
    }
  }, [])

  const showToast = useCallback((message: string, variant: ToastVariant = 'info') => {
    const id = `toast-${Date.now()}-${Math.random()}`
    setToasts(prev => [...prev.slice(-4), { id, message, variant }])
    const timer = setTimeout(() => dismiss(id), 4000)
    timerRefs.current.set(id, timer)
  }, [dismiss])

  useEffect(() => {
    return () => {
      timerRefs.current.forEach(timer => clearTimeout(timer))
    }
  }, [])

  const VARIANT_STYLES: Record<ToastVariant, string> = {
    success: 'border-green-500/30 bg-green-500/10 text-green-400',
    error: 'border-error/30 bg-error/10 text-error',
    info: 'border-primary/30 bg-primary/10 text-primary',
  }

  const VARIANT_ICONS: Record<ToastVariant, string> = {
    success: 'check_circle',
    error: 'error',
    info: 'info',
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast container */}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none"
      >
        {toasts.map(toast => (
          <div
            key={toast.id}
            role="status"
            className={`glass-panel rounded-xl px-4 py-3 flex items-start gap-3 border pointer-events-auto shadow-lg ${VARIANT_STYLES[toast.variant]}`}
          >
            <span
              className="material-symbols-outlined text-[18px] flex-shrink-0 mt-0.5"
              aria-hidden="true"
            >
              {VARIANT_ICONS[toast.variant]}
            </span>
            <p className="text-body-md flex-1">{toast.message}</p>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              aria-label="Dismiss notification"
              className="text-current opacity-60 hover:opacity-100 transition-opacity flex-shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center -mr-2 -mt-1"
            >
              <span className="material-symbols-outlined text-[16px]" aria-hidden="true">close</span>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within a ToastProvider')
  return ctx
}
