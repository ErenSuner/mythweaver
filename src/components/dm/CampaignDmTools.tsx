import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCharacterStore } from '@/state/characterStore'
import { useAuthStore } from '@/state/authStore'
import { useConfirm, Modal } from '@/components/Modal'
import { useToast } from '@/components/Toast'
import CharacterCard from '@/components/sheet/CharacterCard'
import { PlusIcon, EditIcon, PlayersIcon, UniverseIcon } from '@/components/icons'
import PartyStatTable from '@/components/dm/PartyStatTable'
import { classById, raceById } from '@/data'
import {
  adminListCampaigns,
  adminListCharacters,
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
import {
  searchUsers,
  sendInvite,
  cancelInvite,
  listCampaignInvites,
  transferDm,
  type UserSearchResult,
  type CampaignInvite,
} from '@/lib/social'
import { listMyUniverses, assignUniverse, type Universe } from '@/lib/universe'

/* Campaign detay sayfasina gomulen DM yonetim araclari.
   Ayri bir "DM Paneli" sekmesi yoktu edilip buraya tasindi: bir campaign'i
   yonetmek, o campaign'in sayfasinda olmali. Yalnizca campaign'in DM'ine
   ve kurucuya render edilir. */
export default function CampaignDmTools({
  campaignId,
  onCampaignChanged,
}: {
  campaignId: string
  /** Ad/evren degisince ust sayfa kendi kopyasini tazelesin diye. */
  onCampaignChanged?: () => void
}) {
  const nav = useNavigate()
  const confirm = useConfirm()
  const toast = useToast()
  const loadAsAdmin = useCharacterStore((s) => s.loadAsAdmin)
  const isAdmin = useAuthStore((s) => s.user?.isAdmin ?? false)
  const myId = useAuthStore((s) => s.user?.id ?? null)
  const refreshRoles = useAuthStore((s) => s.refreshRoles)

  const [selected, setSelected] = useState<Campaign | null>(null)
  const [members, setMembers] = useState<AdminCharacterRow[] | null>(null)
  const [assignOpen, setAssignOpen] = useState(false)
  const [pool, setPool] = useState<AdminCharacterRow[] | null>(null)
  const [openRow, setOpenRow] = useState<AdminCharacterRow | null>(null)
  const [users, setUsers] = useState<UserRow[] | null>(null)
  const [campaignsError, setCampaignsError] = useState(false)
  const [membersError, setMembersError] = useState(false)
  // Davet + DM devri (campaign'in DM'i veya kurucu için)
  const [inviteQuery, setInviteQuery] = useState('')
  const [inviteResults, setInviteResults] = useState<UserSearchResult[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [invites, setInvites] = useState<CampaignInvite[] | null>(null)
  const [universes, setUniverses] = useState<Universe[]>([])
  // Yönetim eylemleri modallerde toplanır; ekranda sürekli durmaz.
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [playersOpen, setPlayersOpen] = useState(false)
  const [renameDraft, setRenameDraft] = useState('')

  const canManageInvites = Boolean(selected && (isAdmin || selected.dm_user_id === myId))

  // Mutation sarmalı: hata → toast, sessiz kalmaz.
  async function run(fn: () => Promise<void>, errMsg: string) {
    try {
      await fn()
    } catch (e) {
      console.error(errMsg, e)
      toast(errMsg, 'error')
    }
  }

  async function refreshCampaign() {
    try {
      setCampaignsError(false)
      const all = await adminListCampaigns()
      setSelected(all.find((c) => c.id === campaignId) ?? null)
      onCampaignChanged?.()
    } catch (e) {
      console.error('[dm] campaign yükleme hatası', e)
      setCampaignsError(true)
    }
  }
  useEffect(() => {
    refreshCampaign()
    if (isAdmin) listUsers().then(setUsers).catch((e) => console.error('[dm] kullanıcı listesi', e))
    listMyUniverses().then(setUniverses).catch((e) => console.error('[dm] evren listesi', e))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId])

  async function onAssignUniverse(universeId: string | null) {
    if (!selected) return
    await run(async () => {
      await assignUniverse(selected.id, universeId)
      await refreshCampaign()
    }, 'Evren atanamadı. Tekrar dene.')
  }

  async function onSetDm(userId: string | null) {
    if (!selected) return
    await run(async () => {
      await setCampaignDm(selected.id, userId)
      await refreshCampaign()
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
  async function refreshInvites(id: string) {
    try {
      setInvites(await listCampaignInvites(id))
    } catch (e) {
      console.error('[dm] davet listesi hatası', e)
    }
  }
  useEffect(() => {
    refreshMembers(campaignId)
    setInvites(null)
    setInviteResults(null)
    setInviteQuery('')
    if (canManageInvites) refreshInvites(campaignId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId, canManageInvites])

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
    if (!selected) return
    await run(async () => {
      await sendInvite(selected.id, u.id)
      toast(`${u.username} davet edildi.`, 'success')
      setInviteResults((prev) => (prev ? prev.filter((r) => r.id !== u.id) : prev))
      await refreshInvites(selected.id)
    }, 'Davet gönderilemedi. Tekrar dene.')
  }

  async function onCancelInvite(inviteId: string) {
    if (!selected) return
    await run(async () => {
      await cancelInvite(inviteId)
      await refreshInvites(selected.id)
    }, 'Davet iptal edilemedi. Tekrar dene.')
  }

  async function onTransferDm(newDmId: string, label: string) {
    if (!selected) return
    const ok = await confirm({
      title: "DM'liği devret",
      message: (
        <>
          <b>{selected.name}</b> campaign'inin DM'liği <b>{label}</b> kişisine devredilecek. Sonrasında bu campaign
          üzerindeki yetkin sona erer, normal oyuncuya dönersin. Emin misin?
        </>
      ),
      confirmLabel: 'Evet, devret',
      danger: true,
    })
    if (!ok) return
    await run(async () => {
      await transferDm(selected.id, newDmId)
      toast('DM devredildi.', 'success')
      // Devrettikten sonra bu campaign'de yetkin kalmaz.
      await refreshRoles()
      nav('/campaign')
    }, 'DM devredilemedi. Tekrar dene.')
  }

  // Ad değişikliği ayarlar modalindeki input'tan gelir (tarayıcı prompt'u yok).
  async function onRename() {
    if (!selected) return
    const name = renameDraft.trim()
    if (!name || name === selected.name) return
    await run(async () => {
      await renameCampaign(selected.id, name)
      await refreshCampaign()
      toast('Campaign adı güncellendi.', 'success')
    }, 'Ad değiştirilemedi. Tekrar dene.')
  }

  function openSettings() {
    if (!selected) return
    setRenameDraft(selected.name)
    setSettingsOpen(true)
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
      setSettingsOpen(false)
      // Son campaign'i silindiyse DM'lik düşer; bayat isDm ile kalmasın.
      await refreshRoles()
      nav('/campaign')
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
    await run(async () => {
      await assignCharacter(row.character.id, campaignId)
      setAssignOpen(false)
      await refreshMembers(campaignId)
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
      await refreshMembers(campaignId)
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

  if (campaignsError) {
    return (
      <div className="panel" style={{ textAlign: 'center', padding: 20 }}>
        <p className="muted" style={{ marginBottom: 10 }}>DM araçları yüklenemedi.</p>
        <button className="btn btn-ghost" onClick={refreshCampaign}>Tekrar dene</button>
      </div>
    )
  }

  return (
    <>
      {selected && (
        <div style={{ marginBottom: 24 }}>
          <div className="section-head" style={{ flexWrap: 'wrap', gap: 10 }}>
            <h2>Karakterler</h2>
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              {isAdmin && (
                <button className="btn" onClick={openAssign}>
                  <PlusIcon size={17} style={{ verticalAlign: '-3px', marginRight: 7 }} />
                  Karakter Ekle
                </button>
              )}
              <button className="btn" onClick={openSettings}>
                <EditIcon size={17} style={{ verticalAlign: '-3px', marginRight: 7 }} />
                Ayarlar
              </button>
              {canManageInvites && (
                <button className="btn btn-primary" onClick={() => setPlayersOpen(true)}>
                  <PlayersIcon size={17} style={{ verticalAlign: '-3px', marginRight: 7 }} />
                  Oyuncular
                </button>
              )}
            </div>
          </div>

          {membersError ? (
            <div className="panel" style={{ textAlign: 'center', padding: 20 }}>
              <p className="muted" style={{ marginBottom: 10 }}>Karakterler yüklenemedi.</p>
              <button className="btn btn-ghost" onClick={() => refreshMembers(campaignId)}>Tekrar dene</button>
            </div>
          ) : members === null ? (
            <p className="muted">Yükleniyor…</p>
          ) : members.length === 0 ? (
            <div className="panel" style={{ textAlign: 'center', padding: 30 }}>
              <p className="muted">
                Bu campaign'de henüz karakter yok.{isAdmin ? ' "Karakter ekle" ile ata.' : ' Kurucu karakter atayınca burada görünür.'}
              </p>
            </div>
          ) : (
            /* Iki gorunum de acik: ustte ozet tablo (karsilastirma icin),
               altta kartlar (eylemler icin). Sekme yoktu; ikisi de ayni
               anda lazim oluyordu. */
            <>
              <PartyStatTable rows={members} />
              <div className="choice-grid" style={{ marginTop: 18 }}>
              {members.map((row) => {
                const c = row.character
                const race = raceById(c.raceId)
                const klass = classById(c.classId)
                return (
                  <div
                    key={c.id}
                    className={`choice-card ${c.completed ? 'illuminated' : ''}`}
                    onClick={() => setOpenRow(row)}
                  >
                    <div className="spread">
                      <div>
                        <span className="eyebrow">
                          {[race?.name, klass?.name].filter(Boolean).join(' · ') || 'Kahraman'}
                        </span>
                        <h3>{c.characterName || 'İsimsiz Kahraman'}</h3>
                      </div>
                      {!c.completed && <span className="badge">taslak</span>}
                    </div>
                    <p className="char-card-level">
                      Seviye <b>{c.level}</b>
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
            </>
          )}
        </div>
      )}

      {/* Campaign ayarları — ad, evren, DM; silme en altta ayrı bölmede */}
      {selected && (
        <Modal
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          title="Campaign ayarları"
          subtitle={selected.name}
        >
          <form
            className="stack"
            onSubmit={(e) => {
              e.preventDefault()
              onRename()
            }}
          >
            <div>
              <label htmlFor="campaign-name">Ad</label>
              <input
                id="campaign-name"
                type="text"
                value={renameDraft}
                onChange={(e) => setRenameDraft(e.target.value)}
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ alignSelf: 'flex-start' }}
              disabled={!renameDraft.trim() || renameDraft.trim() === selected.name}
            >
              Adı kaydet
            </button>
          </form>

          {canManageInvites && (
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
              <div className="spread" style={{ alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                <label htmlFor="campaign-universe" style={{ margin: 0 }}>
                  Evren
                </label>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    setSettingsOpen(false)
                    nav('/evrenler')
                  }}
                >
                  <UniverseIcon size={16} style={{ verticalAlign: '-3px', marginRight: 6 }} />
                  Evrenleri yönet
                </button>
              </div>
              <select
                id="campaign-universe"
                value={selected.universe_id ?? ''}
                onChange={(e) => onAssignUniverse(e.target.value || null)}
              >
                <option value="">— evren yok —</option>
                {universes.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
              <p className="hint" style={{ margin: '8px 0 0' }}>
                {selected.universe_id && !universes.some((u) => u.id === selected.universe_id)
                  ? '(Atanan evren başkasına ait; listede yalnız kendi evrenlerin görünür.)'
                  : 'Oyuncular lore metnini Campaign sayfasında okur.'}
              </p>
            </div>
          )}

          {isAdmin && (
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
              <label htmlFor="campaign-dm">DM</label>
              <select
                id="campaign-dm"
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
            </div>
          )}

          <div className="danger-zone">
            <span className="rubric">Geri alınamaz</span>
            <p className="hint" style={{ margin: '0 0 10px' }}>
              Campaign silinir. Karakterler silinmez, yalnız bu campaign ile bağları kopar.
            </p>
            <button type="button" className="btn btn-danger" onClick={onDelete}>
              Campaign&apos;i sil
            </button>
          </div>
        </Modal>
      )}

      {/* Oyuncular — davet gönder, bekleyenleri yönet, DM devret */}
      {selected && canManageInvites && (
        <Modal
          open={playersOpen}
          onClose={() => setPlayersOpen(false)}
          title="Oyuncular"
          subtitle={selected.name}
        >
          <label htmlFor="invite-search">Kullanıcı ara</label>
          <div style={{ position: 'relative' }}>
            <input
              id="invite-search"
              value={inviteQuery}
              onChange={(e) => setInviteQuery(e.target.value)}
              placeholder="kullanıcı adı yaz…"
            />
            {searching && (
              <span
                className="hint"
                style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)' }}
              >
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

          {(() => {
            const owners = new Map<string, string>()
            for (const r of members ?? []) {
              if (r.ownerId !== myId) owners.set(r.ownerId, r.ownerEmail ?? r.ownerId)
            }
            const list = Array.from(owners.entries())
            return (
              <div className="danger-zone">
                <span className="rubric">DM&apos;liği devret</span>
                <p className="hint" style={{ margin: '0 0 10px' }}>
                  Devrettikten sonra bu campaign üzerindeki yetkin sona erer, normal oyuncuya dönersin.
                </p>
                {list.length === 0 ? (
                  <p className="muted" style={{ margin: 0 }}>
                    Devredilecek başka üye yok — önce oyuncu davet et.
                  </p>
                ) : (
                  <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                    {list.map(([id, label]) => (
                      <button
                        key={id}
                        className="btn btn-ghost"
                        onClick={() => {
                          setPlayersOpen(false)
                          onTransferDm(id, label)
                        }}
                      >
                        {label} → DM yap
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })()}
        </Modal>
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
    </>
  )
}
