import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuthStore } from '@/state/authStore'
import { myCampaigns, campaignPeers, listCharacters, type CampaignRef } from '@/lib/storage'
import { getUniverse, type Universe } from '@/lib/universe'
import { sanitizeLore } from '@/lib/sanitize'
import { Modal } from '@/components/Modal'
import CharacterCard from '@/components/sheet/CharacterCard'
import CampaignDmTools from '@/components/dm/CampaignDmTools'
import { Corners, Flourish } from '@/components/Ornament'
import { CampaignIcon } from '@/components/icons'
import { classById, raceById } from '@/data'
import type { Character } from '@/types/character'

/* Tek bir campaign'in sayfası. Liste /campaign'de (Campaigns.tsx).
   Kullanıcı bu campaign'in DM'i (ya da kurucu) ise yönetim araçları da
   burada görünür — ayrı bir "DM Paneli" sekmesi yok, bir campaign'i
   yönetmek onun kendi sayfasında olur. */

export default function CampaignParty() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuthStore()
  const navigate = useNavigate()

  const [campaign, setCampaign] = useState<CampaignRef | null>(null)
  const [members, setMembers] = useState<Character[] | null>(null)
  const [universe, setUniverse] = useState<Universe | null>(null)
  const [myIds, setMyIds] = useState<Set<string>>(new Set())
  const [openId, setOpenId] = useState<string | null>(null)
  const [error, setError] = useState(false)
  const [notFound, setNotFound] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    try {
      setError(false)
      setNotFound(false)
      // RLS zaten filtreliyor: listede yoksa bu campaign'e erişim yok.
      const camps = await myCampaigns()
      const found = camps.find((c) => c.id === id) ?? null
      if (!found) {
        setNotFound(true)
        return
      }
      setCampaign(found)
      const [peers, mine, uni] = await Promise.all([
        campaignPeers(found.id),
        listCharacters(user?.id ?? null),
        found.universeId ? getUniverse(found.universeId).catch(() => null) : Promise.resolve(null),
      ])
      setMembers(peers)
      setMyIds(new Set(mine.map((c) => c.id)))
      setUniverse(uni)
    } catch (e) {
      console.error('[campaign] detay yükleme hatası', e)
      setError(true)
    }
  }, [id, user])

  useEffect(() => {
    load()
  }, [load])

  const isDm = Boolean(user && campaign && (user.isAdmin || campaign.dmUserId === user.id))
  const openChar = members?.find((m) => m.id === openId) ?? null

  function BackButton() {
    return (
      <button className="btn btn-ghost" onClick={() => navigate('/campaign')}>
        ← Campaign&apos;ler
      </button>
    )
  }

  if (notFound) {
    return (
      <div className="container">
        <div className="panel empty-state">
          <span className="empty-icon">
            <CampaignIcon size={44} />
          </span>
          <p className="muted">Bu campaign bulunamadı ya da erişimin yok.</p>
          <div style={{ marginTop: 12 }}>
            <BackButton />
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container">
        <div className="panel" style={{ textAlign: 'center', padding: 40 }}>
          <p className="muted" style={{ marginBottom: 12 }}>Campaign yüklenemedi.</p>
          <BackButton />
        </div>
      </div>
    )
  }

  if (!campaign) return <div className="container">Yükleniyor…</div>

  return (
    <div className="container">
      <div className="page-head with-icon">
        <span className="page-icon">
          <CampaignIcon size={24} />
        </span>
        <div className="page-head-text">
          <span className="eyebrow">{isDm ? 'DM olduğun campaign' : 'Campaign'}</span>
          <h1>{campaign.name}</h1>
          <p className="page-sub">{members === null ? 'Yükleniyor…' : `${members.length} kahraman`}</p>
        </div>
        <BackButton />
      </div>

      {isDm ? (
        /* DM için yönetim araçları karakter listesini de kendisi çizer:
           özet tablo + kartlar, atama, çıkarma, düzenleme. */
        <CampaignDmTools campaignId={campaign.id} onCampaignChanged={load} />
      ) : members === null ? (
        <p className="muted">Yükleniyor…</p>
      ) : members.length === 0 ? (
        <div className="panel empty-state">
          <p className="muted">Bu campaign&apos;de henüz karakter yok.</p>
        </div>
      ) : (
        <div className="choice-grid">
          {members.map((m) => {
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
      )}

      {/* Evren sayfanın en altında, açık ve tezhipli. Katlanabilir başlık
          değil: lore okunacak metin, saklanacak ayrıntı değil.
          Ad bölüm başlığında yaldızla duruyor ki neyin adı olduğu belli olsun;
          kart içinde tekrar edilmiyor. */}
      {universe && (
        <section className="universe-section">
          <div className="section-head">
            <h2>
              Evren: <span className="campaign-name">{universe.name}</span>
            </h2>
          </div>
          <div className="panel artifact universe-block">
            <Corners />
            <Flourish />
            {universe.description ? (
              <div className="lore" dangerouslySetInnerHTML={{ __html: sanitizeLore(universe.description) }} />
            ) : (
              <p className="muted" style={{ margin: 0 }}>Lore henüz yazılmamış.</p>
            )}
          </div>
        </section>
      )}

      {/* Karakter detayı modalde — DM panelindeki davranışın aynısı.
          onEdit verilmez, salt-okur. */}
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
