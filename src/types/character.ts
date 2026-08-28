// Character şeması — 5E_CharacterSheet_Fillable.pdf'teki TÜM alanları kapsar
// (p1 core/combat/skills, p2 appearance/story, p3 spellcasting). Alanlar temiz
// yapıda tutulur; opsiyonel PDF export için lib/pdf-map ile eşlenebilir.
import type { Ability } from './data'

export interface AbilityScores {
  Strength: number
  Dexterity: number
  Constitution: number
  Intelligence: number
  Wisdom: number
  Charisma: number
}

export interface SkillState {
  proficient: boolean
}

export interface DeathSaves {
  successes: number
  failures: number
}

export interface Attack {
  name: string
  atkBonus: string
  damage: string
}

// Bir feat'in gerektirdiği kullanıcı seçimleri (ability, skill, dil, büyü…).
export interface FeatSelection {
  ability?: Ability // seçmeli +1 (Athlete, Resilient, Observant…)
  skills?: string[] // Skilled
  tools?: string[] // Skilled (araç)
  weapons?: string[] // Weapon Master
  languages?: string[] // Linguist
  spellClass?: string // Magic Initiate / Ritual Caster / Spell Sniper — seçilen sınıf id
  cantrips?: string[] // Magic Initiate (2), Spell Sniper (1) — spell id
  spells?: string[] // Magic Initiate (1×L1), Ritual Caster (2×L1 ritual) — spell id
  damageType?: string // Elemental Adept
}

export interface Currency {
  CP: number
  SP: number
  EP: number
  GP: number
  PP: number
}

// --- envanter ---
export type InventorySource = 'class' | 'background' | 'pack' | 'purchase'

export interface InventoryEntry {
  itemId: string
  qty: number
  source: InventorySource
  /** paket içinden geldiyse hangi paket */
  fromPack?: string
}

/** Başlangıç donanımı: hazır paket mi, altın atıp satın alma mı */
export interface StartingKit {
  mode: 'package' | 'gold'
  /** 'gold' modunda atılan zar sonucu (gp) */
  goldRolled: number | null
  /** tek tek zar yüzleri — şeffaflık için saklanır */
  goldRollDice: number[] | null
  /**
   * 1'den yüksek seviyede başlayan karakterlere DM'in verdiği ek altın (gp).
   * Miktar SRD'de yok, masaya göre değişir; bu yüzden hesaplanmaz, elle girilir.
   * Eski kayıtlarda yok; 0 varsayılır.
   */
  bonusGoldGp?: number
}

// büyü sayfası: seviye başına slot + seçilen büyüler
export interface SpellLevelState {
  slotsTotal: number
  slotsRemaining: number
  spellIds: string[]
  preparedIds: string[]
}

export interface Spellcasting {
  spellcastingClass: string
  spellcastingAbility: Ability | ''
  spellSaveDC: number
  spellAttackBonus: number
  cantripIds: string[]
  levels: Record<number, SpellLevelState> // 1..9
}

// seviye atlama geçmişi + son kazanılan (YENİ rozeti için)
export interface GainedFeature {
  name: string
  level: number
  description: string
  source: string // sınıf/subclass id
}

export interface LevelUpEntry {
  toLevel: number
  hpGained: number
  features: GainedFeature[]
  asiApplied?: Partial<AbilityScores>
  timestamp: string
}

export interface Character {
  // --- meta ---
  id: string
  schemaVersion: number

  // --- p1 kimlik ---
  characterName: string
  playerName: string
  classId: string
  subclassId: string
  level: number
  /** Karakterin oluşturulurken başladığı seviye. Bazı hikâyeler 1'den değil
      5-10 gibi seviyelerden başlar. Eski kayıtlarda yok; 1 varsayılır. */
  startingLevel?: number
  raceId: string
  subraceId: string
  backgroundId: string
  alignment: string
  xp: number

  // --- yetenekler ---
  baseAbilityScores: AbilityScores // point-buy sonrası (ırk bonusu HARİÇ)
  raceAbilityChoice: Partial<Record<Ability, number>> // Half-Elf/Human seçmeli +1'ler
  asiBonuses: Partial<AbilityScores> // level-up ASI toplamı

  // guided choices (grants.ts slot key -> seçilen değerler)
  choiceSelections: Record<string, string[]> // { 'lang-race': ['Elvish'], 'tool-race': [...], ... }
  raceExtraSkills: string[] // Half-Elf gibi ırktan gelen seçmeli skill'ler
  raceCantripIds: string[] // subrace/ırk cantrip seçimleri (spell id)
  feats: string[] // ASI yerine seçilen feat id'leri (feats.ts)
  featSelections: Record<string, FeatSelection> // feat id -> o feat'in seçimleri

  // --- proficiency ---
  savingThrowProficiencies: Ability[]
  skills: Record<string, SkillState> // 18 skill
  inspiration: boolean

  // --- combat ---
  armorClass: number
  acManual: boolean // kullanıcı elle geçersiz kıldı mı
  initiativeManual: number | null
  speed: number
  maxHp: number
  currentHp: number
  /** currentHp/hitDiceRemaining ilk hesapta full'a ayarlandı mı — 0 HP (downed)
   *  durumunu "başlatılmamış"tan ayırır (her düzenlemede full'a dönmeyi önler). */
  hpInitialized?: boolean
  tempHp: number
  hitDiceTotal: string
  hitDiceRemaining: number
  deathSaves: DeathSaves

  attacks: Attack[]

  // --- ekipman & yeterlilik ---
  /** başlangıç donanımı modu + atılan altın */
  startingKit: StartingKit
  /** "class:main-weapon" | "bg:prayer-item" -> seçilen option id */
  equipChoices: Record<string, string>
  /** "class:main-weapon:b" | "class:pick:holy-symbol" -> seçilen item id'leri */
  equipPicks: Record<string, string[]>
  /** altın modunda mağazadan alınanlar */
  purchases: { itemId: string; qty: number }[]
  /** giyilen zırh (items.json id) ve kalkan — AC otomatik hesaplanır */
  equippedArmorId: string
  equippedShield: boolean
  /** kullanıcı kalkanı bilinçli kapattı mı (auto-equip'i ezmesin) */
  shieldOff?: boolean

  /** türetilmiş: tüm eşyalar tek listede */
  inventory: InventoryEntry[]
  /** türetilmiş: kalan para (elle girilmez) */
  currency: Currency
  /** türetilmiş: karakter sayfasındaki ekipman metni */
  equipment: string
  otherProficienciesLanguages: string

  // --- özellikler ---
  featuresAndTraits: GainedFeature[] // kümülatif, seviye etiketli
  lastGainedFeatureKeys: string[] // "YENİ" rozeti gösterilecek olanlar (name+level)

  // --- kişilik ---
  personalityTraits: string
  ideals: string
  bonds: string
  flaws: string

  // --- p2 görünüm & hikaye ---
  age: string
  height: string
  weight: string
  eyes: string
  skin: string
  hair: string
  appearance: string
  backstory: string
  allies: string
  factionName: string
  additionalFeatures: string
  treasure: string

  // --- p3 büyü ---
  spellcasting: Spellcasting | null

  // --- level-up geçmişi ---
  levelUpHistory: LevelUpEntry[]

  // --- draft / wizard ---
  wizardStep: number
  completed: boolean
}

export const SCHEMA_VERSION = 3
