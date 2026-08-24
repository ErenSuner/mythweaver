import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/state/authStore'
import { useCharacterStore } from '@/state/characterStore'
import { listCharacters, deleteCharacter, saveCharacter } from '@/lib/storage'
import { emptyCharacter } from '@/lib/character-factory'
import { classById, raceById } from '@/data'
import type { Character } from '@/types/character'
import { useConfirm } from '@/components/Modal'
import { useToast } from '@/components/Toast'
import { CharactersIcon, PlusIcon } from '@/components/icons'

export default function MyCharacters() {
  const { user } = useAuthStore()
  const nav = useNavigate()
  const startNew = useCharacterStore((s) => s.startNew)
  const [chars, setChars] = useState<Character[] | null>(null)
  const [error, setError] = useState(false)
  const confirm = useConfirm()
  const toast = useToast()

  async function refresh() {
    try {
      setError(false)
      setChars(await listCharacters(user?.id ?? null))
    } catch (e) {
      console.error('[karakterler] yükleme hatası', e)
      setError(true)
    }
  }
  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  async function createNew() {
    try {
      const c = emptyCharacter()
      await saveCharacter(c, user?.id ?? null)
      startNew()
      useCharacterStore.getState().load(c)
      nav(`/wizard/${c.id}`)
    } catch (e) {
      console.error('[karakter oluştur] hata', e)
      toast('Karakter oluşturulamadı. Bağlantını kontrol et.', 'error')
    }
  }

  async function remove(id: string) {
    const ok = await confirm({
      title: 'Karakteri sil',
      message: 'Bu karakter kalıcı olarak silinecek. Bu işlem geri alınamaz.',
      confirmLabel: 'Evet, sil',
      danger: true,
    })
    if (!ok) return
    try {
      await deleteCharacter(id, user?.id ?? null)
      refresh()
    } catch (e) {
      console.error('[karakter sil] hata', e)
      toast('Karakter silinemedi. Tekrar dene.', 'error')
    }
  }

  return (
    <div className="container">
      <div className="page-head spread">
        <div className="row" style={{ gap: 14 }}>
          <span className="page-icon">
            <CharactersIcon size={24} />
          </span>
          <div>
            <h1>Karakterlerim</h1>
            <p className="page-sub">Efsanelerini burada topla.</p>
          </div>
        </div>
        <button className="btn btn-primary" onClick={createNew}>
          <PlusIcon size={16} style={{ verticalAlign: '-3px', marginRight: 6 }} />
          Yeni Karakter Oluştur
        </button>
      </div>

      {error ? (
        <div className="panel" style={{ textAlign: 'center', padding: 40 }}>
          <p className="muted" style={{ marginBottom: 12 }}>Karakterler yüklenemedi.</p>
          <button className="btn btn-primary" onClick={refresh}>Tekrar dene</button>
        </div>
      ) : chars === null ? (
        <p className="muted">Yükleniyor…</p>
      ) : chars.length === 0 ? (
        <div className="panel empty-state">
          <span className="empty-icon">
            <CharactersIcon size={44} />
          </span>
          <p className="muted">Henüz bir karakterin yok. İlk efsaneni dokumaya başla.</p>
          <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={createNew}>
            <PlusIcon size={16} style={{ verticalAlign: '-3px', marginRight: 6 }} />
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
