import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCharacterStore } from '@/state/characterStore'
import { useConfirm, Modal } from '@/components/Modal'
import CharacterCard from '@/components/sheet/CharacterCard'
import { classById, raceById } from '@/data'
import {
  adminListCampaigns,
  adminListCharacters,
  createCampaign,
  renameCampaign,
  deleteCampaign,
  assignCharacter,
  unassignCharacter,
  type Campaign,
  type AdminCharacterRow,
} from '@/lib/admin-storage'

export default function DMPanel() {
  const nav = useNavigate()
  const confirm = useConfirm()
  const loadAsAdmin = useCharacterStore((s) => s.loadAsAdmin)

  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [members, setMembers] = useState<AdminCharacterRow[] | null>(null)
  const [newName, setNewName] = useState('')
  const [assignOpen, setAssignOpen] = useState(false)
  const [pool, setPool] = useState<AdminCharacterRow[] | null>(null)
  const [openRow, setOpenRow] = useState<AdminCharacterRow | null>(null)

  const selected = campaigns?.find((c) => c.id === selectedId) ?? null

  async function refreshCampaigns() {
    const list = await adminListCampaigns()
    setCampaigns(list)
    if (!selectedId && list.length) setSelectedId(list[0].id)
  }
  useEffect(() => {
    refreshCampaigns()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function refreshMembers(id: string) {
    setMembers(null)
    setMembers(await adminListCharacters(id))
  }
  useEffect(() => {
    if (selectedId) refreshMembers(selectedId)
  }, [selectedId])

  async function onCreate() {
    const name = newName.trim()
    if (!name) return
    const c = await createCampaign(name)
    setNewName('')
    await refreshCampaigns()
    setSelectedId(c.id)
  }

  async function onRename() {
    if (!selected) return
    const name = window.prompt('Yeni campaign adı', selected.name)?.trim()
    if (!name || name === selected.name) return
    await renameCampaign(selected.id, name)
    refreshCampaigns()
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
    await deleteCampaign(selected.id)
    setSelectedId(null)
    setMembers(null)
    refreshCampaigns()
  }

  async function openAssign() {
    setAssignOpen(true)
    setPool(null)
    setPool(await adminListCharacters('unassigned'))
  }

  async function onAssign(row: AdminCharacterRow) {
    if (!selectedId) return
    await assignCharacter(row.character.id, selectedId)
    setAssignOpen(false)
    refreshMembers(selectedId)
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
    await unassignCharacter(row.character.id)
    if (selectedId) refreshMembers(selectedId)
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
        {campaigns === null ? (
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
              <div className="row" style={{ gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                <button className="btn btn-ghost" onClick={onRename}>
                  ✎ Yeniden adlandır
                </button>
                <button className="btn btn-danger" onClick={onDelete}>
                  Sil
                </button>
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
            <button className="btn btn-primary" onClick={openAssign}>
              + Karakter ekle
            </button>
          </div>

          {members === null ? (
            <p className="muted">Yükleniyor…</p>
          ) : members.length === 0 ? (
            <div className="panel" style={{ textAlign: 'center', padding: 30 }}>
              <p className="muted">Bu campaign'de henüz karakter yok. "Karakter ekle" ile ata.</p>
            </div>
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
    </div>
  )
}
