// Render sırasında bir throw olursa tüm app'in beyazlamasını önler.
import { Component, type ErrorInfo, type ReactNode } from 'react'
import { captureError } from '@/lib/monitoring'

interface Props {
  children: ReactNode
}
interface State {
  hasError: boolean
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info)
    captureError(error, { componentStack: info.componentStack })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="container" style={{ textAlign: 'center', padding: 60 }}>
          <h1 style={{ fontSize: 26, marginBottom: 8 }}>Bir şeyler ters gitti</h1>
          <p className="muted" style={{ marginBottom: 16 }}>Beklenmedik bir hata oluştu. Sayfayı yenilemeyi dene.</p>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>
            Yenile
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
