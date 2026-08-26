import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Modal, useConfirm } from '@/components/Modal'
import { useToast } from '@/components/Toast'
import { useAuthStore } from '@/state/authStore'
import { UniverseIcon } from '@/components/icons'
import { renameCampaign, deleteCampaign, setCampaignDm, listUsers, type Campaign, type UserRow } from '@/lib/admin-storage'
import { listMyUniverses, assignUniverse, type Universe } from '@/lib/universe'

/* Campaign ayarları: ad, evren, DM ataması ve silme.
   Evren/kullanıcı listelerini kendi çekiyor — ikisi de yalnız burada
   kullanılıyordu, üst bileşende tutmak gereksiz state demekti. */

export default function CampaignSettingsModal({
  open,
  onClose,
  campaign,
  canManage,
  onChanged,
}: {
  open: boolean
  onClose: () => void
  campaign: Campaign
  /** Campaign'in DM'i ya da kurucu: evren atayabilir. */
  canManage: boolean
  /** Ad/evren/DM değişince üst bileşen kendi kopyasını tazelesin. */
  onChanged: () => void | Promise<void>
}) {
  const nav = useNavigate()
  const toast = useToast()
  const confirm = useConfirm()
  const isAdmin = useAuthStore((s) => s.user?.isAdmin ?? false)
  const refreshRoles = useAuthStore((s) => s.refreshRoles)

  const [renameDraft, setRenameDraft] = useState(campaign.name)
  const [universes, setUniverses] = useState<Universe[]>([])
  const [users, setUsers] = useState<UserRow[] | null>(null)

  useEffect(() => {
    if (!open) return
    setRenameDraft(campaign.name)
    listMyUniverses()
      .then(setUniverses)
      .catch((e) => console.error('[dm] evren listesi', e))
    if (isAdmin) listUsers().then(setUsers).catch((e) => console.error('[dm] kullanıcı listesi', e))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, campaign.id])

  // Mutation sarmalı: hata → toast, sessiz kalmaz.
  async function run(fn: () => Promise<void>, errMsg: string) {
    try {
      await fn()
    } catch (e) {
      console.error(errMsg, e)
      toast(errMsg, 'error')
    }
  }

  // Ad değişikliği modaldeki input'tan gelir (tarayıcı prompt'u yok).
  async function onRename() {
    const name = renameDraft.trim()
    if (!name || name === campaign.name) return
    await run(async () => {
      await renameCampaign(campaign.id, name)
      await onChanged()
      toast('Campaign adı güncellendi.', 'success')
    }, 'Ad değiştirilemedi. Tekrar dene.')
  }

  async function onAssignUniverse(universeId: string | null) {
    await run(async () => {
      await assignUniverse(campaign.id, universeId)
      await onChanged()
    }, 'Evren atanamadı. Tekrar dene.')
  }

  async function onSetDm(userId: string | null) {
    await run(async () => {
      await setCampaignDm(campaign.id, userId)
      await onChanged()
    }, 'DM atanamadı. Tekrar dene.')
  }

  async function onDelete() {
    const ok = await confirm({
      title: 'Campaign sil',
      message: (
        <>
          <b>{campaign.name}</b> campaign&apos;i silinecek. Karakterler silinmez, yalnız bu campaign&apos;den
          çıkarılır. Bu işlem geri alınamaz.
        </>
      ),
      confirmLabel: 'Evet, sil',
      danger: true,
    })
    if (!ok) return
    await run(async () => {
      await deleteCampaign(campaign.id)
      onClose()
      // Son campaign'i silindiyse DM'lik düşer; bayat isDm ile kalmasın.
      await refreshRoles()
      nav('/campaign')
    }, 'Campaign silinemedi. Tekrar dene.')
  }

  return (
    <Modal open={open} onClose={onClose} title="Campaign ayarları" subtitle={campaign.name}>
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault()
          onRename()
        }}
      >
        <div>
          <label htmlFor="campaign-name">Ad</label>
          <input id="campaign-name" type="text" value={renameDraft} onChange={(e) => setRenameDraft(e.target.value)} />
        </div>
        <button
          type="submit"
          className="btn btn-primary"
          style={{ alignSelf: 'flex-start' }}
          disabled={!renameDraft.trim() || renameDraft.trim() === campaign.name}
        >
          Adı kaydet
        </button>
      </form>

      {canManage && (
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
          <div className="spread" style={{ alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
            <label htmlFor="campaign-universe" style={{ margin: 0 }}>
              Evren
            </label>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                onClose()
                nav('/evrenler')
              }}
            >
              <UniverseIcon size={16} style={{ verticalAlign: '-3px', marginRight: 6 }} />
              Evrenleri yönet
            </button>
          </div>
          <select
            id="campaign-universe"
            value={campaign.universe_id ?? ''}
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
            {campaign.universe_id && !universes.some((u) => u.id === campaign.universe_id)
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
            value={campaign.dm_user_id ?? ''}
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
  )
}
