import { useEffect, useState } from 'react'
import { Modal } from '@/components/Modal'
import { useToast } from '@/components/Toast'
import {
  searchUsers,
  sendInvite,
  cancelInvite,
  listCampaignInvites,
  type UserSearchResult,
  type CampaignInvite,
} from '@/lib/social'

/* Oyuncu daveti ve bekleyen davetler. DM devri buradan Campaign ayarlarına
   taşındı — davet göndermekle aynı yerde durması kafa karıştırıyordu.
   Arama/davet state'i yalnız burada kullanılıyor, kendi sahipliğinde. */

export default function CampaignInviteModal({
  open,
  onClose,
  campaignId,
  campaignName,
}: {
  open: boolean
  onClose: () => void
  campaignId: string
  campaignName: string
}) {
  const toast = useToast()

  const [inviteQuery, setInviteQuery] = useState('')
  const [inviteResults, setInviteResults] = useState<UserSearchResult[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [invites, setInvites] = useState<CampaignInvite[] | null>(null)

  async function refreshInvites() {
    try {
      setInvites(await listCampaignInvites(campaignId))
    } catch (e) {
      console.error('[dm] davet listesi hatası', e)
    }
  }

  useEffect(() => {
    if (!open) return
    setInvites(null)
    setInviteResults(null)
    setInviteQuery('')
    refreshInvites()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, campaignId])

  // Canlı arama: yazdıkça (debounce 300ms) kullanıcı önerileri getir.
  useEffect(() => {
    const q = inviteQuery.trim()
    if (q.length < 2) {
      setInviteResults(null)
      setSearching(false)
      return
    }
    let cancelled = false
    setSearching(true)
    const t = setTimeout(async () => {
      try {
        const r = await searchUsers(q)
        if (!cancelled) setInviteResults(r)
      } catch (e) {
        if (!cancelled) console.error('[dm] kullanıcı arama hatası', e)
      } finally {
        if (!cancelled) setSearching(false)
      }
    }, 300)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [inviteQuery])

  async function onInvite(u: UserSearchResult) {
    try {
      await sendInvite(campaignId, u.id)
      toast(`${u.username} davet edildi.`, 'success')
      setInviteResults((prev) => (prev ? prev.filter((r) => r.id !== u.id) : prev))
      await refreshInvites()
    } catch (e) {
      console.error('Davet gönderilemedi. Tekrar dene.', e)
      toast('Davet gönderilemedi. Tekrar dene.', 'error')
    }
  }

  async function onCancelInvite(inviteId: string) {
    try {
      await cancelInvite(inviteId)
      await refreshInvites()
    } catch (e) {
      console.error('Davet iptal edilemedi. Tekrar dene.', e)
      toast('Davet iptal edilemedi. Tekrar dene.', 'error')
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Davet Et" subtitle={campaignName}>
      <label htmlFor="invite-search">Kullanıcı ara</label>
      <div style={{ position: 'relative' }}>
        <input
          id="invite-search"
          value={inviteQuery}
          onChange={(e) => setInviteQuery(e.target.value)}
          placeholder="kullanıcı adı yaz…"
        />
        {searching && (
          <span className="hint" style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)' }}>
            Aranıyor…
          </span>
        )}
      </div>
      <p className="hint" style={{ margin: '8px 0 0' }}>
        Davetli kabul edince kendi karakterini bu campaign&apos;e katar.
      </p>

      {inviteQuery.trim().length >= 2 && inviteResults !== null && (
        <div className="stack" style={{ gap: 8, marginTop: 12 }}>
          {inviteResults.length === 0 ? (
            <p className="muted">{searching ? '' : 'Eşleşen kullanıcı yok.'}</p>
          ) : (
            inviteResults.map((u) => (
              <div key={u.id} className="spread panel" style={{ padding: 12, alignItems: 'center' }}>
                <b>{u.username}</b>
                <button className="btn btn-primary" onClick={() => onInvite(u)}>
                  Davet et
                </button>
              </div>
            ))
          )}
        </div>
      )}

      <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
        <h3 style={{ fontSize: 'var(--fs-base)', marginBottom: 8 }}>Bekleyen davetler</h3>
        {invites === null ? (
          <p className="muted" style={{ margin: 0 }}>
            Yükleniyor…
          </p>
        ) : invites.filter((i) => i.status === 'pending').length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            Bekleyen davet yok.
          </p>
        ) : (
          <div className="stack" style={{ gap: 8 }}>
            {invites
              .filter((i) => i.status === 'pending')
              .map((i) => (
                <div key={i.inviteId} className="spread panel" style={{ padding: 12, alignItems: 'center' }}>
                  <span>{i.inviteeUsername ?? '—'}</span>
                  <button className="btn btn-ghost" onClick={() => onCancelInvite(i.inviteId)}>
                    İptal
                  </button>
                </div>
              ))}
          </div>
        )}
      </div>

    </Modal>
  )
}
