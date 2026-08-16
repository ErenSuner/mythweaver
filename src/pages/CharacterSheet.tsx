import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuthStore } from '@/state/authStore'
import { useCharacterStore } from '@/state/characterStore'
import { getCharacter, deleteCharacter } from '@/lib/storage'
import CharacterCard from '@/components/sheet/CharacterCard'
import LevelUpPanel from '@/components/sheet/LevelUpPanel'
import { useConfirm } from '@/components/Modal'
import ConditionsReference from '@/components/sheet/ConditionsReference'

export default function CharacterSheet() {
  const { id } = useParams()
  const nav = useNavigate()
  const { user } = useAuthStore()
  const { character, load, update } = useCharacterStore()
  const [showLevelUp, setShowLevelUp] = useState(false)
  const confirm = useConfirm()

  useEffect(() => {
    if (character?.id === id) return
    ;(async () => {
      const c = await getCharacter(id!, user?.id ?? null)
      if (c) load(c)
      else nav('/')
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  if (!character) return <div className="container">Yükleniyor…</div>

  const hasNew = character.lastGainedFeatureKeys.length > 0

  return (
    <div className="container">
      <div className="spread" style={{ marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <button className="btn btn-ghost" onClick={() => nav('/')}>
          ← Karakterlerim
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
              await deleteCharacter(character.id, user?.id ?? null)
              nav('/')
            }}
          >
            Sil
          </button>
        </div>
      </div>

      {showLevelUp && <LevelUpPanel onClose={() => setShowLevelUp(false)} />}

      <CharacterCard character={character} onEdit={(key) => nav(`/wizard/${character.id}?step=${key}`)} />

      <ConditionsReference />
    </div>
  )
}
