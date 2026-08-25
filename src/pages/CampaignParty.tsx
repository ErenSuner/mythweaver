import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/state/authStore'
import { myCampaigns, campaignPeers, listCharacters, type CampaignRef } from '@/lib/storage'
import { createCampaign } from '@/lib/admin-storage'
import { acceptInvite, declineInvite, type MyInvite } from '@/lib/social'
import { getUniverse, type Universe } from '@/lib/universe'
import { sanitizeLore } from '@/lib/sanitize'
import { supabaseEnabled } from '@/lib/supabase'
import { useToast } from '@/components/Toast'
import CharacterCard from '@/components/sheet/CharacterCard'
import { CampaignIcon, PlusIcon } from '@/components/icons'
import { Modal } from '@/components/Modal'
import { INVITES_ANCHOR } from '@/components/InviteMenu'
import { useInviteStore } from '@/state/inviteStore'
import { classById, raceById } from '@/data'
import type { Character } from '@/types/character'

interface PartyGroup {
  campaign: CampaignRef
  members: Character[]
}

export default function CampaignParty() {
  const { user, refreshRoles } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()
  const [groups, setGroups] = useState<PartyGroup[] | null>(null)
  const [myIds, setMyIds] = useState<Set<string>>(new Set())
  const [myChars, setMyChars] = useState<Character[]>([])
  const [universeById, setUniverseById] = useState<Record<string, Universe>>({})
  // Davetler header'daki bildirim kutusuyla ortak store'dan gelir; ikisi senkron kalır.
  const invites = useInviteStore((s) => s.invites)
  const refreshInvites = useInviteStore((s) => s.refresh)
  const [pick, setPick] = useState<Record<string, string>>({})
  const [openId, setOpenId] = useState<string | null>(null)
  const [error, setError] = useState(false)
  const [newCampaign, setNewCampaign] = useState('')
  const [creating, setCreating] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const invitesRef = useRef<HTMLDivElement>(null)

  async function onAcceptInvite(inv: MyInvite) {
    const charId = pick[inv.inviteId] || myChars[0]?.id
    if (!charId) {
      toast('Önce bir karakter oluştur.', 'error')
      return
    }
    try {
      await acceptInvite(inv.inviteId, charId)
      toast(`${inv.campaignName} campaign'ine katıldın.`, 'success')
      await load()
      await refreshInvites()
    } catch (e) {
      const msg = e as { message?: string }
      console.error('[invite] kabul hatası', e)
      toast(msg.message ?? 'Davet kabul edilemedi.', 'error')
    }
  }

  async function onDeclineInvite(inv: MyInvite) {
    try {
      await declineInvite(inv.inviteId)
      await refreshInvites()
    } catch (e) {
      console.error('[invite] reddetme hatası', e)
      toast('Davet reddedilemedi.', 'error')
    }
  }

  async function onCreateCampaign() {
    const name = newCampaign.trim()
    if (!name || creating) return
    setCreating(true)
    try {
      await createCampaign(name)
      setNewCampaign('')
      setCreateOpen(false)
      await refreshRoles() // kuran DM oldu → /dm açılır
      navigate('/dm')
    } catch (e) {
      console.error('[campaign] oluşturma hatası', e)
      toast('Campaign oluşturulamadı. Tekrar dene.', 'error')
    } finally {
      setCreating(false)
    }
  }

  async function load() {
    try {
      setError(false)
      const [camps, mine] = await Promise.all([
        myCampaigns(),
        listCharacters(user?.id ?? null),
        refreshInvites(),
      ])
      setMyIds(new Set(mine.map((c) => c.id)))
      setMyChars(mine)
      const withMembers = await Promise.all(
        camps.map(async (campaign) => ({ campaign, members: await campaignPeers(campaign.id) })),
      )
      setGroups(withMembers)
      // Atanmış evrenlerin lore'unu çek (RLS: üye okuyabilir).
      const uniIds = Array.from(new Set(camps.map((c) => c.universeId).filter(Boolean))) as string[]
      const unis = await Promise.all(uniIds.map((id) => getUniverse(id).catch(() => null)))
      const map: Record<string, Universe> = {}
      for (const u of unis) if (u) map[u.id] = u
      setUniverseById(map)
    } catch (e) {
      console.error('[campaign] yükleme hatası', e)
      setError(true)
    }
  }
  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  // Bildirim kutusundan `#gelen-davetler` ile gelindiğinde panele kaydır.
  // location.key bağımlılığı: aynı adrese tekrar tıklanınca da çalışsın.
  useEffect(() => {
    if (location.hash !== `#${INVITES_ANCHOR}`) return
    if (invites.length === 0) return
    invitesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [location.key, location.hash, invites.length])

  // Açık karakter tüm gruplarda aranır; modal tek yerde render edilir.
  const openChar = groups?.flatMap((g) => g.members).find((m) => m.id === openId) ?? null

  return (
    <div className="container">
      <div className="page-head with-icon">
        <span className="page-icon">
          <CampaignIcon size={24} />
        </span>
        <div className="page-head-text">
          <h1>Campaign</h1>
          <p className="page-sub">Aynı maceradaki yoldaşlarının karakterleri.</p>
        </div>
        {supabaseEnabled && (
          <button
            className="icon-btn icon-btn-primary"
            title="Kendi campaign'ini kur"
            onClick={() => {
              setNewCampaign('')
              setCreateOpen(true)
            }}
          >
            <PlusIcon size={19} />
            <span className="sr-only">Kendi campaign&apos;ini kur</span>
          </button>
        )}
      </div>

      {/* Gelen davetler — eyleme çağıran tek uyarı, o yüzden ekranda kalır.
          İç içe panel yerine tek satırlık kayıtlar. */}
      {invites.length > 0 && (
        <div
          id={INVITES_ANCHOR}
          ref={invitesRef}
          className="panel stack"
          style={{ marginBottom: 22, borderColor: 'var(--seal)' }}
        >
          <span className="rubric">Gelen davetler</span>
          {invites.map((inv) => (
            <div key={inv.inviteId} className="setting-row" style={{ padding: '12px 0' }}>
              <div className="setting-label">
                <span>{inv.campaignName}</span>
                {inv.inviterUsername && <p className="hint">{inv.inviterUsername} davet etti</p>}
              </div>
              <div className="row setting-control" style={{ gap: 8, alignItems: 'center' }}>
                {myChars.length === 0 ? (
                  <span className="muted">Katılmak için önce bir karakter oluştur.</span>
                ) : (
                  <select
                    aria-label="Katılacak karakter"
                    value={pick[inv.inviteId] ?? myChars[0]?.id ?? ''}
                    onChange={(e) => setPick((p) => ({ ...p, [inv.inviteId]: e.target.value }))}
                  >
                    {myChars.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.characterName || 'İsimsiz Kahraman'}
                      </option>
                    ))}
                  </select>
                )}
                <button className="btn btn-primary" onClick={() => onAcceptInvite(inv)} disabled={myChars.length === 0}>
                  Kabul et
                </button>
                <button className="btn btn-ghost" onClick={() => onDeclineInvite(inv)}>
                  Reddet
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Campaign kurma modalı */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Kendi campaign'ini kur"
        subtitle="Kuran DM olur; sonra oyuncu davet edebilirsin."
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setCreateOpen(false)}>
              Vazgeç
            </button>
            <button className="btn btn-primary" disabled={creating || !newCampaign.trim()} onClick={onCreateCampaign}>
              {creating ? 'Oluşturuluyor…' : 'Oluştur'}
            </button>
          </>
        }
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            onCreateCampaign()
          }}
        >
          <label htmlFor="new-campaign-name">Campaign adı</label>
          <input
            id="new-campaign-name"
            autoFocus
            value={newCampaign}
            onChange={(e) => setNewCampaign(e.target.value)}
            placeholder="ör. Kayıp Madenlerin Laneti"
            maxLength={80}
          />
        </form>
      </Modal>

      {error ? (
        <div className="panel" style={{ textAlign: 'center', padding: 40 }}>
          <p className="muted" style={{ marginBottom: 12 }}>Campaign'ler yüklenemedi.</p>
          <button className="btn btn-primary" onClick={load}>Tekrar dene</button>
        </div>
      ) : groups === null ? (
        <p className="muted">Yükleniyor…</p>
      ) : groups.length === 0 ? (
        <div className="panel empty-state">
          <span className="empty-icon">
            <CampaignIcon size={44} />
          </span>
          <p className="muted">
            Henüz dahil olduğun bir campaign yok. Bir davet gelince burada görünür. Kendi campaign&apos;ini kurarsan
            DM olursun ve DM Paneli açılır.
          </p>
          {supabaseEnabled && (
            <button
              className="btn btn-primary"
              onClick={() => {
                setNewCampaign('')
                setCreateOpen(true)
              }}
            >
              Kendi Campaign&apos;ini Kur
            </button>
          )}
        </div>
      ) : (
        groups.map((g) => (
          <section key={g.campaign.id} className="section-block">
            <span className="eyebrow">Kampanya</span>
            <div className="section-head">
              <h2 className="campaign-name">{g.campaign.name}</h2>
              <span className="section-meta">{g.members.length} kahraman</span>
            </div>
            {g.campaign.universeId && universeById[g.campaign.universeId] && (
              <details className="panel" style={{ marginBottom: 12 }}>
                <summary style={{ cursor: 'pointer', fontWeight: 600 }}>
                  Evren: {universeById[g.campaign.universeId].name}
                </summary>
                {universeById[g.campaign.universeId].description ? (
                  <div
                    className="lore"
                    style={{ marginTop: 10 }}
                    dangerouslySetInnerHTML={{
                      __html: sanitizeLore(universeById[g.campaign.universeId].description ?? ''),
                    }}
                  />
                ) : (
                  <p className="muted" style={{ marginTop: 10, marginBottom: 0 }}>Lore henüz yazılmamış.</p>
                )}
              </details>
            )}
            <div className="choice-grid">
              {g.members.map((m) => {
                const race = raceById(m.raceId)
                const klass = classById(m.classId)
                const mine = myIds.has(m.id)
                return (
                  <div key={m.id} className="choice-card illuminated" onClick={() => setOpenId(m.id)}>
                    <div className="spread">
                      <div>
                        <span className="eyebrow">
                          {[race?.name, klass?.name].filter(Boolean).join(' · ') || 'Kahraman'}
                        </span>
                        <h3>{m.characterName || 'İsimsiz Kahraman'}</h3>
                      </div>
                      {mine && <span className="badge badge-new">sen</span>}
                    </div>
                    <p className="char-card-level">
                      Seviye <b>{m.level}</b>
                    </p>
                    {m.playerName && <p className="hint">Oyuncu: {m.playerName}</p>}
                  </div>
                )
              })}
            </div>

          </section>
        ))
      )}

      {/* Karakter detayı — satır içi açılım sayfayı itiyordu; DM panelindeki
          gibi modalde gösterilir. onEdit verilmez, salt-okur. */}
      {openChar && (
        <Modal
          open={Boolean(openChar)}
          onClose={() => setOpenId(null)}
          wide
          title={openChar.characterName || 'İsimsiz Kahraman'}
          subtitle={openChar.playerName ? `Oyuncu: ${openChar.playerName}` : undefined}
        >
          <CharacterCard character={openChar} />
        </Modal>
      )}
    </div>
  )
}
