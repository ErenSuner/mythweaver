import { create } from 'zustand'
import type { Character } from '@/types/character'
import { emptyCharacter } from '@/lib/character-factory'
import { saveCharacter } from '@/lib/storage'
import { adminSaveCharacter } from '@/lib/admin-storage'
import { recomputeDerived } from '@/lib/derive'

interface CharacterState {
  character: Character | null
  userId: string | null
  /** DM düzenleme bağlamı: doluysa kaydetme owner'ı korur (sahiplik kaymaz). */
  adminOwnerId: string | null
  saving: boolean
  /** Son kayıt denemesi hata verdiyse true — gösterge "kaydedilemedi" göstersin. */
  saveError: boolean
  lastSavedAt: number | null
  setUserId: (id: string | null) => void
  startNew: () => Character
  load: (c: Character) => void
  /** DM olarak bir oyuncunun karakterini düzenleme moduna yükle. */
  loadAsAdmin: (c: Character, ownerId: string) => void
  update: (patch: Partial<Character>) => void
  updateFn: (fn: (c: Character) => void) => void
  replace: (c: Character) => void
  setStep: (n: number) => void
  save: () => Promise<void>
  /** Bekleyen debounce'lı kaydı iptal edip hemen diske yazar (karakter değişimi / sekme kapanışı). */
  flushSave: () => Promise<void>
}

// Bekleyen kayıt, schedule anında yakalanan snapshot ile tutulur — böylece timer
// ateşlendiğinde (ya da flush'ta) store başka karaktere geçmiş olsa bile DOĞRU
// karakter yazılır (save race + karakter-değişimi veri kaybı önlenir).
let saveTimer: ReturnType<typeof setTimeout> | null = null
let pending: { snap: Character; owner: string | null; uid: string | null } | null = null

async function persist(
  set: (p: Partial<CharacterState>) => void,
  snap: Character,
  owner: string | null,
  uid: string | null,
): Promise<void> {
  set({ saving: true })
  try {
    if (owner) await adminSaveCharacter(snap, owner)
    else await saveCharacter(snap, uid)
    set({ saving: false, saveError: false, lastSavedAt: Date.now() })
  } catch (e) {
    console.error('[save] hata', e)
    set({ saving: false, saveError: true })
  }
}

export const useCharacterStore = create<CharacterState>((set, get) => {
  // Karakter değişiminden önce bekleyen kaydı diske indir (yeni karakteri ezmeden).
  async function flush(): Promise<void> {
    if (saveTimer) {
      clearTimeout(saveTimer)
      saveTimer = null
    }
    if (!pending) return
    const p = pending
    pending = null
    await persist(set, p.snap, p.owner, p.uid)
  }

  return {
    character: null,
    userId: null,
    adminOwnerId: null,
    saving: false,
    saveError: false,
    lastSavedAt: null,

    setUserId: (id) => set({ userId: id }),

    startNew: () => {
      void flush()
      const c = emptyCharacter()
      set({ character: c, adminOwnerId: null, saveError: false })
      return c
    },

    load: (c) => {
      void flush()
      set({ character: recomputeDerived(c), adminOwnerId: null, saveError: false })
    },

    loadAsAdmin: (c, ownerId) => {
      void flush()
      set({ character: recomputeDerived(c), adminOwnerId: ownerId, saveError: false })
    },

    update: (patch) => {
      const cur = get().character
      if (!cur) return
      const next = recomputeDerived({ ...cur, ...patch })
      set({ character: next })
      get().save()
    },

    updateFn: (fn) => {
      const cur = get().character
      if (!cur) return
      const draft = structuredClone(cur)
      fn(draft)
      const next = recomputeDerived(draft)
      set({ character: next })
      get().save()
    },

    replace: (c) => {
      set({ character: recomputeDerived(c) })
      get().save()
    },

    setStep: (n) => {
      const cur = get().character
      if (!cur) return
      set({ character: { ...cur, wizardStep: n } })
      get().save()
    },

    save: async () => {
      const { character, adminOwnerId, userId } = get()
      if (!character) return
      // En güncel snapshot'ı yakala; bekleyen timer'ı yeniden zamanla.
      pending = { snap: character, owner: adminOwnerId, uid: userId }
      if (saveTimer) clearTimeout(saveTimer)
      saveTimer = setTimeout(() => {
        saveTimer = null
        const p = pending
        pending = null
        if (p) void persist(set, p.snap, p.owner, p.uid)
      }, 600)
    },

    flushSave: flush,
  }
})
