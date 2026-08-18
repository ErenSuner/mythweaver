import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuthStore } from '@/state/authStore'
import { useCharacterStore } from '@/state/characterStore'
import { getCharacter, deleteCharacter } from '@/lib/storage'
import { adminGetCharacter } from '@/lib/admin-storage'
import CharacterCard from '@/components/sheet/CharacterCard'
import LevelUpPanel from '@/components/sheet/LevelUpPanel'
import { useConfirm } from '@/components/Modal'
import { useToast } from '@/components/Toast'
import ConditionsReference from '@/components/sheet/ConditionsReference'

export default function CharacterSheet() {
  const { id } = useParams()
  const nav = useNavigate()
  const { user } = useAuthStore()
  const { character, load, loadAsAdmin, update } = useCharacterStore()
  const [showLevelUp, setShowLevelUp] = useState(false)
  // DM başka oyuncunun karakterini görüntülüyorsa e-posta; kendi karakteri/normal ise null
  const [dmOwnerEmail, setDmOwnerEmail] = useState<string | null>(null)
  const [loadError, setLoadError] = useState(false)
  const confirm = useConfirm()
  const toast = useToast()

  async function loadSheet() {
    try {
      setLoadError(false)
      // DM ise owner'ı öğrenmek için admin yolundan çek (bant + owner-safe kayıt için)
      if (user?.isAdmin) {
        const row = await adminGetCharacter(id!)
        if (!row) return nav('/dm')
        if (row.ownerId === user.id) {
          setDmOwnerEmail(null)
          if (character?.id !== id) load(row.character)
        } else {
          setDmOwnerEmail(row.ownerEmail ?? '—')
          loadAsAdmin(row.character, row.ownerId)
        }
        return
      }
      if (character?.id === id) return
      const c = await getCharacter(id!, user?.id ?? null)
      if (c) load(c)
      else nav('/')
    } catch (e) {
      console.error('[karakter] yükleme hatası', e)
      setLoadError(true)
    }
  }
  useEffect(() => {
    loadSheet()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  if (!character) {
    if (loadError) {
      return (
        <div className="container" style={{ textAlign: 'center', padding: 50 }}>
          <p className="muted" style={{ marginBottom: 12 }}>Karakter yüklenemedi.</p>
          <button className="btn btn-primary" onClick={loadSheet}>Tekrar dene</button>
        </div>
      )
    }
    return <div className="container">Yükleniyor…</div>
  }

  const hasNew = character.lastGainedFeatureKeys.length > 0

  const isDmView = Boolean(dmOwnerEmail)

  return (
    <div className="container">
      {isDmView && (
        <div className="info" style={{ borderColor: 'var(--danger)', marginBottom: 14 }}>
          ⚠ <b>DM modu:</b> <b>{dmOwnerEmail}</b> oyuncusunun karakteri. Yaptığın değişiklikler doğrudan oyuncuya yansır.
        </div>
      )}
      <div className="spread" style={{ marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <button className="btn btn-ghost" onClick={() => nav(isDmView ? '/dm' : '/')}>
          ← {isDmView ? 'DM Paneli' : 'Karakterlerim'}
        </button>
        <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
          {hasNew && (
            <button className="btn" onClick={() => update({ lastGainedFeatureKeys: [] })}>
              YENİ rozetlerini gördüm ✓
            </button>
          )}
          <button className="btn" onClick={() => nav(`/wizard/${character.id}?step=race`)}>
            ✎ Baştan Düzenle
          </button>
          <button className="btn btn-primary" onClick={() => setShowLevelUp((v) => !v)} disabled={character.level >= 20}>
            ⬆ Seviye Atla ({character.level} → {Math.min(character.level + 1, 20)})
          </button>
          {/* DM başkasının karakterini silemez — buton yalnız sahibe */}
          {!isDmView && (
            <button
              className="btn btn-danger"
              onClick={async () => {
                const ok = await confirm({
                  title: 'Karakteri sil',
                  message: (
                    <>
                      <b>{character.characterName || 'Bu karakter'}</b> kalıcı olarak silinecek. Bu işlem geri alınamaz.
                    </>
                  ),
                  confirmLabel: 'Evet, sil',
                  danger: true,
                })
                if (!ok) return
                try {
                  await deleteCharacter(character.id, user?.id ?? null)
                  nav('/')
                } catch (e) {
                  console.error('[karakter sil] hata', e)
                  toast('Karakter silinemedi. Tekrar dene.', 'error')
                }
              }}
            >
              Sil
            </button>
          )}
        </div>
      </div>

      {showLevelUp && <LevelUpPanel onClose={() => setShowLevelUp(false)} />}

      <CharacterCard character={character} onEdit={(key) => nav(`/wizard/${character.id}?step=${key}`)} />

      <ConditionsReference />
    </div>
  )
}
