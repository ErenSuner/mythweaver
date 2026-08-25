// Uygulama içi, temaya uyumlu toast bildirimi. ConfirmProvider desenini izler
// (Modal.tsx). Hata/başarı geri bildirimi için — native alert kullanılmaz.
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

export type ToastKind = 'error' | 'info' | 'success'
interface ToastItem {
  id: number
  message: string
  kind: ToastKind
}

const ToastContext = createContext<((message: string, kind?: ToastKind) => void) | null>(null)

let nextId = 1

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  const remove = useCallback((id: number) => setItems((xs) => xs.filter((x) => x.id !== id)), [])

  const toast = useCallback(
    (message: string, kind: ToastKind = 'info') => {
      const id = nextId++
      setItems((xs) => [...xs, { id, message, kind }])
      setTimeout(() => remove(id), 4000)
    },
    [remove],
  )

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {createPortal(
        <div
          style={{
            position: 'fixed',
            right: 16,
            bottom: 16,
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            maxWidth: 'min(360px, calc(100vw - 32px))',
          }}
        >
          {items.map((t) => (
            <div
              key={t.id}
              role="status"
              onClick={() => remove(t.id)}
              style={{
                cursor: 'pointer',
                padding: '10px 14px',
                borderRadius: 8,
                border: `1px solid ${t.kind === 'error' ? 'var(--danger)' : 'var(--line)'}`,
                background: 'var(--panel, #1b1a18)',
                color: 'var(--ink)',
                boxShadow: 'var(--shadow)',
                fontSize: 'var(--fs-sm)',
                display: 'flex',
                gap: 8,
                alignItems: 'flex-start',
              }}
            >
              <span>{t.kind === 'error' ? '⚠' : t.kind === 'success' ? '✓' : 'ℹ'}</span>
              <span style={{ flex: 1 }}>{t.message}</span>
            </div>
          ))}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast, ToastProvider içinde kullanılmalı')
  return ctx
}
