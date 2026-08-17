// Kalıcılık soyutlaması. Supabase varsa 'characters' tablosu (RLS ile kullanıcıya
// bağlı); yoksa localStorage fallback (yalnız yerel geliştirme/test için).
import { supabase, supabaseEnabled } from './supabase'
import { emptyCharacter } from './character-factory'
import type { Character } from '@/types/character'
import { SCHEMA_VERSION } from '@/types/character'

const LS_KEY = 'mythweaver.characters.v1'

/**
 * Eski kayıtları güncel şemaya taşır. v1 -> v2: envanter/altın alanları eklendi;
 * eski serbest metin ekipman seçimleri (choiceSelections['equip-N']) artık
 * kullanılmıyor, kullanıcı ekipman adımını tekrar yapar.
 */
export function migrateCharacter(raw: Character): Character {
  if (raw.schemaVersion >= SCHEMA_VERSION) return raw
  const base = emptyCharacter()
  const c: Character = {
    ...base,
    ...raw,
    schemaVersion: SCHEMA_VERSION,
    startingKit: raw.startingKit ?? base.startingKit,
    equipChoices: raw.equipChoices ?? {},
    equipPicks: raw.equipPicks ?? {},
    purchases: raw.purchases ?? [],
    inventory: raw.inventory ?? [],
    equippedArmorId: raw.equippedArmorId ?? '',
    equippedShield: raw.equippedShield ?? false,
    shieldOff: raw.shieldOff ?? false,
  }
  for (const k of Object.keys(c.choiceSelections)) if (k.startsWith('equip-')) delete c.choiceSelections[k]
  // eski elle girilen AC artık türetiliyor
  c.acManual = false
  return c
}

function lsRead(): Character[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || '[]') as Character[]
  } catch {
    return []
  }
}
function lsWrite(list: Character[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(list))
}

export async function listCharacters(userId: string | null): Promise<Character[]> {
  if (supabaseEnabled && supabase) {
    const { data, error } = await supabase
      .from('characters')
      .select('data')
      .order('updated_at', { ascending: false })
    if (error) throw error
    return (data || []).map((r) => migrateCharacter(r.data as Character))
  }
  return lsRead().map(migrateCharacter).sort((a, b) => b.id.localeCompare(a.id))
}

export async function saveCharacter(char: Character, userId: string | null): Promise<void> {
  if (supabaseEnabled && supabase) {
    const { error } = await supabase.from('characters').upsert(
      {
        id: char.id,
        user_id: userId,
        data: char,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    )
    if (error) throw error
    return
  }
  const list = lsRead()
  const idx = list.findIndex((c) => c.id === char.id)
  if (idx >= 0) list[idx] = char
  else list.push(char)
  lsWrite(list)
}

export async function deleteCharacter(id: string, _userId: string | null): Promise<void> {
  if (supabaseEnabled && supabase) {
    const { error } = await supabase.from('characters').delete().eq('id', id)
    if (error) throw error
    return
  }
  lsWrite(lsRead().filter((c) => c.id !== id))
}

export async function getCharacter(id: string, userId: string | null): Promise<Character | null> {
  if (supabaseEnabled && supabase) {
    const { data, error } = await supabase.from('characters').select('data').eq('id', id).maybeSingle()
    if (error) throw error
    return data?.data ? migrateCharacter(data.data as Character) : null
  }
  const found = lsRead().find((c) => c.id === id)
  return found ? migrateCharacter(found) : null
}
