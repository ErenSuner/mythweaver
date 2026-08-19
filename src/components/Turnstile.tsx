// Cloudflare Turnstile CAPTCHA. VITE_TURNSTILE_SITE_KEY tanımlıysa widget render
// eder ve çözüm token'ını onToken ile verir; tanımlı değilse hiçbir şey çizmez
// (yerel/geliştirme akışını bloklamaz). Supabase Auth tarafında da CAPTCHA açık
// olmalı — bkz. DEPLOY.md.
import { useEffect, useRef } from 'react'

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined

/** Turnstile yapılandırılmış mı? Login formu buna göre "çöz" zorunluluğu koyar. */
export const turnstileEnabled = Boolean(SITE_KEY)

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js'

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string
      reset: (id?: string) => void
      remove: (id?: string) => void
    }
  }
}

let scriptPromise: Promise<void> | null = null
function loadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve()
  if (scriptPromise) return scriptPromise
  scriptPromise = new Promise<void>((resolve, reject) => {
    const s = document.createElement('script')
    s.src = SCRIPT_SRC
    s.async = true
    s.defer = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('Turnstile script yüklenemedi'))
    document.head.appendChild(s)
  })
  return scriptPromise
}

interface Props {
  /** Çözüldüğünde token; süresi dolunca/hata olunca boş string döner. */
  onToken: (token: string) => void
}

export default function Turnstile({ onToken }: Props) {
  const boxRef = useRef<HTMLDivElement>(null)
  const widgetId = useRef<string | null>(null)

  useEffect(() => {
    if (!SITE_KEY || !boxRef.current) return
    let cancelled = false
    const el = boxRef.current
    loadScript()
      .then(() => {
        if (cancelled || !window.turnstile || !el) return
        widgetId.current = window.turnstile.render(el, {
          sitekey: SITE_KEY,
          callback: (t: string) => onToken(t),
          'expired-callback': () => onToken(''),
          'error-callback': () => onToken(''),
        })
      })
      .catch(() => onToken(''))
    return () => {
      cancelled = true
      if (widgetId.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetId.current)
        } catch {
          /* yoksay */
        }
      }
    }
    // onToken referansı kararlı verilmeli (useCallback) — bir kez render edilir.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!SITE_KEY) return null
  return <div ref={boxRef} style={{ minHeight: 65 }} />
}
