import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/state/authStore'
import { useInviteStore } from '@/state/inviteStore'
import { supabase, supabaseEnabled } from '@/lib/supabase'
import { listCharacters } from '@/lib/storage'
import { setUsername, USERNAME_RE } from '@/lib/social'
import { useConfirm } from '@/components/Modal'
import { useToast } from '@/components/Toast'
import { AccountIcon } from '@/components/icons'

export default function Settings() {
  const { user, signOut, refreshRoles } = useAuthStore()
  const confirm = useConfirm()
  const toast = useToast()
  const nav = useNavigate()
  const inviteCount = useInviteStore((s) => s.invites.length)
  const [busy, setBusy] = useState(false)
  const [uname, setUname] = useState(user?.username ?? '')
  const [savingName, setSavingName] = useState(false)

  async function saveUsername() {
    const name = uname.trim()
    if (!USERNAME_RE.test(name)) {
      toast('3-20 karakter; yalnız harf, rakam ve alt çizgi (_).', 'error')
      return
    }
    if (name === user?.username) return
    setSavingName(true)
    try {
      await setUsername(name)
      await refreshRoles()
      toast('Kullanıcı adı güncellendi.', 'success')
    } catch (e) {
      const msg = e as { code?: string; message?: string }
      if (msg.code === '23505' || /duplicate|unique/i.test(msg.message ?? '')) {
        toast('Bu kullanıcı adı alınmış. Başka dene.', 'error')
      } else {
        toast('Güncellenemedi. Tekrar dene.', 'error')
        console.error('[username] hata', e)
      }
    } finally {
      setSavingName(false)
    }
  }

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
      <div className="page-head with-icon">
        <span className="page-icon">
          <AccountIcon size={24} />
        </span>
        <div className="page-head-text">
          <h1>Hesap</h1>
          <p className="page-sub">Hesabını ve verilerini yönet.</p>
        </div>
      </div>

      {/* Tek liste: her ayar bir satır. Önceden her ayar ayrı panel kartıydı,
          dört kart alt alta gereksiz ağırlık yapıyordu. */}
      <div className="panel settings-list">
        <div className="setting-row">
          <div className="setting-label">
            <span>E-posta</span>
            <p className="hint">Giriş yaptığın hesap.</p>
          </div>
          <span className="muted">{user.email}</span>
        </div>

        {supabaseEnabled && (
          <div className="setting-row">
            <div className="setting-label">
              <span>Kullanıcı adı</span>
              <p className="hint">Oyuncular seni bu adla arayıp davet eder. 3-20 karakter; harf, rakam, alt çizgi.</p>
            </div>
            <div className="row setting-control" style={{ gap: 8 }}>
              <input
                value={uname}
                onChange={(e) => setUname(e.target.value)}
                placeholder="kullanici_adi"
                maxLength={20}
                aria-label="Kullanıcı adı"
              />
              <button
                className="btn btn-primary"
                onClick={saveUsername}
                disabled={savingName || !uname.trim() || uname.trim() === user.username}
              >
                {savingName ? 'Kaydediliyor…' : 'Kaydet'}
              </button>
            </div>
          </div>
        )}

        {supabaseEnabled && (
          <div className="setting-row">
            <div className="setting-label">
              <span>Davetler</span>
              <p className="hint">Bekleyen campaign davetlerin.</p>
            </div>
            <div className="row setting-control" style={{ gap: 8, alignItems: 'center' }}>
              {inviteCount > 0 && <span className="badge">{inviteCount}</span>}
              <button className="btn" onClick={() => nav('/davetler')}>
                {inviteCount > 0 ? 'Davetlere git' : 'Görüntüle'}
              </button>
            </div>
          </div>
        )}

        <div className="setting-row">
          <div className="setting-label">
            <span>Verilerini indir</span>
            <p className="hint">Tüm karakterlerin JSON dosyası olarak.</p>
          </div>
          <button className="btn" onClick={exportData} disabled={busy}>
            İndir
          </button>
        </div>
      </div>

      {/* Hesap silme ayrı kalır — yıkıcı eylem diğer ayarlarla aynı listede durmaz. */}
      <div className="panel" style={{ marginTop: 16 }}>
        <div className="danger-zone" style={{ marginTop: 0, paddingTop: 0, borderTop: 0 }}>
          <span className="rubric">Geri alınamaz</span>
          <p className="hint" style={{ margin: '0 0 12px' }}>
            Hesabını silmek tüm karakterlerini kalıcı olarak siler.
          </p>
          <button className="btn btn-danger" onClick={deleteAccount} disabled={busy}>
            Hesabımı sil
          </button>
        </div>
      </div>
    </div>
  )
}
