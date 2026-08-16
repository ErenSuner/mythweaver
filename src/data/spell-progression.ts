// Sınıf başına seviye-farkında büyü ilerlemesi — cantrip bilinen + spell bilinen/
// hazırlanan sayıları. classes.json parser'dan üretildiği için (regen'de üzerine
// yazılır) bu sayıları grants.ts felsefesiyle elle burada tutuyoruz. Kaynak:
// helper_files/dnd5e_ultimate_character_creation_guide.md sınıf tabloları.
import type { Ability } from '@/types/data'
import type { Character } from '@/types/character'
import { classById } from '@/data'
import { abilityModifier, finalAbilityScores } from '@/lib/rules'
import spellsJson from './spells.json'

const ZEROS = Array(20).fill(0) as number[]

type CasterModel = 'known' | 'prepared' | 'wizard'

interface Progression {
  model: CasterModel
  /** her seviyede bilinen cantrip sayısı, index 0 = 1. seviye */
  cantrips: number[]
  /** büyücülüğün başladığı seviye (Paladin/Ranger = 2); default 1 */
  startLevel?: number
  /** 'known' modeli: her seviyede bilinen büyü sayısı */
  spellsKnown?: number[]
  /** 'prepared'/'wizard' modeli: hazırlama sayısını belirleyen ability */
  preparedAbility?: Ability
  /** Paladin: hazırlama = ability mod + floor(seviye/2); default seviye tam */
  halfLevel?: boolean
  /** Wizard: 1. seviyede spellbook'taki 1. seviye büyü sayısı */
  wizardBookLevel1?: number
}

