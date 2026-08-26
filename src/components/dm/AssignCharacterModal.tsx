import { useEffect, useState } from 'react'
import { Modal } from '@/components/Modal'
import { useToast } from '@/components/Toast'
import { classById } from '@/data'
import { adminListCharacters, assignCharacter, type AdminCharacterRow } from '@/lib/admin-storage'

/* Atanmamış karakter havuzundan bu campaign'e ekleme.
   Havuzu kendi çekiyor: liste yalnız bu modal açıkken lazım, üst bileşende
   tutmak gereksiz state ve prop demekti. */

export default function AssignCharacterModal({
  open,
  onClose,
  campaignId,
  onAssigned,
}: {
  open: boolean
  onClose: () => void
  campaignId: string
  /** Atama başarılı olunca üst bileşen üye listesini tazelesin. */
  onAssigned: () => void | Promise<void>
}) {
  const toast = useToast()
  const [pool, setPool] = useState<AdminCharacterRow[] | null>(null)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setPool(null)
    adminListCharacters('unassigned')
      .then((rows) => {
        if (!cancelled) setPool(rows)
      })
      .catch((e) => {
        console.error('[dm] havuz yükleme hatası', e)
        if (cancelled) return
        toast('Karakter havuzu yüklenemedi.', 'error')
        onClose()
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  async function onAssign(row: AdminCharacterRow) {
    try {
      await assignCharacter(row.character.id, campaignId)
      onClose()
      await onAssigned()
    } catch (e) {
      console.error('Karakter eklenemedi. Tekrar dene.', e)
      toast('Karakter eklenemedi. Tekrar dene.', 'error')
    }
  }

  return (
    <Modal open={open} onClose={onClose} wide title="Karakter ekle" subtitle="Henüz bir campaign'e atanmamış karakterler">
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
  )
}
