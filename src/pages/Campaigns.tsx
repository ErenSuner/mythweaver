import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/state/authStore'
import { useInviteStore } from '@/state/inviteStore'
import { myCampaigns, campaignPeers, listCharacters, type CampaignRef } from '@/lib/storage'
import { createCampaign } from '@/lib/admin-storage'
import { getUniverse, listMyUniverses, type Universe } from '@/lib/universe'
import { supabaseEnabled } from '@/lib/supabase'
import { useToast } from '@/components/Toast'
import { Modal } from '@/components/Modal'
import { CampaignIcon, PlusIcon, UniverseIcon } from '@/components/icons'
import type { Character } from '@/types/character'

/* Campaign listesi: her campaign bir özet kart. Detay ayrı bir rotada
   (/campaign/:id) açılır — önceden hepsi tek sayfada alt alta diziliyordu
   ve hiçbirine odaklanılamıyordu. */

interface CampaignSummary {
  campaign: CampaignRef
  members: Character[]
  universe: Universe | null
}

export default function Campaigns() {
  const { user, refreshRoles } = useAuthStore()
  const navigate = useNavigate()
  const toast = useToast()
  const [rows, setRows] = useState<CampaignSummary[] | null>(null)
  const [myIds, setMyIds] = useState<Set<string>>(new Set())
  const [myChars, setMyChars] = useState<Character[]>([])
  const inviteCount = useInviteStore((s) => s.invites.length)
  const [error, setError] = useState(false)
  const [newCampaign, setNewCampaign] = useState('')
  const [creating, setCreating] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [newUniverseId, setNewUniverseId] = useState('')
  const [myUniverses, setMyUniverses] = useState<Universe[] | null>(null)

  async function load() {
    try {
      setError(false)
      const [camps, mine] = await Promise.all([myCampaigns(), listCharacters(user?.id ?? null)])
      setMyIds(new Set(mine.map((c) => c.id)))
      setMyChars(mine)

      const uniIds = Array.from(new Set(camps.map((c) => c.universeId).filter(Boolean))) as string[]
      const unis = await Promise.all(uniIds.map((id) => getUniverse(id).catch(() => null)))
      const uniById: Record<string, Universe> = {}
      for (const u of unis) if (u) uniById[u.id] = u

      const summaries = await Promise.all(
        camps.map(async (campaign) => ({
          campaign,
          members: await campaignPeers(campaign.id),
          universe: campaign.universeId ? (uniById[campaign.universeId] ?? null) : null,
        })),
      )
      setRows(summaries)
    } catch (e) {
      console.error('[campaign] liste yükleme hatası', e)
      setError(true)
    }
  }
  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  async function onCreateCampaign() {
    const name = newCampaign.trim()
    if (!name || creating) return
    setCreating(true)
    try {
      const created = await createCampaign(name, newUniverseId || null)
      setNewCampaign('')
      setNewUniverseId('')
      setCreateOpen(false)
      // Kuran otomatik DM olur; rol tazelenmeden yeni sayfada DM araçları çıkmaz.
      await refreshRoles()
      navigate(`/campaign/${created.id}`)
    } catch (e) {
      console.error('[campaign] oluşturma hatası', e)
      toast('Campaign oluşturulamadı. Tekrar dene.', 'error')
    } finally {
      setCreating(false)
    }
  }

  // Kur modalı açılınca evren listesini çek — modal kapalıyken gereksiz sorgu olmasın.
  useEffect(() => {
    if (!createOpen || !supabaseEnabled) return
    setMyUniverses(null)
    listMyUniverses()
      .then(setMyUniverses)
      .catch((e) => {
        console.error('[campaign] evren listesi', e)
        setMyUniverses([])
      })
  }, [createOpen])

  // Sahiplik ayrımı: kuran kişi DM olur. dm_user_id okunamazsa (kolon kısıtı)
  // ayrım yapılamaz — o zaman hepsi tek liste olarak gösterilir.
  const canGroup = Boolean(user) && (rows ?? []).some((r) => r.campaign.dmUserId !== null)
  const owned = canGroup ? (rows ?? []).filter((r) => r.campaign.dmUserId === user?.id) : []
  const joined = canGroup ? (rows ?? []).filter((r) => r.campaign.dmUserId !== user?.id) : (rows ?? [])

  function Card({ row }: { row: CampaignSummary }) {
    const names = row.members.map((m) => m.characterName || 'İsimsiz Kahraman')
    const mine = row.members.some((m) => myIds.has(m.id))
    return (
      <div
        className="choice-card illuminated campaign-card"
        role="link"
        tabIndex={0}
        onClick={() => navigate(`/campaign/${row.campaign.id}`)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            navigate(`/campaign/${row.campaign.id}`)
          }
        }}
      >
        <div className="spread" style={{ alignItems: 'flex-start', gap: 10 }}>
          <div style={{ minWidth: 0 }}>
            {row.universe && <span className="eyebrow">{row.universe.name}</span>}
            <h3>{row.campaign.name}</h3>
          </div>
          <div className="row" style={{ gap: 6, flexWrap: 'nowrap' }}>
            {mine && <span className="badge badge-new">sen</span>}
            <span className="badge">{row.members.length}</span>
          </div>
        </div>
        <p className="hint campaign-card-members">
          {names.length ? names.join(', ') : 'Henüz karakter yok'}
        </p>
      </div>
    )
  }

  function Group({ title, list }: { title: string; list: CampaignSummary[] }) {
    if (list.length === 0) return null // boş grubun başlığı da görünmez
    return (
      <section className="section-block">
        <div className="section-head">
          <h2>{title}</h2>
          <span className="section-meta">{list.length}</span>
        </div>
        <div className="choice-grid">
          {list.map((row) => (
            <Card key={row.campaign.id} row={row} />
          ))}
        </div>
      </section>
    )
  }

  return (
    <div className="container">
      <div className="page-head with-icon">
        <span className="page-icon">
          <CampaignIcon size={24} />
        </span>
        <div className="page-head-text">
          <h1>Campaign</h1>
          <p className="page-sub">Dahil olduğun maceralar. Ayrıntı için bir campaign seç.</p>
        </div>
        {supabaseEnabled && (
          <button
            className="btn btn-primary"
            onClick={() => {
              setNewCampaign('')
              setCreateOpen(true)
            }}
          >
            <PlusIcon size={17} style={{ verticalAlign: '-3px', marginRight: 7 }} />
            Campaign Kur
          </button>
        )}
      </div>

      {/* Davetler kendi sayfasında (/davetler): katılırken karakter seçimi
          gerekiyor ve davet campaign'e değil hesaba ait. Burada yalnız işaretçi. */}
      {inviteCount > 0 && (
        <div className="panel spread" style={{ marginBottom: 22, borderColor: 'var(--seal)' }}>
          <div className="setting-label">
            <span>{inviteCount} bekleyen davetin var.</span>
            <p className="hint">Katılacak karakteri seçmek için davetler sayfasına git.</p>
          </div>
          <button className="btn btn-primary" onClick={() => navigate('/davetler')}>
            Davetlere git
          </button>
        </div>
      )}

      {error ? (
        <div className="panel" style={{ textAlign: 'center', padding: 40 }}>
          <p className="muted" style={{ marginBottom: 12 }}>Campaign&apos;ler yüklenemedi.</p>
          <button className="btn btn-primary" onClick={load}>Tekrar dene</button>
        </div>
      ) : rows === null ? (
        <p className="muted">Yükleniyor…</p>
      ) : rows.length === 0 ? (
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
              style={{ marginTop: 12 }}
              onClick={() => {
                setNewCampaign('')
                setCreateOpen(true)
              }}
            >
              <PlusIcon size={17} style={{ verticalAlign: '-3px', marginRight: 7 }} />
              Campaign Kur
            </button>
          )}
        </div>
      ) : (
        <>
          <Group title="Senin Campaign'lerin" list={owned} />
          <Group title={canGroup ? "Katıldığın Campaign'ler" : "Campaign'lerin"} list={joined} />
        </>
      )}

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

          {/* Evren isteğe bağlı: kuruluşu tıkamasın, sonradan Campaign
              ayarlarından da atanabiliyor. */}
          <div style={{ marginTop: 16 }}>
            <label htmlFor="new-campaign-universe">Evren (isteğe bağlı)</label>
            {myUniverses === null ? (
              <p className="muted" style={{ margin: 0 }}>
                Evrenler yükleniyor…
              </p>
            ) : myUniverses.length === 0 ? (
              <>
                <p className="hint" style={{ margin: '0 0 10px' }}>
                  Henüz bir evrenin yok. Campaign&apos;i şimdi kurup evreni sonra Campaign ayarlarından
                  atayabilirsin.
                </p>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    setCreateOpen(false)
                    navigate('/evrenler')
                  }}
                >
                  <UniverseIcon size={16} style={{ verticalAlign: '-3px', marginRight: 6 }} />
                  Evren oluştur
                </button>
              </>
            ) : (
              <select
                id="new-campaign-universe"
                value={newUniverseId}
                onChange={(e) => setNewUniverseId(e.target.value)}
              >
                <option value="">— evren yok —</option>
                {myUniverses.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </form>
      </Modal>
    </div>
  )
}
