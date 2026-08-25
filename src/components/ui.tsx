import { useEffect, useRef, useState, type InputHTMLAttributes, type ReactNode } from 'react'
import { EyeIcon, EyeOffIcon } from '@/components/icons'

// "Bu ne işe yarar?" info kutucuğu
export function Info({ children }: { children: ReactNode }) {
  return <div className="info">{children}</div>
}

// tıklayınca açılan tooltip (jargon açıklaması)
export function Tip({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLSpanElement>(null)

  // açıkken dışarı tıklama ya da Esc ile kapat
  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <span ref={wrapRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="badge"
        style={{ cursor: 'pointer', borderStyle: 'dashed' }}
        aria-label={`${label} nedir?`}
      >
        {label} ⓘ
      </button>
      {open && (
        <span
          role="tooltip"
          style={{
            position: 'absolute',
            zIndex: 30,
            top: '120%',
            left: 0,
            width: 'min(260px, calc(100vw - 32px))',
            background: 'var(--panel-solid)',
            border: '1px solid var(--line-strong)',
            borderRadius: 8,
            padding: '10px 12px',
            fontSize: 13,
            color: 'var(--ink-dim)',
            boxShadow: 'var(--shadow)',
          }}
        >
          {children}
        </span>
      )}
    </span>
  )
}

export function LevelBadge({ level, isNew }: { level: number; isNew?: boolean }) {
  return <span className={isNew ? 'badge badge-new' : 'badge badge-level'}>{isNew ? `YENİ · Lv. ${level}` : `Lv. ${level}`}</span>
}

// Şifre alanı + göster/gizle gözü. type dışındaki tüm input prop'ları aynen geçer.
export function PasswordInput({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(false)
  return (
    <span className={className ? `pw-field ${className}` : 'pw-field'}>
      <input {...rest} type={show ? 'text' : 'password'} />
      <button
        type="button"
        className="pw-toggle"
        onClick={() => setShow((v) => !v)}
        aria-label={show ? 'Şifreyi gizle' : 'Şifreyi göster'}
        aria-pressed={show}
        title={show ? 'Şifreyi gizle' : 'Şifreyi göster'}
      >
        {show ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
      </button>
    </span>
  )
}
