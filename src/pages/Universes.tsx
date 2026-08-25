import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '@/components/Toast'
import { Modal, useConfirm } from '@/components/Modal'
import RichTextEditor from '@/components/RichTextEditor'
import { Corners } from '@/components/Ornament'
import { UniverseIcon, PlusIcon } from '@/components/icons'
import { sanitizeLore, loreTextLength } from '@/lib/sanitize'
import { loadDraft, saveDraft, clearDraft } from '@/lib/draft'
import {
  listMyUniverses,
  createUniverse,
  updateUniverse,
  deleteUniverse,
  LORE_MAX_CHARS,
  MAX_UNIVERSES,
  type Universe,
} from '@/lib/universe'

/** DB kota trigger'ı (0009_universe_quota.sql) check_violation atar; mesajı aynen göster. */
function quotaText(e: unknown, fallback: string): string {
  const err = e as { code?: string; message?: string }
  return err?.code === '23514' && err.message ? err.message : fallback
}

/** Yeni evren formunun taslak yuvası. */
const DRAFT_NEW = 'new'

const LORE_LIMIT_MSG = `Lore çok uzun (en fazla ${LORE_MAX_CHARS.toLocaleString('tr-TR')} karakter).`

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
  const [createOpen, setCreateOpen] = useState(false)
  // Kaydedilmemiş taslak: yazdıkça localStorage'a düşer, Oluştur'da temizlenir.
  const [hasSavedDraft, setHasSavedDraft] = useState(() => loadDraft(DRAFT_NEW) !== null)
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
    const d = loadDraft(DRAFT_NEW)
    if (d) {
      setNewName(d.name)
      setNewDesc(d.description)
      setNewKey((k) => k + 1) // editör kayıtlı içerikle yeniden kurulur
    }
  }, [])

  // Yazdıkça taslağı sakla. 400ms debounce: her tuşta localStorage'a yazmak
  // uzun lore'da gereksiz iş çıkarır.
  useEffect(() => {
    const t = setTimeout(() => {
      saveDraft(DRAFT_NEW, { name: newName, description: newDesc })
      setHasSavedDraft(Boolean(newName.trim() || newDesc.trim()))
    }, 400)
    return () => clearTimeout(t)
  }, [newName, newDesc])

  async function onCreate(e?: React.FormEvent) {
    e?.preventDefault()
    const name = newName.trim()
    if (!name || creating) return
    setCreating(true)
    try {
      const description = sanitizeLore(newDesc)
      if (loreTextLength(description) > LORE_MAX_CHARS) {
        toast(LORE_LIMIT_MSG, 'error')
        return
      }
      await createUniverse(name, description)
      discardDraft()
      setCreateOpen(false)
      toast('Evren oluşturuldu.', 'success')
      await load()
    } catch (e2) {
      console.error('[universe] oluşturma hatası', e2)
      toast(quotaText(e2, 'Evren oluşturulamadı. Tekrar dene.'), 'error')
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
      const description = sanitizeLore(d.description)
      if (loreTextLength(description) > LORE_MAX_CHARS) {
        toast(LORE_LIMIT_MSG, 'error')
        return
      }
      await updateUniverse(u.id, { name, description })
      toast('Kaydedildi.', 'success')
      setDraft((p) => {
        const n = { ...p }
        delete n[u.id]
        return n
      })
      await load()
    } catch (e) {
      console.error('[universe] güncelleme hatası', e)
      toast(quotaText(e, 'Kaydedilemedi. Tekrar dene.'), 'error')
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

  /** Taslağı hem formdan hem depodan siler. */
  function discardDraft() {
    setNewName('')
    setNewDesc('')
    setNewKey((k) => k + 1)
    clearDraft(DRAFT_NEW)
    setHasSavedDraft(false)
  }

  function edit(u: Universe) {
    setDraft((p) => ({ ...p, [u.id]: { name: u.name, description: u.description ?? '' } }))
  }

  const atLimit = (list?.length ?? 0) >= MAX_UNIVERSES

  return (
    <div className="container" style={{ maxWidth: 820 }}>
      <div className="page-head spread" style={{ flexWrap: 'wrap', gap: 10 }}>
        <div className="row" style={{ gap: 14 }}>
          <span className="page-icon">
            <UniverseIcon size={24} />
          </span>
          <div>
            <div className="row" style={{ gap: 10 }}>
              <h1>Evrenler</h1>
              {list && <span className="section-meta">{list.length}/{MAX_UNIVERSES}</span>}
            </div>
            <p className="page-sub">Dünya/lore bilgisi. Bir evreni birden çok campaign'de kullanabilirsin.</p>
          </div>
        </div>
        <div className="row" style={{ gap: 8, alignItems: 'center' }}>
          <button className="btn btn-ghost" onClick={() => nav('/dm')}>
            ← DM Paneli
          </button>
          <button
            className="icon-btn icon-btn-primary"
            data-dot={hasSavedDraft || undefined}
            disabled={atLimit}
            title={
              atLimit
                ? `Evren limitine ulaştın (${MAX_UNIVERSES}/${MAX_UNIVERSES}). Yenisini açmak için birini sil.`
                : hasSavedDraft
                  ? 'Yeni evren — kaydedilmemiş taslağın var'
                  : 'Yeni evren'
            }
            onClick={() => setCreateOpen(true)}
          >
            <PlusIcon size={19} />
            <span className="sr-only">Yeni evren</span>
          </button>
        </div>
      </div>

      {/* Yeni evren modali — form sürekli açık durmaz, + ile gelir.
          İçerik yazılırken taslak saklanır; modal kapansa da kaybolmaz. */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Yeni evren"
        subtitle="Dünya ve lore bilgisi. Birden çok campaign'de kullanılabilir."
        wide
        footer={
          <>
            {hasSavedDraft && (
              <button className="btn btn-ghost" onClick={discardDraft} style={{ marginRight: 'auto' }}>
                Taslağı temizle
              </button>
            )}
            <button className="btn btn-ghost" onClick={() => setCreateOpen(false)}>
              Kapat
            </button>
            <button className="btn btn-primary" disabled={creating || !newName.trim()} onClick={onCreate}>
              {creating ? 'Oluşturuluyor…' : 'Oluştur'}
            </button>
          </>
        }
      >
        <form className="stack" style={{ gap: 10 }} onSubmit={onCreate}>
          <div>
            <label htmlFor="new-universe-name">Evren adı</label>
            <input
              id="new-universe-name"
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="ör. Faerûn"
              maxLength={80}
            />
          </div>
          <RichTextEditor
            key={newKey}
            value={newDesc}
            onChange={setNewDesc}
            placeholder="Dünya hakkında oyuncuların bilmesi gerekenler…"
            maxLength={LORE_MAX_CHARS}
          />
          <p className="hint" style={{ margin: 0 }}>
            {hasSavedDraft
              ? 'Yazdıkların taslak olarak saklanıyor — çıksan da kaybolmaz.'
              : 'Yazmaya başlayınca taslak otomatik saklanır.'}
          </p>
        </form>
      </Modal>

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
                      maxLength={LORE_MAX_CHARS}
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
                      <h3 style={{ fontSize: 'var(--fs-md)' }}>{u.name}</h3>
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
