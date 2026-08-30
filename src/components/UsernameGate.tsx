import { useState } from 'react'
import { useAuthStore } from '@/state/authStore'
import { supabaseEnabled } from '@/lib/supabase'
import { setUsername, USERNAME_RE } from '@/lib/social'

// Oturum açık ama username yoksa uygulamayı kapatan zorunlu ekran.
// Kullanıcı arama/davet username'e dayandığı için herkesin bir username'i olmalı.
export default function UsernameGate() {
  const { user, ready, refreshRoles } = useAuthStore()
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  // Sadece Supabase modunda, oturum hazır ve username eksikse göster.
  if (!supabaseEnabled || !ready || !user || user.username) return null

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const name = value.trim()
    if (!USERNAME_RE.test(name)) {
      setErr('3-20 karakter; yalnız harf, rakam ve alt çizgi (_).')
      return
    }
    setSaving(true)
    setErr(null)
    try {
      await setUsername(name)
      await refreshRoles()
    } catch (e2) {
      const msg = (e2 as { code?: string; message?: string })
      if (msg.code === '23505' || /duplicate|unique/i.test(msg.message ?? '')) {
        setErr('Bu kullanıcı adı alınmış. Başka dene.')
      } else if (msg.code === '23514' || /check/i.test(msg.message ?? '')) {
        setErr('Geçersiz kullanıcı adı biçimi.')
      } else {
        console.error('[username] kaydetme hatası', e2)
        setErr('Kaydedilemedi. Tekrar dene.')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'var(--scrim)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div className="panel" style={{ maxWidth: 420, width: '100%' }}>
        <h2 style={{ fontSize: 'var(--fs-md)', marginBottom: 4 }}>Bir kullanıcı adı seç</h2>
        <p className="muted" style={{ marginBottom: 14 }}>
          Diğer oyuncular seni bu adla arayıp campaign'e davet edebilir. Sonra Hesap sayfasından değiştirebilirsin.
        </p>
        <form className="stack" style={{ gap: 10 }} onSubmit={onSubmit}>
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="kullanici_adi"
            maxLength={20}
            autoFocus
          />
          <button className="btn btn-primary" type="submit" disabled={saving || !value.trim()}>
            {saving ? 'Kaydediliyor…' : 'Devam et'}
          </button>
        </form>
        {err && (
          <p className="muted" style={{ color: 'var(--danger, #e57373)', marginTop: 10, marginBottom: 0 }}>
            {err}
          </p>
        )}
      </div>
    </div>
  )
}
