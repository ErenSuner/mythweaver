// Hata izleme. VITE_SENTRY_DSN tanımlıysa Sentry başlatılır; değilse no-op
// (yerel/geliştirme gürültü üretmez).
import * as Sentry from '@sentry/react'

const DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined

export function initMonitoring() {
  if (!DSN) return
  Sentry.init({
    dsn: DSN,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0.1,
    // PII gönderme; e-posta/karakter verisi Sentry'ye sızmasın.
    sendDefaultPii: false,
  })
}

/** ErrorBoundary'den yakalanan render hatalarını ilet (DSN yoksa sessiz). */
export function captureError(error: unknown, info?: Record<string, unknown>) {
  if (!DSN) return
  Sentry.captureException(error, info ? { extra: info } : undefined)
}
