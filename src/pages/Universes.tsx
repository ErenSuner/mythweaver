import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '@/components/Toast'
import { useConfirm } from '@/components/Modal'
import RichTextEditor from '@/components/RichTextEditor'
import { Corners } from '@/components/Ornament'
import { UniverseIcon } from '@/components/icons'
import { sanitizeLore } from '@/lib/sanitize'
import {
  listMyUniverses,
  createUniverse,
  updateUniverse,
  deleteUniverse,
  type Universe,
} from '@/lib/universe'

export default function Universes() {
  const nav = useNavigate()
  const toast = useToast()
  const confirm = useConfirm()
  const [list, setList] = useState<Universe[] | null>(null)
  const [error, setError] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newKey, setNewKey] = useState(0) // editörü temizlemek için remount
  const [creating, setCreating] = useState(false)
  // Düzenleme taslakları: id -> {name, description}
  const [draft, setDraft] = useState<Record<string, { name: string; description: string }>>({})

  async function load() {
    try {
      setError(false)
      setList(await listMyUniverses())
    } catch (e) {
      console.error('[universe] yükleme hatası', e)
      setError(true)
    }
  }
  useEffect(() => {
    load()
  }, [])

  async function onCreate(e: React.FormEvent) {
    e.preventDefault()
    const name = newName.trim()
    if (!name || creating) return
    setCreating(true)
    try {
      await createUniverse(name, sanitizeLore(newDesc))
      setNewName('')
      setNewDesc('')
      setNewKey((k) => k + 1)
      toast('Evren oluşturuldu.', 'success')
      await load()
    } catch (e2) {
      console.error('[universe] oluşturma hatası', e2)
      toast('Evren oluşturulamadı. Tekrar dene.', 'error')
    } finally {
      setCreating(false)
    }
  }

  async function onSave(u: Universe) {
    const d = draft[u.id]
    if (!d) return
    const name = d.name.trim()
    if (!name) {
      toast('İsim boş olamaz.', 'error')
      return
    }
    try {
      await updateUniverse(u.id, { name, description: sanitizeLore(d.description) })
      toast('Kaydedildi.', 'success')
      setDraft((p) => {
        const n = { ...p }
        delete n[u.id]
        return n
      })
      await load()
    } catch (e) {
      console.error('[universe] güncelleme hatası', e)
      toast('Kaydedilemedi. Tekrar dene.', 'error')
    }
  }

  async function onDelete(u: Universe) {
    const ok = await confirm({
      title: 'Evreni sil',
      message: (
        <>
          <b>{u.name}</b> evreni silinecek. Bu evreni kullanan campaign'ler silinmez, yalnız evren ataması kaldırılır.
          Bu işlem geri alınamaz.
        </>
      ),
      confirmLabel: 'Evet, sil',
      danger: true,
    })
    if (!ok) return
    try {
      await deleteUniverse(u.id)
      await load()
    } catch (e) {
      console.error('[universe] silme hatası', e)
      toast('Silinemedi. Tekrar dene.', 'error')
    }
  }

  function edit(u: Universe) {
    setDraft((p) => ({ ...p, [u.id]: { name: u.name, description: u.description ?? '' } }))
  }

  return (
    <div className="container" style={{ maxWidth: 820 }}>
      <div className="page-head spread" style={{ flexWrap: 'wrap', gap: 10 }}>
        <div className="row" style={{ gap: 14 }}>
          <span className="page-icon">
            <UniverseIcon size={24} />
          </span>
          <div>
            <h1>Evrenler</h1>
            <p className="page-sub">Dünya/lore bilgisi. Bir evreni birden çok campaign'de kullanabilirsin.</p>
          </div>
        </div>
        <button className="btn btn-ghost" onClick={() => nav('/dm')}>
          ← DM Paneli
        </button>
      </div>

      <form className="panel stack" style={{ gap: 10, marginBottom: 22 }} onSubmit={onCreate}>
        <h2 style={{ fontSize: 18 }}>Yeni evren</h2>
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Evren adı (ör. Faerûn)"
          maxLength={80}
        />
        <RichTextEditor
          key={newKey}
          value={newDesc}
          onChange={setNewDesc}
          placeholder="Dünya hakkında oyuncuların bilmesi gerekenler…"
        />
        <button className="btn btn-primary" type="submit" disabled={creating || !newName.trim()} style={{ alignSelf: 'flex-start' }}>
          {creating ? 'Oluşturuluyor…' : '✦ Oluştur'}
        </button>
      </form>

      {error ? (
        <div className="panel" style={{ textAlign: 'center', padding: 30 }}>
          <p className="muted" style={{ marginBottom: 10 }}>Evrenler yüklenemedi.</p>
          <button className="btn btn-ghost" onClick={load}>Tekrar dene</button>
        </div>
      ) : list === null ? (
        <p className="muted">Yükleniyor…</p>
      ) : list.length === 0 ? (
        <div className="panel empty-state">
          <span className="empty-icon">
            <UniverseIcon size={44} />
          </span>
          <p className="muted">Henüz evrenin yok. Yukarıdan ilk dünyanı oluştur.</p>
        </div>
      ) : (
        <div className="stack" style={{ gap: 14 }}>
          {list.map((u) => {
            const d = draft[u.id]
            return (
              <div key={u.id} className={`panel stack${d ? '' : ' artifact'}`} style={{ gap: 10 }}>
                {!d && <Corners />}
                {d ? (
                  <>
                    <input
                      value={d.name}
                      onChange={(e) => setDraft((p) => ({ ...p, [u.id]: { ...d, name: e.target.value } }))}
                      maxLength={80}
                    />
                    <RichTextEditor
                      value={d.description}
                      onChange={(html) => setDraft((p) => ({ ...p, [u.id]: { ...d, description: html } }))}
                      placeholder="Dünya hakkında oyuncuların bilmesi gerekenler…"
                    />
                    <div className="row" style={{ gap: 8 }}>
                      <button className="btn btn-primary" onClick={() => onSave(u)}>
                        Kaydet
                      </button>
                      <button
                        className="btn btn-ghost"
                        onClick={() =>
                          setDraft((p) => {
                            const n = { ...p }
                            delete n[u.id]
                            return n
                          })
                        }
                      >
                        Vazgeç
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="spread" style={{ flexWrap: 'wrap', gap: 8 }}>
                      <h3 style={{ fontSize: 20 }}>{u.name}</h3>
                      <div className="row" style={{ gap: 8 }}>
                        <button className="btn btn-ghost" onClick={() => edit(u)}>
                          ✎ Düzenle
                        </button>
                        <button className="btn btn-danger" onClick={() => onDelete(u)}>
                          Sil
                        </button>
                      </div>
                    </div>
                    {u.description ? (
                      <div className="lore" dangerouslySetInnerHTML={{ __html: sanitizeLore(u.description) }} />
                    ) : (
                      <p className="muted" style={{ margin: 0 }}>Açıklama yok.</p>
                    )}
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
