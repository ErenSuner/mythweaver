import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/state/authStore'
import { supabaseEnabled } from '@/lib/supabase'
import Turnstile, { turnstileEnabled } from '@/components/Turnstile'
import { Info } from '@/components/ui'

type Mode = 'signin' | 'signup' | 'forgot'

export default function Login() {
  const { user, ready, signInPassword, signUpPassword, signInGoogle, resetPassword } = useAuthStore()
  const nav = useNavigate()
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [agree, setAgree] = useState(false)
  const [captcha, setCaptcha] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const onToken = useCallback((t: string) => setCaptcha(t), [])

  useEffect(() => {
    if (ready && user) nav('/')
  }, [ready, user, nav])

  // Mod değişince captcha token'ını tazele (widget yeniden yüklenir).
  useEffect(() => {
    setCaptcha('')
    setMsg(null)
  }, [mode])

  const captchaArg = turnstileEnabled ? captcha : undefined
  const captchaMissing = turnstileEnabled && !captcha

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (mode === 'signup' && !agree) {
      setMsg('Devam etmek için Kullanım Koşulları ve Gizlilik Politikası’nı kabul etmelisin.')
      return
    }
    if (captchaMissing) {
      setMsg('Lütfen “robot değilim” doğrulamasını tamamla.')
      return
    }
    setBusy(true)
    setMsg(null)
    let err: string | null = null
    if (mode === 'signin') err = await signInPassword(email, password, captchaArg)
    else if (mode === 'signup') err = await signUpPassword(email, password, captchaArg)
    else err = await resetPassword(email, captchaArg)
    setBusy(false)
    if (err) {
      setMsg(err)
      return
    }
    if (mode === 'signup') setMsg('Kayıt oluşturuldu. E-postana gelen doğrulama bağlantısına tıkla, sonra giriş yap.')
    else if (mode === 'forgot') setMsg('Sıfırlama bağlantısı e-postana gönderildi (gelmezse spam’i kontrol et).')
  }

  async function google() {
    setBusy(true)
    setMsg(null)
    const err = await signInGoogle()
    setBusy(false)
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
            {mode !== 'forgot' && (
              <>
                <button type="button" className="btn btn-primary" onClick={google} disabled={busy}>
                  <span aria-hidden style={{ marginRight: 8 }}>🅖</span>
                  Google ile Giriş Yap
                </button>

                <div className="row" style={{ alignItems: 'center', gap: 10 }}>
                  <span style={{ flex: 1, height: 1, background: 'var(--line)' }} />
                  <span className="hint">veya e-posta ile</span>
                  <span style={{ flex: 1, height: 1, background: 'var(--line)' }} />
                </div>
              </>
            )}

            <form onSubmit={submit} className="stack">
              <div>
                <label>E-posta</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>

              {mode !== 'forgot' && (
                <div>
                  <label>Şifre</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
              )}

              {mode === 'signin' && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ alignSelf: 'flex-start', padding: '2px 0', fontSize: 13 }}
                  onClick={() => setMode('forgot')}
                >
                  Şifremi unuttum
                </button>
              )}

              {mode === 'signup' && (
                <label className="row" style={{ gap: 8, alignItems: 'flex-start', fontSize: 13 }}>
                  <input
                    type="checkbox"
                    checked={agree}
                    onChange={(e) => setAgree(e.target.checked)}
                    style={{ marginTop: 3 }}
                  />
                  <span className="muted">
                    <Link to="/kosullar" target="_blank" onClick={(e) => e.stopPropagation()}>
                      Kullanım Koşulları
                    </Link>{' '}
                    ve{' '}
                    <Link to="/gizlilik" target="_blank" onClick={(e) => e.stopPropagation()}>
                      Gizlilik Politikası
                    </Link>
                    ’nı okudum, kabul ediyorum.
                  </span>
                </label>
              )}

              {turnstileEnabled && <Turnstile key={mode} onToken={onToken} />}

              <button className="btn" disabled={busy}>
                {mode === 'signin' ? 'Giriş Yap' : mode === 'signup' ? 'Kayıt Ol' : 'Sıfırlama Bağlantısı Gönder'}
              </button>

              {mode === 'forgot' ? (
                <button type="button" className="btn btn-ghost" onClick={() => setMode('signin')}>
                  Girişe dön
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
                >
                  {mode === 'signin' ? 'Hesabın yok mu? Kayıt ol' : 'Zaten hesabın var mı? Giriş yap'}
                </button>
              )}
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
