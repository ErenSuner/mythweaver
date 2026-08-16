import { useCharacterStore } from '@/state/characterStore'
import type { Character } from '@/types/character'

// Wizard adımlarında character non-null garanti (host yükler)
export function useChar() {
  const character = useCharacterStore((s) => s.character) as Character
  const update = useCharacterStore((s) => s.update)
  const updateFn = useCharacterStore((s) => s.updateFn)
  return { character, update, updateFn }
}
