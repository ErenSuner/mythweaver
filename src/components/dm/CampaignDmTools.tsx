import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCharacterStore } from '@/state/characterStore'
import { useAuthStore } from '@/state/authStore'
import { useConfirm, Modal } from '@/components/Modal'
import CampaignSettingsModal from '@/components/dm/CampaignSettingsModal'
import CampaignPlayersModal from '@/components/dm/CampaignPlayersModal'
import AssignCharacterModal from '@/components/dm/AssignCharacterModal'
import { useToast } from '@/components/Toast'
import CharacterCard from '@/components/sheet/CharacterCard'
import { PlusIcon, EditIcon, PlayersIcon } from '@/components/icons'
import PartyStatTable from '@/components/dm/PartyStatTable'
import { classById, raceById } from '@/data'
import {
  adminListCampaigns,
  adminListCharacters,
  unassignCharacter,
  type Campaign,
  type AdminCharacterRow,
} from '@/lib/admin-storage'

/* Campaign detay sayfasina gomulen DM yonetim araclari.
   Ayrı bir "DM Paneli" sekmesi kaldırılıp buraya taşındı: bir campaign'i
   yönetmek, o campaign'in sayfasında olmalı. Yalnızca campaign'in DM'ine
   ve kurucuya render edilir.

   Üç büyük modal (ayarlar, oyuncular, karakter atama) kendi dosyalarında;
   her biri kendi state'ini ve veri çekimini sahipleniyor. */
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

  const [selected, setSelected] = useState<Campaign | null>(null)
  const [members, setMembers] = useState<AdminCharacterRow[] | null>(null)
  const [assignOpen, setAssignOpen] = useState(false)
  const [openRow, setOpenRow] = useState<AdminCharacterRow | null>(null)
  const [campaignsError, setCampaignsError] = useState(false)
  const [membersError, setMembersError] = useState(false)
  // Yönetim eylemleri modallerde toplanır; ekranda sürekli durmaz.
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [playersOpen, setPlayersOpen] = useState(false)

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId])

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
                <button className="btn" onClick={() => setAssignOpen(true)}>
                  <PlusIcon size={17} style={{ verticalAlign: '-3px', marginRight: 7 }} />
                  Karakter Ekle
                </button>
              )}
              <button className="btn" onClick={() => setSettingsOpen(true)}>
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

      {selected && (
        <CampaignSettingsModal
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          campaign={selected}
          canManage={canManageInvites}
          onChanged={refreshCampaign}
        />
      )}

      {selected && canManageInvites && (
        <CampaignPlayersModal
          open={playersOpen}
          onClose={() => setPlayersOpen(false)}
          campaignId={campaignId}
          campaignName={selected.name}
          members={members}
        />
      )}

      <AssignCharacterModal
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        campaignId={campaignId}
        onAssigned={() => refreshMembers(campaignId)}
      />

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
