import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCharacterStore } from '@/state/characterStore'
import { useAuthStore } from '@/state/authStore'
import { useConfirm, Modal } from '@/components/Modal'
import { useToast } from '@/components/Toast'
import CharacterCard from '@/components/sheet/CharacterCard'
import PartyStatTable from '@/components/dm/PartyStatTable'
import FounderOps from '@/components/dm/FounderOps'
import { classById, raceById } from '@/data'
import {
  adminListCampaigns,
  adminListCharacters,
  createCampaign,
  renameCampaign,
  deleteCampaign,
  assignCharacter,
  unassignCharacter,
  setCampaignDm,
  listUsers,
  type Campaign,
  type AdminCharacterRow,
  type UserRow,
} from '@/lib/admin-storage'

export default function DMPanel() {
  const nav = useNavigate()
  const confirm = useConfirm()
  const toast = useToast()
  const loadAsAdmin = useCharacterStore((s) => s.loadAsAdmin)
  const isAdmin = useAuthStore((s) => s.user?.isAdmin ?? false)

  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [members, setMembers] = useState<AdminCharacterRow[] | null>(null)
  const [newName, setNewName] = useState('')
  const [assignOpen, setAssignOpen] = useState(false)
  const [pool, setPool] = useState<AdminCharacterRow[] | null>(null)
  const [openRow, setOpenRow] = useState<AdminCharacterRow | null>(null)
  const [membersView, setMembersView] = useState<'summary' | 'cards'>('summary')
  const [users, setUsers] = useState<UserRow[] | null>(null)
  const [campaignsError, setCampaignsError] = useState(false)
  const [membersError, setMembersError] = useState(false)

  const selected = campaigns?.find((c) => c.id === selectedId) ?? null

  // Mutation sarmalı: hata → toast, sessiz kalmaz.
  async function run(fn: () => Promise<void>, errMsg: string) {
    try {
      await fn()
    } catch (e) {
      console.error(errMsg, e)
      toast(errMsg, 'error')
    }
  }

  async function refreshCampaigns() {
    try {
      setCampaignsError(false)
      const list = await adminListCampaigns()
      setCampaigns(list)
      if (!selectedId && list.length) setSelectedId(list[0].id)
    } catch (e) {
      console.error('[dm] campaign yükleme hatası', e)
      setCampaignsError(true)
    }
  }
  useEffect(() => {
    refreshCampaigns()
    if (isAdmin) listUsers().then(setUsers).catch((e) => console.error('[dm] kullanıcı listesi', e))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function onSetDm(userId: string | null) {
    if (!selected) return
    await run(async () => {
      await setCampaignDm(selected.id, userId)
      await refreshCampaigns()
    }, 'DM atanamadı. Tekrar dene.')
  }

  async function refreshMembers(id: string) {
    setMembers(null)
    try {
      setMembersError(false)
      setMembers(await adminListCharacters(id))
    } catch (e) {
      console.error('[dm] üye yükleme hatası', e)
      setMembersError(true)
    }
  }
  useEffect(() => {
    if (selectedId) refreshMembers(selectedId)
  }, [selectedId])

  async function onCreate() {
    const name = newName.trim()
    if (!name) return
    await run(async () => {
      const c = await createCampaign(name)
      setNewName('')
      await refreshCampaigns()
      setSelectedId(c.id)
    }, 'Campaign oluşturulamadı. Tekrar dene.')
  }

  async function onRename() {
    if (!selected) return
    const name = window.prompt('Yeni campaign adı', selected.name)?.trim()
    if (!name || name === selected.name) return
    await run(async () => {
      await renameCampaign(selected.id, name)
      await refreshCampaigns()
    }, 'Ad değiştirilemedi. Tekrar dene.')
  }

  async function onDelete() {
    if (!selected) return
    const ok = await confirm({
      title: 'Campaign sil',
      message: (
        <>
          <b>{selected.name}</b> campaign'i silinecek. Karakterler silinmez, yalnız bu campaign'den çıkarılır. Bu işlem geri
          alınamaz.
        </>
      ),
      confirmLabel: 'Evet, sil',
      danger: true,
    })
    if (!ok) return
    await run(async () => {
      await deleteCampaign(selected.id)
      setSelectedId(null)
      setMembers(null)
      await refreshCampaigns()
    }, 'Campaign silinemedi. Tekrar dene.')
  }

  async function openAssign() {
    setAssignOpen(true)
    setPool(null)
    try {
      setPool(await adminListCharacters('unassigned'))
    } catch (e) {
      console.error('[dm] havuz yükleme hatası', e)
      toast('Karakter havuzu yüklenemedi.', 'error')
      setAssignOpen(false)
    }
  }

  async function onAssign(row: AdminCharacterRow) {
    if (!selectedId) return
    await run(async () => {
      await assignCharacter(row.character.id, selectedId)
      setAssignOpen(false)
      await refreshMembers(selectedId)
    }, 'Karakter eklenemedi. Tekrar dene.')
  }

  async function onUnassign(row: AdminCharacterRow) {
    const ok = await confirm({
      title: "Campaign'den çıkar",
      message: (
        <>
          <b>{row.character.characterName || 'Bu karakter'}</b> bu campaign'den çıkarılacak. (Karakter silinmez.)
        </>
      ),
      confirmLabel: 'Çıkar',
    })
    if (!ok) return
    await run(async () => {
      await unassignCharacter(row.character.id)
      if (selectedId) await refreshMembers(selectedId)
    }, 'Karakter çıkarılamadı. Tekrar dene.')
  }

  async function onEdit(row: AdminCharacterRow) {
    const ok = await confirm({
      title: 'Oyuncu karakterini düzenle',
      message: (
        <>
          <b>{row.character.characterName || 'Bu karakter'}</b> adlı karakteri{' '}
          <b>{row.ownerEmail ?? 'bilinmeyen oyuncu'}</b> adına düzenliyorsun. Yaptığın değişiklikler oyuncunun sayfasına
          doğrudan yansır.
        </>
      ),
      confirmLabel: 'Anladım, düzenle',
      danger: true,
    })
    if (!ok) return
    // Store'a owner-safe yükle; wizard aynı id'yi yeniden yüklemez, adminOwnerId korunur.
    loadAsAdmin(row.character, row.ownerId)
    nav(`/wizard/${row.character.id}?step=identity`)
  }

  return (
    <div className="container">
      <div className="spread" style={{ marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 30, marginBottom: 2 }}>DM Paneli</h1>
          <p className="muted">Campaign'lerini yönet, oyuncuların karakterlerini gör ve düzenle.</p>
        </div>
        <button className="btn btn-ghost" onClick={() => nav('/')}>
          ← Karakterlerim
        </button>
      </div>

      {/* Campaign seçici + oluştur */}
      <div className="panel" style={{ marginBottom: 18 }}>
        <label>Campaign'ler</label>
        {campaignsError ? (
          <div className="row" style={{ gap: 10, marginTop: 6, alignItems: 'center' }}>
            <span className="muted">Campaign'ler yüklenemedi.</span>
            <button className="btn btn-ghost" onClick={refreshCampaigns}>Tekrar dene</button>
          </div>
        ) : campaigns === null ? (
          <p className="muted">Yükleniyor…</p>
        ) : (
          <>
            <div className="row" style={{ gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
              {campaigns.length === 0 && <span className="muted">Henüz campaign yok. Aşağıdan oluştur.</span>}
              {campaigns.map((c) => (
                <button
                  key={c.id}
                  className={`badge${c.id === selectedId ? ' badge-new' : ''}`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSelectedId(c.id)}
                >
                  {c.name}
                </button>
              ))}
            </div>
            {/* seçili campaign yönetimi */}
            {selected && (
              <div className="row" style={{ gap: 8, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <button className="btn btn-ghost" onClick={onRename}>
                  ✎ Yeniden adlandır
                </button>
                <button className="btn btn-danger" onClick={onDelete}>
                  Sil
                </button>
                {isAdmin && (
                  <label className="row" style={{ gap: 6, alignItems: 'center', marginLeft: 4 }}>
                    <span className="hint">DM:</span>
                    <select
                      value={selected.dm_user_id ?? ''}
                      onChange={(e) => onSetDm(e.target.value || null)}
                      disabled={users === null}
                    >
                      <option value="">— DM yok —</option>
                      {(users ?? []).map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.email ?? u.id}
                          {u.isAdmin ? ' (kurucu)' : ''}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
            )}

            {/* yeni campaign oluştur — karakter oluşturmadaki input deseniyle */}
            <form
              onSubmit={(e) => {
                e.preventDefault()
                onCreate()
              }}
              style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--line)' }}
            >
              <div className="row" style={{ gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div style={{ flex: '1 1 260px' }}>
                  <label htmlFor="new-campaign">Yeni campaign</label>
                  <input
                    id="new-campaign"
                    type="text"
                    placeholder="ör. Kayıp Madenlerin Laneti"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    style={{ marginTop: 6 }}
                  />
                </div>
                <button type="submit" className="btn btn-primary" disabled={!newName.trim()}>
                  ✦ Oluştur
                </button>
              </div>
            </form>
          </>
        )}
      </div>

      {/* Seçili campaign üyeleri */}
      {selected && (
        <div style={{ marginBottom: 24 }}>
          <div className="spread" style={{ marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
            <h2 style={{ fontSize: 22 }}>{selected.name} — Karakterler</h2>
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              {members && members.length > 0 && (
                <div className="row" style={{ gap: 4 }}>
                  <button
                    className={`btn btn-ghost${membersView === 'summary' ? ' badge-new' : ''}`}
                    onClick={() => setMembersView('summary')}
                  >
                    Özet
                  </button>
                  <button
                    className={`btn btn-ghost${membersView === 'cards' ? ' badge-new' : ''}`}
                    onClick={() => setMembersView('cards')}
                  >
                    Kartlar
                  </button>
                </div>
              )}
              {isAdmin && (
                <button className="btn btn-primary" onClick={openAssign}>
                  + Karakter ekle
                </button>
              )}
            </div>
          </div>

          {membersError ? (
            <div className="panel" style={{ textAlign: 'center', padding: 20 }}>
              <p className="muted" style={{ marginBottom: 10 }}>Karakterler yüklenemedi.</p>
              <button className="btn btn-ghost" onClick={() => selectedId && refreshMembers(selectedId)}>Tekrar dene</button>
            </div>
          ) : members === null ? (
            <p className="muted">Yükleniyor…</p>
          ) : members.length === 0 ? (
            <div className="panel" style={{ textAlign: 'center', padding: 30 }}>
              <p className="muted">
                Bu campaign'de henüz karakter yok.{isAdmin ? ' "Karakter ekle" ile ata.' : ' Kurucu karakter atayınca burada görünür.'}
              </p>
            </div>
          ) : membersView === 'summary' ? (
            <PartyStatTable rows={members} />
          ) : (
            <div className="choice-grid">
              {members.map((row) => {
                const c = row.character
                const race = raceById(c.raceId)
                const klass = classById(c.classId)
                return (
                  <div key={c.id} className="choice-card" onClick={() => setOpenRow(row)}>
                    <div className="spread">
                      <h3>{c.characterName || 'İsimsiz Kahraman'}</h3>
                      {!c.completed && <span className="badge">taslak</span>}
                    </div>
                    <p>
                      {race?.name ?? '—'} · {klass?.name ?? '—'} · Seviye {c.level}
                    </p>
                    <p className="hint">Oyuncu: {row.ownerEmail ?? '—'}</p>
                    <div className="row" style={{ marginTop: 12, gap: 8 }}>
                      <button
                        className="btn btn-ghost"
                        onClick={(e) => {
                          e.stopPropagation()
                          setOpenRow(row)
                        }}
                      >
                        Görüntüle
                      </button>
                      <button
                        className="btn btn-ghost"
                        onClick={(e) => {
                          e.stopPropagation()
                          onUnassign(row)
                        }}
                      >
                        Çıkar
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Karakter atama modalı */}
      <Modal open={assignOpen} onClose={() => setAssignOpen(false)} wide title="Karakter ekle" subtitle="Henüz bir campaign'e atanmamış karakterler">
        {pool === null ? (
          <p className="muted">Yükleniyor…</p>
        ) : pool.length === 0 ? (
          <p className="muted">Atanmamış karakter yok.</p>
        ) : (
          <div className="stack" style={{ gap: 8 }}>
            {pool.map((row) => {
              const c = row.character
              const klass = classById(c.classId)
              return (
                <div key={c.id} className="spread panel" style={{ padding: 12 }}>
                  <div>
                    <b>{c.characterName || 'İsimsiz Kahraman'}</b>
                    <div className="hint">
                      {klass?.name ?? '—'} · Sv {c.level} · {row.ownerEmail ?? '—'}
                    </div>
                  </div>
                  <button className="btn btn-primary" onClick={() => onAssign(row)}>
                    Ekle
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </Modal>

      {/* Karakter görüntüleme (salt-okur) + düzenle */}
      {openRow && (
        <Modal
          open={Boolean(openRow)}
          onClose={() => setOpenRow(null)}
          wide
          title={openRow.character.characterName || 'İsimsiz Kahraman'}
          subtitle={`Oyuncu: ${openRow.ownerEmail ?? '—'}`}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setOpenRow(null)}>
                Kapat
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  const row = openRow
                  setOpenRow(null)
                  onEdit(row)
                }}
              >
                ✎ Düzenle
              </button>
            </>
          }
        >
          {/* onEdit verilmez -> salt-okur; ⓘ künyeleri çalışır */}
          <CharacterCard character={openRow.character} />
        </Modal>
      )}

      {/* Kurucu ops — yalnız founder */}
      {isAdmin && <FounderOps />}
    </div>
  )
}
