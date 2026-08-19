import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/state/authStore'
import { supabaseEnabled } from '@/lib/supabase'
import { Info } from '@/components/ui'

// Supabase recovery e-postasındaki bağlantı buraya döner. Bağlantı, geçici bir
// "recovery" oturumu kurar (authStore init'teki onAuthStateChange yakalar), böylece
// updateUser({password}) çağrısı yetkilenir. Oturum yoksa bağlantı geçersiz/süresi
// dolmuş demektir.
export default function ResetPassword() {
  const { user, ready, updatePassword } = useAuthStore()
  const nav = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      setMsg('Şifreler eşleşmiyor.')
      return
    }
    setBusy(true)
    setMsg(null)
    const err = await updatePassword(password)
    setBusy(false)
    if (err) {
      setMsg(err)
      return
    }
    setDone(true)
    setTimeout(() => nav('/'), 1500)
  }

  if (!supabaseEnabled) return <div className="container">Bu sayfa yalnızca çevrimiçi modda kullanılır.</div>
  if (!ready) return <div className="container">Yükleniyor…</div>

  return (
    <div className="container" style={{ maxWidth: 460 }}>
      <div className="panel stack">
        <h1 style={{ fontSize: 26 }}>Yeni Şifre Belirle</h1>

        {done ? (
          <Info>Şifren güncellendi. Yönlendiriliyorsun…</Info>
        ) : !user ? (
          <Info>
            Bağlantı geçersiz ya da süresi dolmuş. Lütfen giriş sayfasından “Şifremi unuttum” ile yeni bir bağlantı
            iste.
          </Info>
        ) : (
          <form onSubmit={submit} className="stack">
            <div>
              <label>Yeni şifre</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            </div>
            <div>
              <label>Yeni şifre (tekrar)</label>
              <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={6} />
            </div>
            <button className="btn btn-primary" disabled={busy}>
              Şifreyi Güncelle
            </button>
          </form>
        )}

        {msg && <div className="info">{msg}</div>}
      </div>
    </div>
  )
}
