import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/state/authStore'
import { supabaseEnabled } from '@/lib/supabase'
import { Info } from '@/components/ui'

export default function Login() {
  const { user, ready, signInPassword, signUpPassword, signInGoogle } = useAuthStore()
  const nav = useNavigate()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (ready && user) nav('/')
  }, [ready, user, nav])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setMsg(null)
    const err = mode === 'signin' ? await signInPassword(email, password) : await signUpPassword(email, password)
    setBusy(false)
    if (err) setMsg(err)
    else if (mode === 'signup') setMsg('Kayıt oluşturuldu. E-postanı doğrulaman gerekebilir, sonra giriş yap.')
  }

  async function google() {
    setBusy(true)
    setMsg(null)
    const err = await signInGoogle()
    setBusy(false)
    // hata yoksa tarayıcı Google'a yönlenir; hata varsa mesaj göster
    if (err) setMsg(err)
  }

  return (
    <div className="container" style={{ maxWidth: 460 }}>
      <div className="panel stack">
        <div>
          <h1 style={{ fontSize: 28, marginBottom: 4 }}>Efsaneni Doku</h1>
          <p className="muted">Karakterlerini oluştur, sakla ve büyüt.</p>
        </div>

        {!supabaseEnabled && (
          <Info>
            Supabase yapılandırılmamış — <b>yerel mod</b> aktif. Karakterler yalnızca bu tarayıcıda saklanır. Giriş
            yapmak için aşağıdaki butonu kullan.
          </Info>
        )}

        {supabaseEnabled ? (
          <div className="stack">
            <button type="button" className="btn btn-primary" onClick={google} disabled={busy}>
              <span aria-hidden style={{ marginRight: 8 }}>🅖</span>
              Google ile Giriş Yap
            </button>

            <div className="row" style={{ alignItems: 'center', gap: 10 }}>
              <span style={{ flex: 1, height: 1, background: 'var(--line)' }} />
              <span className="hint">veya e-posta ile</span>
              <span style={{ flex: 1, height: 1, background: 'var(--line)' }} />
            </div>

            <form onSubmit={submit} className="stack">
              <div>
                <label>E-posta</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div>
                <label>Şifre</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
              </div>
              <button className="btn" disabled={busy}>
                {mode === 'signin' ? 'Giriş Yap' : 'Kayıt Ol'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>
                {mode === 'signin' ? 'Hesabın yok mu? Kayıt ol' : 'Zaten hesabın var mı? Giriş yap'}
              </button>
            </form>
          </div>
        ) : (
          <button
            className="btn btn-primary"
            onClick={async () => {
              await useAuthStore.getState().init()
              nav('/')
            }}
          >
            Yerel Modda Başla
          </button>
        )}

        {msg && <div className="info">{msg}</div>}
      </div>
    </div>
  )
}
