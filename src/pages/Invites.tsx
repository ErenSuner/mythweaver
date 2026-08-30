import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/state/authStore'
import { useInviteStore } from '@/state/inviteStore'
import { listCharacters, myMemberships, type Membership } from '@/lib/storage'
import { acceptInvite, declineInvite, type MyInvite } from '@/lib/social'
import { supabaseEnabled } from '@/lib/supabase'
import { useToast } from '@/components/Toast'
import { BellIcon } from '@/components/icons'
import type { Character } from '@/types/character'

/* Davetler kendi sayfasında. Önceden campaign listesine gömülüydü; bildirim
   zili de var olmayan bir çapaya (#gelen-davetler) gidiyordu. Kabul/red artık
   yalnız burada — /campaign sadece buraya yönlendirir.

   Davet listesi tek kaynaktan (useInviteStore) okunur; zil de aynı store'u
   kullandığı için sayaçlar ayrışamaz. */

export default function Invites() {
  const { user } = useAuthStore()
  const nav = useNavigate()
  const toast = useToast()
  const invites = useInviteStore((s) => s.invites)
  const loaded = useInviteStore((s) => s.loaded)
  const refreshInvites = useInviteStore((s) => s.refresh)

  const [myChars, setMyChars] = useState<Character[]>([])
  const [memberships, setMemberships] = useState<Membership[]>([])
  const [pick, setPick] = useState<Record<string, string>>({})
  const [busyId, setBusyId] = useState<string | null>(null)

  async function loadChars() {
    try {
      const [chars, mems] = await Promise.all([listCharacters(user?.id ?? null), myMemberships()])
      setMyChars(chars)
      setMemberships(mems)
    } catch (e) {
      console.error('[invite] karakter/üyelik yüklenemedi', e)
    }
  }

  useEffect(() => {
    void loadChars()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  /** karakter id -> içinde bulunduğu campaign adı. Yalnız KENDİ karakterlerim:
      myMemberships DM/kurucu için başkalarının satırlarını da döndürür. */
  const busyChars = useMemo(() => {
    const mine = new Set(myChars.map((c) => c.id))
    const m = new Map<string, string>()
    for (const row of memberships) {
      if (mine.has(row.characterId)) m.set(row.characterId, row.campaignName)
    }
    return m
  }, [myChars, memberships])

  const freeChars = useMemo(() => myChars.filter((c) => !busyChars.has(c.id)), [myChars, busyChars])

  function chosenFor(inviteId: string): string | undefined {
    const picked = pick[inviteId]
    if (picked && !busyChars.has(picked)) return picked
    return freeChars[0]?.id
  }

  async function onAccept(inv: MyInvite) {
    const charId = chosenFor(inv.inviteId)
    if (!charId) {
      toast('Katılacak boş bir karakterin yok.', 'error')
      return
    }
    setBusyId(inv.inviteId)
    try {
      await acceptInvite(inv.inviteId, charId)
      toast(`${inv.campaignName} campaign'ine katıldın.`, 'success')
      // Realtime yankısına güvenme, açıkça tazele.
      await Promise.all([refreshInvites(), loadChars()])
    } catch (e) {
      // Boş/dolu hesabı istemci tarafında; yarış durumunda sunucunun kendi
      // Türkçe mesajı ('Bu karakter zaten bir campaign'de.') son savunma.
      const msg = e as { message?: string }
      console.error('[invite] kabul hatası', e)
      toast(msg.message ?? 'Davet kabul edilemedi.', 'error')
    } finally {
      setBusyId(null)
    }
  }

  async function onDecline(inv: MyInvite) {
    setBusyId(inv.inviteId)
    try {
      await declineInvite(inv.inviteId)
      await refreshInvites()
    } catch (e) {
      console.error('[invite] reddetme hatası', e)
      toast('Davet reddedilemedi.', 'error')
    } finally {
      setBusyId(null)
    }
  }

  const allBusy = myChars.length > 0 && freeChars.length === 0

  return (
    <div className="container" style={{ maxWidth: 820 }}>
      <div className="page-head with-icon">
        <span className="page-icon">
          <BellIcon size={24} />
        </span>
        <div className="page-head-text">
          <h1>Davetler</h1>
          <p className="page-sub">Sana gelen campaign davetleri. Katılacak karakteri seçip kabul et.</p>
        </div>
      </div>

      {!supabaseEnabled ? (
        <div className="panel" style={{ textAlign: 'center', padding: 40 }}>
          <p className="muted">Davetler yalnız çevrimiçi modda çalışır.</p>
        </div>
      ) : !loaded ? (
        <p className="muted">Yükleniyor…</p>
      ) : invites.length === 0 ? (
        <div className="panel empty-state">
          <span className="empty-icon">
            <BellIcon size={44} />
          </span>
          <p className="muted">
            Bekleyen davetin yok. Bir DM seni campaign&apos;ine çağırdığında burada görünür.
          </p>
        </div>
      ) : (
        <div className="panel stack" style={{ borderColor: 'var(--seal)' }}>
          <span className="rubric">Gelen davetler</span>

          {myChars.length === 0 && (
            <p className="hint" style={{ margin: 0 }}>
              Katılmak için önce bir karakter oluşturmalısın. <Link to="/">Karakterlerim</Link>
            </p>
          )}
          {allBusy && (
            <p className="hint" style={{ margin: 0 }}>
              Tüm karakterlerin başka campaign&apos;lerde. Katılmak için{' '}
              <Link to="/campaign">birinden ayrıl</Link> ya da <Link to="/">yeni bir karakter oluştur</Link>.
            </p>
          )}

          {invites.map((inv) => (
            <div key={inv.inviteId} className="setting-row" style={{ padding: '12px 0' }}>
              <div className="setting-label">
                <span>{inv.campaignName}</span>
                {inv.inviterUsername && <p className="hint">{inv.inviterUsername} davet etti</p>}
              </div>
              <div className="row setting-control" style={{ gap: 8, alignItems: 'center' }}>
                {myChars.length > 0 && (
                  <select
                    aria-label="Katılacak karakter"
                    value={chosenFor(inv.inviteId) ?? ''}
                    disabled={allBusy}
                    onChange={(e) => setPick((p) => ({ ...p, [inv.inviteId]: e.target.value }))}
                  >
                    {myChars.map((c) => {
                      const inCampaign = busyChars.get(c.id)
                      const name = c.characterName || 'İsimsiz Kahraman'
                      return (
                        <option key={c.id} value={c.id} disabled={Boolean(inCampaign)}>
                          {inCampaign ? `${name} — ${inCampaign}'de` : name}
                        </option>
                      )
                    })}
                  </select>
                )}
                <button
                  className="btn btn-primary"
                  onClick={() => onAccept(inv)}
                  disabled={freeChars.length === 0 || busyId === inv.inviteId}
                >
                  Kabul et
                </button>
                <button className="btn btn-ghost" onClick={() => onDecline(inv)} disabled={busyId === inv.inviteId}>
                  Reddet
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="row" style={{ marginTop: 18 }}>
        <button className="btn btn-ghost" onClick={() => nav('/campaign')}>
          ← Campaign&apos;ler
        </button>
      </div>
    </div>
  )
}
