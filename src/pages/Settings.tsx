import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/state/authStore'
import { supabase } from '@/lib/supabase'
import { listCharacters } from '@/lib/storage'
import { useConfirm } from '@/components/Modal'
import { useToast } from '@/components/Toast'
import { Info } from '@/components/ui'

export default function Settings() {
  const { user, signOut } = useAuthStore()
  const confirm = useConfirm()
  const toast = useToast()
  const nav = useNavigate()
  const [busy, setBusy] = useState(false)

  async function exportData() {
    if (!user) return
    setBusy(true)
    try {
      const chars = await listCharacters(user.id)
      const payload = {
        exportedAt: new Date().toISOString(),
        user: { id: user.id, email: user.email },
        characters: chars,
      }
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `mythweaver-verilerim-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      toast('Dışa aktarma başarısız oldu.', 'error')
      console.error('[export] hata', e)
    } finally {
      setBusy(false)
    }
  }

  async function deleteAccount() {
    const ok = await confirm({
      title: 'Hesabını kalıcı olarak sil?',
      message: 'Tüm karakterlerin ve hesabın kalıcı olarak silinir. Bu işlem geri alınamaz.',
      confirmLabel: 'Evet, hesabımı sil',
      danger: true,
    })
    if (!ok) return
    setBusy(true)
    try {
      if (!supabase) throw new Error('supabase yok')
      // Edge function service-role ile auth.users satırını siler; characters/profiles
      // cascade ile gider. supabase-js oturum access token'ını otomatik ekler.
      const { error } = await supabase.functions.invoke('delete-account')
      if (error) throw error
      await signOut()
      nav('/login')
    } catch (e) {
      toast('Hesap silme başarısız oldu. Lütfen tekrar dene.', 'error')
      console.error('[delete-account] hata', e)
      setBusy(false)
    }
  }

  if (!user) return <div className="container">Yükleniyor…</div>

  return (
    <div className="container" style={{ maxWidth: 620 }}>
      <h1 style={{ fontSize: 26, marginBottom: 16 }}>Ayarlar</h1>

      <div className="panel stack" style={{ marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 18, marginBottom: 4 }}>Hesap</h2>
          <p className="muted" style={{ fontSize: 14 }}>{user.email}</p>
        </div>
      </div>

      <div className="panel stack" style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 18 }}>Verilerini indir</h2>
        <p className="muted" style={{ fontSize: 14 }}>
          Tüm karakterlerini JSON dosyası olarak indir (veri taşınabilirliği).
        </p>
        <button className="btn" onClick={exportData} disabled={busy} style={{ alignSelf: 'flex-start' }}>
          Verilerimi İndir (JSON)
        </button>
      </div>

      <div className="panel stack" style={{ borderColor: 'var(--danger)' }}>
        <h2 style={{ fontSize: 18 }}>Tehlikeli bölge</h2>
        <Info>Hesabını silmek tüm karakterlerini kalıcı olarak siler ve geri alınamaz.</Info>
        <button className="btn btn-danger" onClick={deleteAccount} disabled={busy} style={{ alignSelf: 'flex-start' }}>
          Hesabımı Sil
        </button>
      </div>
    </div>
  )
}
