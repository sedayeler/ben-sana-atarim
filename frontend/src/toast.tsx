import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'

export type ToastTone = 'error' | 'success' | 'info' | 'warn'

interface ToastItem {
  id: number
  text: string
  tone: ToastTone
  actionLabel?: string
  onAction?: () => void
}

interface ToastApi {
  show: (text: string, tone?: ToastTone, action?: { label: string; run: () => void }) => void
}

const ToastContext = createContext<ToastApi>({ show: () => {} })

export const useToast = () => useContext(ToastContext)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const counter = useRef(0)

  const show = useCallback<ToastApi['show']>((text, tone = 'info', action) => {
    const id = ++counter.current
    setItems((current) => [...current.slice(-2), { id, text, tone, actionLabel: action?.label, onAction: action?.run }])
    window.setTimeout(() => setItems((current) => current.filter((item) => item.id !== id)), action ? 7000 : 4200)
  }, [])

  const api = useMemo(() => ({ show }), [show])

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((item) => (
          <div key={item.id} className={`toast toast-${item.tone}`}>
            <span>{item.text}</span>
            {item.actionLabel && (
              <button
                type="button"
                className="toast-act"
                onClick={() => {
                  item.onAction?.()
                  setItems((current) => current.filter((x) => x.id !== item.id))
                }}
              >
                {item.actionLabel}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