export const SPELL_PROGRESSION: Record<string, Progression> = {
  bard: {
    model: 'known',
    cantrips: [2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
    spellsKnown: [4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 15, 15, 16, 18, 19, 19, 20, 22, 22, 22],
  },
  sorcerer: {
    model: 'known',
    cantrips: [4, 4, 4, 5, 5, 5, 5, 5, 5, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6],
    spellsKnown: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 12, 13, 13, 14, 14, 15, 15, 15, 15],
  },
  warlock: {
    model: 'known',
    cantrips: [2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
    spellsKnown: [2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 11, 11, 12, 12, 13, 13, 14, 14, 15, 15],
  },
  ranger: {
    model: 'known',
    cantrips: ZEROS,
    startLevel: 2,
    spellsKnown: [0, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11],
  },
  cleric: {
    model: 'prepared',
    cantrips: [3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
    preparedAbility: 'Wisdom',
  },
  druid: {
    model: 'prepared',
    cantrips: [2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
    preparedAbility: 'Wisdom',
  },
  paladin: {
    model: 'prepared',
    cantrips: ZEROS,
    startLevel: 2,
    preparedAbility: 'Charisma',
    halfLevel: true,
  },
  wizard: {
    model: 'wizard',
    cantrips: [3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
    preparedAbility: 'Intelligence',
    wizardBookLevel1: 6,
  },
}

export interface SpellLimits {
  cantrips: number
  /** seçilebilecek 1. seviye büyü sayısı (oluşturma odaklı üst sınır) */
  level1Spells: number
}

// Seçim ekranı için üst sınırlar. NOT (bilinen basitleştirme): yüksek seviyelerde
// 'known'/'prepared' büyüler birden çok büyü seviyesine dağılır; oluşturma odaklı
// bu uygulama 1. seviye picker'ını toplam sayıyla cap'ler.
export function spellLimitsFor(char: Character): SpellLimits {
  const klass = classById(char.classId)
  const prog = klass ? SPELL_PROGRESSION[klass.id] : undefined
  if (!prog) return { cantrips: 0, level1Spells: 0 }

  const lvl = char.level
  const start = prog.startLevel ?? 1
  const cantrips = prog.cantrips[lvl - 1] ?? 0
  if (lvl < start) return { cantrips, level1Spells: 0 }

  let level1Spells = 0
  if (prog.model === 'known') {
    level1Spells = prog.spellsKnown?.[lvl - 1] ?? 0
  } else if (prog.model === 'wizard') {
    // spellbook'un 1. seviye büyüleri: 1. seviyede 6 (yüksek seviyelerde eklenenler
    // farklı büyü seviyelerine gidebilir; oluşturma için başlangıç kitabını cap alırız)
    level1Spells = prog.wizardBookLevel1 ?? 0
  } else if (prog.model === 'prepared' && prog.preparedAbility) {
    const mod = abilityModifier(finalAbilityScores(char)[prog.preparedAbility])
    const base = prog.halfLevel ? Math.floor(lvl / 2) : lvl
    level1Spells = Math.max(1, mod + base)
  }
  return { cantrips, level1Spells }
}

// ---- Spell slot tabloları (rehber sınıf tablolarından) ----
// Her satır bir karakter seviyesi (index 0 = 1. seviye); dizideki değerler 1..N
// büyü seviyeleri için slot sayısı.
// Tam caster: Bard/Cleric/Druid/Sorcerer/Wizard.
const FULL_SLOTS: number[][] = [
  [2],
  [3],
  [4, 2],
  [4, 3],
  [4, 3, 2],
  [4, 3, 3],
  [4, 3, 3, 1],
  [4, 3, 3, 2],
  [4, 3, 3, 3, 1],
  [4, 3, 3, 3, 2],
  [4, 3, 3, 3, 2, 1],
  [4, 3, 3, 3, 2, 1],
  [4, 3, 3, 3, 2, 1, 1],
  [4, 3, 3, 3, 2, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 2, 1, 1],
]
// Yarım caster: Paladin/Ranger (2. seviyede büyü başlar).
const HALF_SLOTS: number[][] = [
  [],
  [2],
  [3],
  [3],
  [4, 2],
  [4, 2],
  [4, 3],
  [4, 3],
  [4, 3, 2],
  [4, 3, 2],
  [4, 3, 3],
  [4, 3, 3],
  [4, 3, 3, 1],
  [4, 3, 3, 1],
  [4, 3, 3, 2],
  [4, 3, 3, 2],
  [4, 3, 3, 3, 1],
  [4, 3, 3, 3, 1],
  [4, 3, 3, 3, 2],
  [4, 3, 3, 3, 2],
]
// Warlock Pact Magic: az sayıda ama hep en yüksek seviye slot; Short Rest ile yenilenir.
const PACT_SLOTS: { count: number; level: number }[] = [
  { count: 1, level: 1 },
  { count: 2, level: 1 },
  { count: 2, level: 2 },
  { count: 2, level: 2 },
  { count: 2, level: 3 },
  { count: 2, level: 3 },
  { count: 2, level: 4 },
  { count: 2, level: 4 },
  { count: 2, level: 5 },
  { count: 2, level: 5 },
  { count: 3, level: 5 },
  { count: 3, level: 5 },
  { count: 3, level: 5 },
  { count: 3, level: 5 },
  { count: 3, level: 5 },
  { count: 3, level: 5 },
  { count: 4, level: 5 },
  { count: 4, level: 5 },
  { count: 4, level: 5 },
  { count: 4, level: 5 },
]

export function isPactCaster(classId: string): boolean {
  return classId === 'warlock'
}

// ---- Alt sınıf (domain/oath/patron) büyüleri — otomatik "hazır", hazırlama
// sayısına dahil DEĞİL. Rehberdeki domain/oath/genişletilmiş büyü tablolarından.
// İsimle saklanır; id'ye runtime çözülür (slug hatası olmasın).
const SUBCLASS_SPELLS: Record<string, string[]> = {
  // Cleric domainleri
  'knowledge-domain': ['command', 'identify', 'augury', 'suggestion', 'nondetection', 'speak with dead', 'arcane eye', 'confusion', 'legend lore', 'scrying'],
  'life-domain': ['bless', 'cure wounds', 'lesser restoration', 'spiritual weapon', 'beacon of hope', 'revivify', 'death ward', 'guardian of faith', 'mass cure wounds', 'raise dead'],
  'light-domain': ['burning hands', 'faerie fire', 'flaming sphere', 'scorching ray', 'daylight', 'fireball', 'guardian of faith', 'wall of fire', 'flame strike', 'scrying'],
  'nature-domain': ['animal friendship', 'speak with animals', 'barkskin', 'spike growth', 'plant growth', 'wind wall', 'dominate beast', 'grasping vine', 'insect plague', 'tree stride'],
  'tempest-domain': ['fog cloud', 'thunderwave', 'gust of wind', 'shatter', 'call lightning', 'sleet storm', 'control water', 'ice storm', 'destructive wave', 'insect plague'],
  'trickery-domain': ['charm person', 'disguise self', 'mirror image', 'pass without trace', 'blink', 'dispel magic', 'dimension door', 'polymorph', 'dominate person', 'modify memory'],
  'war-domain': ['divine favor', 'shield of faith', 'magic weapon', 'spiritual weapon', "crusader's mantle", 'spirit guardians', 'freedom of movement', 'stoneskin', 'flame strike', 'hold monster'],
  // Paladin oath büyüleri (3. seviyeden itibaren)
  'oath-of-devotion': ['protection from evil and good', 'sanctuary', 'lesser restoration', 'zone of truth', 'beacon of hope', 'dispel magic', 'freedom of movement', 'guardian of faith', 'commune', 'flame strike'],
  'oath-of-the-ancients': ['ensnaring strike', 'speak with animals', 'moonbeam', 'misty step', 'plant growth', 'protection from energy', 'ice storm', 'stoneskin', 'commune with nature', 'tree stride'],
  'oath-of-vengeance': ['bane', "hunter's mark", 'hold person', 'misty step', 'haste', 'protection from energy', 'banishment', 'dimension door', 'hold monster', 'scrying'],
  // Warlock patron genişletilmiş büyüleri
  'the-archfey': ['faerie fire', 'sleep', 'calm emotions', 'phantasmal force', 'blink', 'plant growth', 'dominate beast', 'greater invisibility', 'dominate person', 'seeming'],
  'the-fiend': ['burning hands', 'command', 'blindness/deafness', 'scorching ray', 'fireball', 'stinking cloud', 'fire shield', 'wall of fire', 'flame strike', 'hallow'],
  'the-great-old-one': ['dissonant whispers', "tasha's hideous laughter", 'detect thoughts', 'phantasmal force', 'clairvoyance', 'sending', 'dominate beast', "evard's black tentacles", 'dominate person', 'telekinesis'],
}

const SPELL_BY_NAME = new Map((spellsJson as { id: string; name: string; level: number }[]).map((s) => [s.name.toLowerCase(), s]))

export interface AutoSpell {
  id: string
  name: string
  level: number
}

// Bu karakterin cast edebileceği en yüksek büyü seviyesi (slot tablosundan).
export function maxCastableSpellLevel(char: Character): number {
  const slots = spellSlotsFor(char)
  const lvls = Object.keys(slots).map(Number)
  return lvls.length ? Math.max(...lvls) : 0
}

// Alt sınıfın otomatik-hazır büyüleri, yalnızca cast edilebilir seviyeye kadar.
export function subclassSpells(char: Character): AutoSpell[] {
  const names = SUBCLASS_SPELLS[char.subclassId]
  if (!names) return []
  const max = maxCastableSpellLevel(char)
  const out: AutoSpell[] = []
  for (const n of names) {
    const sp = SPELL_BY_NAME.get(n.toLowerCase())
    if (sp && sp.level <= max) out.push({ id: sp.id, name: sp.name, level: sp.level })
  }
  return out.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name))
}

// Bu karakterin sahip olduğu spell slot'lar: { büyüSeviyesi: slotSayısı }.
// Warlock için tek bir seviyede (pact) toplanır.
export function spellSlotsFor(char: Character): Record<number, number> {
  const klass = classById(char.classId)
  if (!klass?.isCaster) return {}
  const lvl = char.level
  if (klass.id === 'warlock') {
    const p = PACT_SLOTS[lvl - 1]
    return p && p.count ? { [p.level]: p.count } : {}
  }
  const table = klass.id === 'paladin' || klass.id === 'ranger' ? HALF_SLOTS : FULL_SLOTS
  const row = table[lvl - 1] ?? []
  const out: Record<number, number> = {}
  row.forEach((n, i) => {
    if (n > 0) out[i + 1] = n
  })
  return out
}
