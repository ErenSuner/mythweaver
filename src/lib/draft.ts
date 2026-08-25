/**
 * Kaydedilmemiş form taslakları için küçük localStorage sarmalayıcısı.
 *
 * Amaç: kullanıcı uzun bir lore yazıp "Oluştur"a basmadan sayfadan çıkarsa
 * yazdığı kaybolmasın. Sunucuya değil tarayıcıya yazılır — taslak henüz
 * kimseye ait bir kayıt değil.
 *
 * Depolama tek bir anahtarda toplanır; `slot` hangi formun taslağı olduğunu
 * söyler ('new' ya da düzenlenen kaydın id'si).
 */

export interface UniverseDraft {
  name: string
  description: string
}

const KEY = 'mythweaver:universe-drafts'

type Store = Record<string, UniverseDraft>

function readStore(): Store {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    return parsed as Store
  } catch {
    // bozuk JSON ya da depolama kapalı: taslak yok say, akış bozulmasın
    return {}
  }
}

function writeStore(store: Store) {
  try {
    if (Object.keys(store).length === 0) localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, JSON.stringify(store))
  } catch {
    // özel sekme / kota dolu: taslak bu oturumda kalıcı olmaz, hata gösterilmez
  }
}

/** Taslağı oku. Boş taslak (ad ve açıklama ikisi de boş) yok sayılır. */
export function loadDraft(slot: string): UniverseDraft | null {
  const d = readStore()[slot]
  if (!d) return null
  if (!d.name?.trim() && !d.description?.trim()) return null
  return { name: d.name ?? '', description: d.description ?? '' }
}

/** Taslağı yaz. İçerik tamamen boşaldıysa kaydı siler — çöp taslak birikmez. */
export function saveDraft(slot: string, draft: UniverseDraft) {
  const store = readStore()
  if (!draft.name.trim() && !draft.description.trim()) delete store[slot]
  else store[slot] = draft
  writeStore(store)
}

export function clearDraft(slot: string) {
  const store = readStore()
  delete store[slot]
  writeStore(store)
}

export function hasDraft(slot: string): boolean {
  return loadDraft(slot) !== null
}
