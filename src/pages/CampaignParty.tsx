import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/state/authStore'
import { myCampaigns, campaignPeers, listCharacters, type CampaignRef } from '@/lib/storage'
import { createCampaign } from '@/lib/admin-storage'
import { listMyInvites, acceptInvite, declineInvite, type MyInvite } from '@/lib/social'
import { supabaseEnabled } from '@/lib/supabase'
import { useToast } from '@/components/Toast'
import CharacterCard from '@/components/sheet/CharacterCard'
import { classById, raceById } from '@/data'
import type { Character } from '@/types/character'

interface PartyGroup {
  campaign: CampaignRef
  members: Character[]
}

export default function CampaignParty() {
  const { user, refreshRoles } = useAuthStore()
  const navigate = useNavigate()
  const toast = useToast()
  const [groups, setGroups] = useState<PartyGroup[] | null>(null)
  const [myIds, setMyIds] = useState<Set<string>>(new Set())
  const [myChars, setMyChars] = useState<Character[]>([])
  const [invites, setInvites] = useState<MyInvite[] | null>(null)
  const [pick, setPick] = useState<Record<string, string>>({})
  const [openId, setOpenId] = useState<string | null>(null)
  const [error, setError] = useState(false)
  const [newCampaign, setNewCampaign] = useState('')
  const [creating, setCreating] = useState(false)
  const [createErr, setCreateErr] = useState<string | null>(null)

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
    } catch (e) {
      const msg = e as { message?: string }
      console.error('[invite] kabul hatası', e)
      toast(msg.message ?? 'Davet kabul edilemedi.', 'error')
    }
  }

  async function onDeclineInvite(inv: MyInvite) {
    try {
      await declineInvite(inv.inviteId)
      await load()
    } catch (e) {
      console.error('[invite] reddetme hatası', e)
      toast('Davet reddedilemedi.', 'error')
    }
  }

  async function onCreateCampaign() {
    const name = newCampaign.trim()
    if (!name || creating) return
    setCreating(true)
    setCreateErr(null)
    try {
      await createCampaign(name)
      setNewCampaign('')
      await refreshRoles() // kuran DM oldu → /dm açılır
      navigate('/dm')
    } catch (e) {
      console.error('[campaign] oluşturma hatası', e)
      setCreateErr('Campaign oluşturulamadı. Tekrar dene.')
    } finally {
      setCreating(false)
    }
  }

  async function load() {
    try {
      setError(false)
      const [camps, mine, inv] = await Promise.all([
        myCampaigns(),
        listCharacters(user?.id ?? null),
        supabaseEnabled ? listMyInvites().catch(() => []) : Promise.resolve([]),
      ])
      setMyIds(new Set(mine.map((c) => c.id)))
      setMyChars(mine)
      setInvites(inv)
      const withMembers = await Promise.all(
        camps.map(async (campaign) => ({ campaign, members: await campaignPeers(campaign.id) })),
      )
      setGroups(withMembers)
    } catch (e) {
      console.error('[campaign] yükleme hatası', e)
      setError(true)
    }
  }
  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  return (
    <div className="container">
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ fontSize: 30, marginBottom: 2 }}>Campaign</h1>
        <p className="muted">Aynı maceradaki yoldaşlarının karakterleri.</p>
      </div>

      {invites && invites.length > 0 && (
        <div className="panel" style={{ marginBottom: 22, borderColor: 'var(--accent)' }}>
          <h2 style={{ fontSize: 18, marginBottom: 10 }}>Gelen davetler</h2>
          <div className="stack" style={{ gap: 12 }}>
            {invites.map((inv) => (
              <div key={inv.inviteId} className="panel" style={{ padding: 14 }}>
                <div style={{ marginBottom: 8 }}>
                  <b>{inv.campaignName}</b>
                  {inv.inviterUsername && <span className="muted"> · {inv.inviterUsername} davet etti</span>}
                </div>
                <div className="row" style={{ gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                  {myChars.length === 0 ? (
                    <span className="muted">Katılmak için önce bir karakter oluştur.</span>
                  ) : (
                    <select
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
                  <button
                    className="btn btn-primary"
                    onClick={() => onAcceptInvite(inv)}
                    disabled={myChars.length === 0}
                  >
                    Kabul et
                  </button>
                  <button className="btn btn-ghost" onClick={() => onDeclineInvite(inv)}>
                    Reddet
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {supabaseEnabled && (
        <div className="panel" style={{ marginBottom: 22 }}>
          <h2 style={{ fontSize: 18, marginBottom: 4 }}>Kendi campaign'ini kur</h2>
          <p className="muted" style={{ marginBottom: 12 }}>
            Bir campaign oluştur, otomatik olarak DM'i sen olursun ve oyuncu davet edebilirsin.
          </p>
          <form
            className="row"
            style={{ gap: 10, flexWrap: 'wrap' }}
            onSubmit={(e) => {
              e.preventDefault()
              onCreateCampaign()
            }}
          >
            <input
              value={newCampaign}
              onChange={(e) => setNewCampaign(e.target.value)}
              placeholder="ör. Kayıp Madenlerin Laneti"
              maxLength={80}
              style={{ flex: '1 1 240px' }}
            />
            <button className="btn btn-primary" type="submit" disabled={creating || !newCampaign.trim()}>
              {creating ? 'Oluşturuluyor…' : '✦ Oluştur'}
            </button>
          </form>
          {createErr && (
            <p className="muted" style={{ color: 'var(--danger, #e57373)', marginTop: 10, marginBottom: 0 }}>
              {createErr}
            </p>
          )}
        </div>
      )}

      {error ? (
        <div className="panel" style={{ textAlign: 'center', padding: 40 }}>
          <p className="muted" style={{ marginBottom: 12 }}>Campaign'ler yüklenemedi.</p>
          <button className="btn btn-primary" onClick={load}>Tekrar dene</button>
        </div>
      ) : groups === null ? (
        <p className="muted">Yükleniyor…</p>
      ) : groups.length === 0 ? (
        <div className="panel" style={{ textAlign: 'center', padding: 40 }}>
          <p className="muted">Henüz dahil olduğun bir campaign yok.</p>
        </div>
      ) : (
        groups.map((g) => (
          <section key={g.campaign.id} style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 22, marginBottom: 10 }}>{g.campaign.name}</h2>
            <div className="choice-grid">
              {g.members.map((m) => {
                const race = raceById(m.raceId)
                const klass = classById(m.classId)
                const mine = myIds.has(m.id)
                return (
                  <div key={m.id} className="choice-card" onClick={() => setOpenId(m.id)}>
                    <div className="spread">
                      <h3>{m.characterName || 'İsimsiz Kahraman'}</h3>
                      {mine && <span className="badge badge-new">sen</span>}
                    </div>
                    <p>
                      {race?.name ?? '—'} · {klass?.name ?? '—'} · Seviye {m.level}
                    </p>
                    {m.playerName && <p className="hint">Oyuncu: {m.playerName}</p>}
                  </div>
                )
              })}
            </div>

            {g.members
              .filter((m) => m.id === openId)
              .map((m) => (
                <div key={m.id} style={{ marginTop: 16 }}>
                  <div className="spread" style={{ marginBottom: 10 }}>
                    <h3 style={{ fontSize: 20 }}>{m.characterName || 'İsimsiz Kahraman'}</h3>
                    <button className="btn btn-ghost" onClick={() => setOpenId(null)}>
                      Kapat
                    </button>
                  </div>
                  {/* onEdit verilmez -> salt-okur; büyü/silah/kaynak ⓘ künyeleri yine çalışır */}
                  <CharacterCard character={m} />
                </div>
              ))}
          </section>
        ))
      )}
    </div>
  )
}
