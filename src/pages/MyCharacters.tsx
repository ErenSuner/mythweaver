import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/state/authStore'
import { useCharacterStore } from '@/state/characterStore'
import { listCharacters, deleteCharacter, saveCharacter } from '@/lib/storage'
import { emptyCharacter } from '@/lib/character-factory'
import { classById, raceById } from '@/data'
import type { Character } from '@/types/character'
import { useConfirm } from '@/components/Modal'

export default function MyCharacters() {
  const { user } = useAuthStore()
  const nav = useNavigate()
  const startNew = useCharacterStore((s) => s.startNew)
  const [chars, setChars] = useState<Character[] | null>(null)
  const confirm = useConfirm()

  async function refresh() {
    setChars(await listCharacters(user?.id ?? null))
  }
  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  async function createNew() {
    const c = emptyCharacter()
    await saveCharacter(c, user?.id ?? null)
    startNew()
    useCharacterStore.getState().load(c)
    nav(`/wizard/${c.id}`)
  }

  async function remove(id: string) {
    const ok = await confirm({
      title: 'Karakteri sil',
      message: 'Bu karakter kalıcı olarak silinecek. Bu işlem geri alınamaz.',
      confirmLabel: 'Evet, sil',
      danger: true,
    })
    if (!ok) return
    await deleteCharacter(id, user?.id ?? null)
    refresh()
  }

  return (
    <div className="container">
      <div className="spread" style={{ marginBottom: 18 }}>
        <div>
          <h1 style={{ fontSize: 30, marginBottom: 2 }}>Karakterlerim</h1>
          <p className="muted">Efsanelerini burada topla.</p>
        </div>
        <button className="btn btn-primary" onClick={createNew}>
          ✦ Yeni Karakter Oluştur
        </button>
      </div>

      {chars === null ? (
        <p className="muted">Yükleniyor…</p>
      ) : chars.length === 0 ? (
        <div className="panel" style={{ textAlign: 'center', padding: 40 }}>
          <p className="muted">Henüz bir karakterin yok. İlk efsaneni dokumaya başla.</p>
          <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={createNew}>
            İlk Karakterini Oluştur
          </button>
        </div>
      ) : (
        <div className="choice-grid">
          {chars.map((c) => {
            const race = raceById(c.raceId)
            const klass = classById(c.classId)
            return (
              <div key={c.id} className="choice-card" onClick={() => nav(c.completed ? `/character/${c.id}` : `/wizard/${c.id}`)}>
                <div className="spread">
                  <h3>{c.characterName || 'İsimsiz Kahraman'}</h3>
                  {!c.completed && <span className="badge">taslak</span>}
                </div>
                <p>
                  {race?.name ?? '—'} · {klass?.name ?? '—'} · Seviye {c.level}
                </p>
                <div className="row" style={{ marginTop: 12, gap: 8 }}>
                  <button
                    className="btn btn-ghost"
                    onClick={(e) => {
                      e.stopPropagation()
                      nav(c.completed ? `/character/${c.id}` : `/wizard/${c.id}`)
                    }}
                  >
                    {c.completed ? 'Görüntüle' : 'Devam et'}
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={(e) => {
                      e.stopPropagation()
                      remove(c.id)
                    }}
                  >
                    Sil
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
