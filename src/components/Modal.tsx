// Uygulama içi, temaya uyumlu modal. Tarayıcının confirm()/alert() kutuları
// kullanılmaz — hepsi buradan geçer.
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

export interface ModalProps {
  open: boolean
  onClose: () => void
  title?: ReactNode
  subtitle?: ReactNode
  children: ReactNode
  footer?: ReactNode
  /** geniş içerik (eşya listeleri) için */
  wide?: boolean
}

export function Modal({ open, onClose, title, subtitle, children, footer, wide }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const prevFocus = document.activeElement as HTMLElement | null
    panelRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      prevFocus?.focus?.()
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={panelRef}
        className={`modal${wide ? ' modal-wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        tabIndex={-1}
      >
        {(title || subtitle) && (
          <div className="modal-head">
            <div>
              {title && <h3 className="modal-title">{title}</h3>}
              {subtitle && <div className="hint">{subtitle}</div>}
            </div>
            <button type="button" className="modal-x" onClick={onClose} aria-label="Kapat">
              ✕
            </button>
          </div>
        )}
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}

// ---- confirm() yerine geçen söz-tabanlı onay ----
export interface ConfirmOptions {
  title: string
  message: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
}

type Resolver = (ok: boolean) => void
const ConfirmContext = createContext<((o: ConfirmOptions) => Promise<boolean>) | null>(null)

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ opts: ConfirmOptions; resolve: Resolver } | null>(null)

  const confirm = useCallback((opts: ConfirmOptions) => new Promise<boolean>((resolve) => setState({ opts, resolve })), [])

  const close = (ok: boolean) => {
    state?.resolve(ok)
    setState(null)
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal
        open={Boolean(state)}
        onClose={() => close(false)}
        title={state?.opts.title}
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => close(false)}>
              {state?.opts.cancelLabel ?? 'Vazgeç'}
            </button>
            <button
              type="button"
              className={`btn ${state?.opts.danger ? 'btn-danger' : 'btn-primary'}`}
              onClick={() => close(true)}
            >
              {state?.opts.confirmLabel ?? 'Evet, devam et'}
            </button>
          </>
        }
      >
        <div style={{ color: 'var(--ink-dim)' }}>{state?.opts.message}</div>
      </Modal>
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm, ConfirmProvider içinde kullanılmalı')
  return ctx
}
