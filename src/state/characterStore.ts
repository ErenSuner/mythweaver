import { create } from 'zustand'
import type { Character } from '@/types/character'
import { emptyCharacter } from '@/lib/character-factory'
import { saveCharacter } from '@/lib/storage'
import { recomputeDerived } from '@/lib/derive'

interface CharacterState {
  character: Character | null
  userId: string | null
  saving: boolean
  lastSavedAt: number | null
  setUserId: (id: string | null) => void
  startNew: () => Character
  load: (c: Character) => void
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
  saving: false,
  lastSavedAt: null,

  setUserId: (id) => set({ userId: id }),

  startNew: () => {
    const c = emptyCharacter()
    set({ character: c })
    return c
  },

  load: (c) => set({ character: recomputeDerived(c) }),

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
    const { character, userId } = get()
    if (!character) return
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(async () => {
      set({ saving: true })
      try {
        await saveCharacter(get().character!, userId)
        set({ saving: false, lastSavedAt: Date.now() })
      } catch (e) {
        console.error('[save] hata', e)
        set({ saving: false })
      }
    }, 600)
  },
}))
