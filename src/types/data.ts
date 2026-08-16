// parse-guide.ts çıktısı JSON'ların tipleri (src/data/*.json)
export type Ability = 'Strength' | 'Dexterity' | 'Constitution' | 'Intelligence' | 'Wisdom' | 'Charisma'
export const ABILITIES: Ability[] = ['Strength', 'Dexterity', 'Constitution', 'Intelligence', 'Wisdom', 'Charisma']

export interface Trait {
  name: string
  description: string
}

export interface Subrace {
  id: string
  name: string
  description: string
  abilityBonuses: Partial<Record<Ability, number>>
  /** subrace hız override'ı (Wood Elf 35 ft gibi); yoksa ırkın temel hızı kullanılır */
  speed?: number
  /** subrace'in her seviyede eklediği ekstra HP (Hill Dwarf Dwarven Toughness +1) */
  hpPerLevelBonus?: number
}

export interface Race {
  id: string
  name: string
  nameTr: string
  description: string
  abilityBonuses: Partial<Record<Ability, number>>
  abilityBonusesAll?: number
  abilityBonusChoice?: { count: number; amount: number }
  abilityScoreText: string
  speed: number | null
  sizeText: string
  ageText: string
  alignmentText: string
  languages: string
  languagesRaw: string
  traits: Trait[]
  subraces: Subrace[]
}

export interface ClassFeature {
  name: string
  level: number
  description: string
}

export interface Subclass {
  id: string
  name: string
  nameTr: string
  description: string
  /** alt sınıfa özel seviye özellikleri — yalnızca bu alt sınıf seçilirse verilir */
  levelFeatures: Record<string, ClassFeature[]>
}

export interface Klass {
  id: string
  name: string
  nameTr: string
  description: string
  hitDie: number | null
  primaryAbility: string
  savingThrows: Ability[]
  armor: string
  weapons: string
  tools: string
  skillChoices: { count: number | null; options: string; raw: string }
  startingEquipment: string
  hpText: string
  levelFeatures: Record<string, ClassFeature[]>
  isCaster: boolean
  spellcastingAbility: Ability | null
  subclassLevel: number | null
  subclasses: Subclass[]
  otherSections: Trait[]
}

export interface DiceRow {
  roll: string
  text: string
}

export interface Background {
  id: string
  name: string
  nameTr: string
  description: string
  skillProficiencies: string
  languages: string
  toolProficiencies: string
  equipment: string
  feature: { name: string; description: string } | null
  personalityTraits: DiceRow[]
  ideals: DiceRow[]
  bonds: DiceRow[]
  flaws: DiceRow[]
}

export interface Spell {
  id: string
  name: string
  level: number
  school: string
  castingTime: string
  range: string
  components: string
  duration: string
  description: string
  classes: string[]
}

// ---- items.json (scripts/parse-equipment.ts çıktısı) ----
export type CoinUnit = 'cp' | 'sp' | 'ep' | 'gp' | 'pp'
export interface Cost {
  amount: number
  unit: CoinUnit
}
export type ItemCategory = 'weapon' | 'armor' | 'shield' | 'gear' | 'tool' | 'pack' | 'ammunition' | 'focus' | 'mount' | 'vehicle'
export type ToolGroup = 'artisan' | 'kit' | 'gaming' | 'instrument' | 'vehicle'

export interface PackEntry {
  itemId: string
  qty: number
  note?: string
}

export interface Item {
  id: string
  name: string
  category: ItemCategory
  cost: Cost | null
  costGp: number | null
  weight: number | null
  group?: string
  description?: string
  weaponClass?: 'simple' | 'martial'
  weaponRange?: 'melee' | 'ranged'
  damage?: string
  damageType?: string
  properties?: string[]
  armorType?: 'light' | 'medium' | 'heavy' | 'shield'
  acBase?: number
  acDexMax?: number | null // null = Dex sınırsız, 0 = Dex eklenmez
  strengthReq?: number | null
  stealthDisadvantage?: boolean
  toolGroup?: ToolGroup
  contents?: PackEntry[]
}

export interface StartingWealth {
  classId: string
  dice: { count: number; die: number; multiplier: number }
  text: string
}

export interface ItemsFile {
  items: Item[]
  startingWealth: StartingWealth[]
  coinage: Record<CoinUnit, number>
  groupDescriptions: Record<string, string>
}

// ---- tool-guides.json ----
export interface ToolGuide {
  id: string
  name: string
  nameTr: string
  intro: string
  components: string
  skills: { skill: string; text: string }[]
  special: { name: string; text: string }[]
  sampleDCs: { activity: string; dc: string }[]
}
export interface ToolGuidesFile {
  guides: ToolGuide[]
  alias: Record<string, string[]> // rehber id -> kapsadığı item id'leri
}

// ---- conditions.json ----
export interface Condition {
  id: string
  name: string
  nameTr: string
  effects: string[]
  levels?: { level: number; effect: string }[]
  notes?: string[]
}

export interface GameConfig {
  pointBuy: { totalPoints: number; min: number; max: number; cost: Record<string, number> }
  proficiencyBonusByLevel: Record<string, number>
  abilityScoreImprovementLevels: number[]
  skills: Record<string, Ability>
  skillsTr: Record<string, string>
  abilitiesTr: Record<Ability, string>
  currencies: string[]
}
