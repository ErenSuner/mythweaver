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
}

let saveTimer: ReturnType<typeof setTimeout> | null = null

export const useCharacterStore = create<CharacterState>((set, get) => ({
  character: null,
  userId: null,
  adminOwnerId: null,
  saving: false,
  lastSavedAt: null,

  setUserId: (id) => set({ userId: id }),

  startNew: () => {
    const c = emptyCharacter()
    set({ character: c, adminOwnerId: null })
    return c
  },

  load: (c) => set({ character: recomputeDerived(c), adminOwnerId: null }),

  loadAsAdmin: (c, ownerId) => set({ character: recomputeDerived(c), adminOwnerId: ownerId }),

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
    const { character } = get()
    if (!character) return
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(async () => {
      set({ saving: true })
      try {
        const { adminOwnerId, userId } = get()
        // DM bağlamında owner korunarak kaydet; aksi halde normal kayıt.
        if (adminOwnerId) await adminSaveCharacter(get().character!, adminOwnerId)
        else await saveCharacter(get().character!, userId)
        set({ saving: false, lastSavedAt: Date.now() })
      } catch (e) {
        console.error('[save] hata', e)
        set({ saving: false })
      }
    }, 600)
  },
}))
