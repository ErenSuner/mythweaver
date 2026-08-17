// Guided choices — veriden okunup elle sabitlenen istisna seçimleri. Kullanıcı
// karakter oluştururken elle dil/tool/skill yazmaz; buradan picker'lar üretilir.
import { raceById, backgroundById, classById, items, spellById } from '@/data'
import type { Character } from '@/types/character'
import type { Item } from '@/types/data'

export interface LanguageDef {
  id: string
  name: string
  nameTr: string
}

// Kanonik PHB dil listesi
export const LANGUAGES: LanguageDef[] = [
  { id: 'common', name: 'Common', nameTr: 'Ortak Dil' },
  { id: 'dwarvish', name: 'Dwarvish', nameTr: 'Cücece' },
  { id: 'elvish', name: 'Elvish', nameTr: 'Elfçe' },
  { id: 'giant', name: 'Giant', nameTr: 'Devce' },
  { id: 'gnomish', name: 'Gnomish', nameTr: 'Gnomca' },
  { id: 'goblin', name: 'Goblin', nameTr: 'Goblince' },
  { id: 'halfling', name: 'Halfling', nameTr: 'Yarımcıca' },
  { id: 'orc', name: 'Orc', nameTr: 'Orkça' },
  { id: 'abyssal', name: 'Abyssal', nameTr: 'Abisçe' },
  { id: 'celestial', name: 'Celestial', nameTr: 'Semavî' },
  { id: 'draconic', name: 'Draconic', nameTr: 'Ejderhaca' },
  { id: 'deep-speech', name: 'Deep Speech', nameTr: 'Derin Söylem' },
  { id: 'infernal', name: 'Infernal', nameTr: 'Cehennemce' },
  { id: 'primordial', name: 'Primordial', nameTr: 'İlksel' },
  { id: 'sylvan', name: 'Sylvan', nameTr: 'Orman Dili' },
  { id: 'undercommon', name: 'Undercommon', nameTr: 'Yeraltı Dili' },
]
export const languageByName = (n: string) => LANGUAGES.find((l) => l.name.toLowerCase() === n.toLowerCase())

// Irk/subrace seçmeli dil sayısı (elle sabit)
const RACE_LANGUAGE_CHOICE: Record<string, number> = { human: 1, 'half-elf': 1 }
const SUBRACE_LANGUAGE_CHOICE: Record<string, number> = { 'high-elf': 1 }

// Irk tool seçimi — items.json id'leri (kart + detay modalı gösterebilmek için)
const RACE_TOOL_CHOICE: Record<string, string[]> = {
  dwarf: ['smiths-tools', 'brewers-supplies', 'masons-tools'],
}

// Sınıftan gelen alet seçimleri. pool: hangi alet grubundan seçilecek.
export type ToolPool = 'artisan' | 'gaming' | 'instrument' | 'kit' | 'artisan-or-instrument'
const CLASS_TOOL_CHOICE: Record<string, { count: number; pool: ToolPool; label: string; help?: string }> = {
  bard: {
    count: 3,
    pool: 'instrument',
    label: 'Üç müzik aleti seç',
    help: 'Bard için müzik aleti hem yeterlilik hem büyü odağıdır. Üç farklı alet seç.',
  },
  monk: {
    count: 1,
    pool: 'artisan-or-instrument',
    label: 'Bir zanaat aleti ya da müzik aleti seç',
    help: 'Manastır eğitiminden gelen el becerisi. Her alet farklı becerilere avantaj ve özel bir kullanım verir.',
  },
}

// Irk seçmeli skill sayısı (any skill)
const RACE_SKILL_CHOICE: Record<string, number> = { 'half-elf': 2 }

// Dragonborn Draconic Ancestry — seçilen ejderha türü hem Breath Weapon şeklini
// hem Damage Resistance türünü belirler (rehber: Draconic Ancestry Tablosu).
export interface DraconicAncestry {
  id: string
  name: string
  nameTr: string
  damageType: string
  damageTypeTr: string
  breath: string
}
export const DRACONIC_ANCESTRY: DraconicAncestry[] = [
  { id: 'black', name: 'Black', nameTr: 'Siyah', damageType: 'Acid', damageTypeTr: 'Asit', breath: '5x30 ft çizgi (line) — Dex save' },
  { id: 'blue', name: 'Blue', nameTr: 'Mavi', damageType: 'Lightning', damageTypeTr: 'Şimşek', breath: '5x30 ft çizgi (line) — Dex save' },
  { id: 'brass', name: 'Brass', nameTr: 'Pirinç', damageType: 'Fire', damageTypeTr: 'Ateş', breath: '5x30 ft çizgi (line) — Dex save' },
  { id: 'bronze', name: 'Bronze', nameTr: 'Bronz', damageType: 'Lightning', damageTypeTr: 'Şimşek', breath: '5x30 ft çizgi (line) — Dex save' },
  { id: 'copper', name: 'Copper', nameTr: 'Bakır', damageType: 'Acid', damageTypeTr: 'Asit', breath: '5x30 ft çizgi (line) — Dex save' },
  { id: 'gold', name: 'Gold', nameTr: 'Altın', damageType: 'Fire', damageTypeTr: 'Ateş', breath: '15 ft koni (cone) — Dex save' },
  { id: 'green', name: 'Green', nameTr: 'Yeşil', damageType: 'Poison', damageTypeTr: 'Zehir', breath: '15 ft koni (cone) — Con save' },
  { id: 'red', name: 'Red', nameTr: 'Kırmızı', damageType: 'Fire', damageTypeTr: 'Ateş', breath: '15 ft koni (cone) — Dex save' },
  { id: 'silver', name: 'Silver', nameTr: 'Gümüş', damageType: 'Cold', damageTypeTr: 'Soğuk', breath: '15 ft koni (cone) — Con save' },
  { id: 'white', name: 'White', nameTr: 'Beyaz', damageType: 'Cold', damageTypeTr: 'Soğuk', breath: '15 ft koni (cone) — Con save' },
]
export const draconicAncestryById = (id: string) => DRACONIC_ANCESTRY.find((d) => d.id === id)

// ---- Sınıf seviye-1 seçimleri ----

// Fighting Style (Fighter 1, Ranger/Paladin 2). id 'defense' AC'ye +1 (zırhlıyken)
// uygulanır; diğerleri saldırı/hasar etkisi olduğundan bilgi olarak gösterilir.
export interface FightingStyle {
  id: string
  name: string
  nameTr: string
  desc: string
}
export const FIGHTING_STYLES: Record<string, FightingStyle> = {
  archery: { id: 'archery', name: 'Archery', nameTr: 'Okçuluk', desc: 'Menzilli silah saldırı atışlarına +2 bonus.' },
  defense: { id: 'defense', name: 'Defense', nameTr: 'Savunma', desc: 'Zırh giyerken AC’ye +1 bonus.' },
  dueling: { id: 'dueling', name: 'Dueling', nameTr: 'Düello', desc: 'Tek elde melee silahla (diğer el boşken) hasara +2.' },
  'great-weapon': { id: 'great-weapon', name: 'Great Weapon Fighting', nameTr: 'İki El Savaşı', desc: 'İki elli silahla hasar zarında 1–2 gelirse yeniden at.' },
  protection: { id: 'protection', name: 'Protection', nameTr: 'Koruma', desc: 'Kalkanla, 5 ft içindeki müttefikine saldırana Reaction ile Disadvantage.' },
  'two-weapon': { id: 'two-weapon', name: 'Two-Weapon Fighting', nameTr: 'Çift Silah', desc: 'Off-hand saldırıda ability modifier’ı hasara ekle.' },
}
// hangi sınıf hangi seviyede, hangi stil seçeneklerinden seçer
const FIGHTING_STYLE_BY_CLASS: Record<string, { level: number; options: string[] }> = {
  fighter: { level: 1, options: ['archery', 'defense', 'dueling', 'great-weapon', 'protection', 'two-weapon'] },
  ranger: { level: 2, options: ['archery', 'defense', 'dueling', 'two-weapon'] },
  paladin: { level: 2, options: ['defense', 'dueling', 'great-weapon', 'protection'] },
}
export const fightingStyleById = (id: string) => FIGHTING_STYLES[id]

// Rogue (1) / Bard (3) Expertise — sahip olunan skill proficiency'lerinden seçilir.
const EXPERTISE_CHOICE: Record<string, { level: number; count: number; toolOption?: string }> = {
  rogue: { level: 1, count: 2, toolOption: 'thieves-tools' },
  bard: { level: 3, count: 2 },
}

// Ranger Favored Enemy — düşman türü seçimi + o türün bir dili.
export interface NamedChoice {
  id: string
  name: string
  nameTr: string
}
export const FAVORED_ENEMIES: NamedChoice[] = [
  { id: 'aberrations', name: 'Aberrations', nameTr: 'Sapkınlar' },
  { id: 'beasts', name: 'Beasts', nameTr: 'Hayvanlar' },
  { id: 'celestials', name: 'Celestials', nameTr: 'Semaviler' },
  { id: 'constructs', name: 'Constructs', nameTr: 'Yapıntılar' },
  { id: 'dragons', name: 'Dragons', nameTr: 'Ejderhalar' },
  { id: 'elementals', name: 'Elementals', nameTr: 'Elementaller' },
  { id: 'fey', name: 'Fey', nameTr: 'Periler' },
  { id: 'fiends', name: 'Fiends', nameTr: 'Şeytanlar' },
  { id: 'giants', name: 'Giants', nameTr: 'Devler' },
  { id: 'monstrosities', name: 'Monstrosities', nameTr: 'Canavarlar' },
  { id: 'oozes', name: 'Oozes', nameTr: 'Balçıklar' },
  { id: 'plants', name: 'Plants', nameTr: 'Bitkiler' },
  { id: 'undead', name: 'Undead', nameTr: 'Ölüler Ordusu' },
  { id: 'two-humanoids', name: 'Two Humanoid Races', nameTr: 'İki İnsansı Irk' },
]
export const favoredEnemyById = (id: string) => FAVORED_ENEMIES.find((e) => e.id === id)

// Ranger Natural Explorer — arazi türü seçimi.
export const TERRAINS: NamedChoice[] = [
  { id: 'arctic', name: 'Arctic', nameTr: 'Kutup' },
  { id: 'coast', name: 'Coast', nameTr: 'Kıyı' },
  { id: 'desert', name: 'Desert', nameTr: 'Çöl' },
  { id: 'forest', name: 'Forest', nameTr: 'Orman' },
  { id: 'grassland', name: 'Grassland', nameTr: 'Çayır' },
  { id: 'mountain', name: 'Mountain', nameTr: 'Dağ' },
  { id: 'swamp', name: 'Swamp', nameTr: 'Bataklık' },
  { id: 'underdark', name: 'Underdark', nameTr: 'Yeraltı' },
]
export const terrainById = (id: string) => TERRAINS.find((t) => t.id === id)

// ---- Alt sınıf (subclass) seviye-1 grantları ----
// Cleric domain / Sorcerer origin'lerin sheet'i etkileyen 1. seviye kazanımları.
// Warlock patronlarının 1. seviyede mekanik proficiency grantı yoktur (yalnız
// genişletilmiş büyü listesi + özellik), bu yüzden listede yer almazlar.
export interface SubclassGrant {
  heavyArmor?: boolean
  martialWeapons?: boolean
  languageChoices?: number // Knowledge: 2 seçmeli dil
  skillGrantFrom?: string[] // Nature: bu listeden seçilen skill'de proficiency
  skillGrantCount?: number
  expertiseFrom?: string[] // Knowledge: bu listeden seçilenlere proficiency + Expertise
  expertiseCount?: number
  druidCantripChoice?: number // Nature: druid listesinden 1 cantrip (bilgi)
  innateCantrip?: string // Light: 'Light' cantrip (otomatik)
  draconicAncestry?: boolean // Draconic Bloodline: ejderha türü seçimi
  autoLanguage?: string // Draconic: 'Draconic' dili otomatik
  hpPerLevelBonus?: number // Draconic Resilience: +1 HP/seviye
  unarmoredAcBase?: number // Draconic Resilience: zırhsız AC = 13 + Dex
}
const SUBCLASS_GRANTS: Record<string, SubclassGrant> = {
  'knowledge-domain': { languageChoices: 2, expertiseFrom: ['Arcana', 'History', 'Nature', 'Religion'], expertiseCount: 2 },
  'life-domain': { heavyArmor: true },
  'light-domain': { innateCantrip: 'Light' },
  'nature-domain': { heavyArmor: true, skillGrantFrom: ['Animal Handling', 'Nature', 'Survival'], skillGrantCount: 1, druidCantripChoice: 1 },
  'tempest-domain': { heavyArmor: true, martialWeapons: true },
  'trickery-domain': {},
  'war-domain': { heavyArmor: true, martialWeapons: true },
  'draconic-bloodline': { draconicAncestry: true, autoLanguage: 'Draconic', hpPerLevelBonus: 1, unarmoredAcBase: 13 },
  'wild-magic': {},
}
export const subclassGrant = (id: string): SubclassGrant | undefined => SUBCLASS_GRANTS[id]

// Subrace/ırk seçmeli cantrip (belirli sınıf listesinden)
const SUBRACE_CANTRIP_CHOICE: Record<string, { count: number; from: string }> = {
  'high-elf': { count: 1, from: 'wizard' },
}

// Otomatik (seçimsiz) innate cantrip'ler — bilgi notu olarak eklenir.
// Anahtar subrace id ya da (subrace'i olmayan ırklar için) race id olabilir.
const INNATE_CANTRIP: Record<string, string> = {
  'dark-elf-drow': 'Dancing Lights',
  'forest-gnome': 'Minor Illusion',
  tiefling: 'Thaumaturgy',
}

export interface ChoiceSlot {
  key: string
  type: 'language' | 'tool' | 'skill' | 'cantrip' | 'ancestry' | 'fighting-style' | 'expertise' | 'favored-enemy' | 'terrain' | 'skill-grant' | 'expertise-grant' | 'grant-cantrip'
  count: number
  label: string
  help?: string
  source: string
  options?: string[] // tool: sabit item id listesi; fighting-style: stil id listesi
  pool?: ToolPool // tool için grup havuzu (options yerine)
  from?: string // cantrip için sınıf id
  toolOption?: string // expertise: skill yanında seçilebilir tool id (rogue: thieves-tools)
}

// Metinden dil seçim sayısı ("iki dil"→2, "bir dil"→1, "Yok"→0)
function langCountFromText(text: string): number {
  if (!text || /^yok$/i.test(text.trim())) return 0
  if (/iki\s*dil/i.test(text)) return 2
  if (/bir\s*dil|bir\s*ekstra|ekstra\s*dil/i.test(text)) return 1
  return 0
}

// Irkın sabit (seçimsiz) dilleri — "Common + Elvish + kendi seçeceğin..." → [Common, Elvish]
export function baseLanguages(raceId: string): string[] {
  const race = raceById(raceId)
  if (!race?.languages) return []
  return race.languages
    .replace(/\.$/, '')
    .split('+')
    .map((s) => s.trim())
    .filter((s) => s && !/seçeceğin|seçtiğin|ekstra|kendi/i.test(s))
    .map((s) => {
      const m = languageByName(s)
      return m ? m.name : s
    })
}

// Bu karakter için gereken tüm seçmeli slotlar
export function collectChoiceSlots(char: Character): ChoiceSlot[] {
  const slots: ChoiceSlot[] = []
  const race = raceById(char.raceId)
  const bg = backgroundById(char.backgroundId)

  // ırk dili
  const raceLang = RACE_LANGUAGE_CHOICE[char.raceId] ?? 0
  if (raceLang) slots.push({ key: 'lang-race', type: 'language', count: raceLang, label: `${race?.name} — ekstra dil`, source: 'race' })
  // subrace dili
  const subLang = SUBRACE_LANGUAGE_CHOICE[char.subraceId] ?? 0
  if (subLang) slots.push({ key: 'lang-subrace', type: 'language', count: subLang, label: 'Alt ırk — ekstra dil', source: 'subrace' })
  // background dili
  const bgLang = langCountFromText(bg?.languages ?? '')
  if (bgLang) slots.push({ key: 'lang-bg', type: 'language', count: bgLang, label: `${bg?.name} — dil seçimi`, source: 'background' })

  // ırk tool
  const raceTool = RACE_TOOL_CHOICE[char.raceId]
  if (raceTool) slots.push({ key: 'tool-race', type: 'tool', count: 1, label: `${race?.name} — araç yeterliliği`, source: 'race', options: raceTool })

  // sınıf tool (bard: 3 müzik aleti, monk: zanaat aleti ya da müzik aleti)
  const classTool = CLASS_TOOL_CHOICE[char.classId]
  if (classTool)
    slots.push({
      key: 'tool-class',
      type: 'tool',
      count: classTool.count,
      label: `${classById(char.classId)?.name} — ${classTool.label}`,
      help: classTool.help,
      source: 'class',
      pool: classTool.pool,
    })

  // ırk skill (Half-Elf +2 any)
  const raceSkill = RACE_SKILL_CHOICE[char.raceId] ?? 0
  if (raceSkill) slots.push({ key: 'skill-race', type: 'skill', count: raceSkill, label: `${race?.name} — beceri seçimi`, source: 'race' })

  // Dragonborn ejderha soyu (Draconic Ancestry)
  if (char.raceId === 'dragonborn')
    slots.push({
      key: 'ancestry-race',
      type: 'ancestry',
      count: 1,
      label: `${race?.name} — Ejderha Soyu (Draconic Ancestry)`,
      help: 'Seçtiğin ejderha türü hem Breath Weapon şeklini hem de hasar direncini (Resistance) belirler.',
      source: 'race',
    })

  // subrace cantrip (High Elf)
  const cantrip = SUBRACE_CANTRIP_CHOICE[char.subraceId]
  if (cantrip) slots.push({ key: 'cantrip-subrace', type: 'cantrip', count: cantrip.count, label: 'Alt ırk — cantrip seçimi', source: 'subrace', from: cantrip.from })

  // --- sınıf seviye-1 seçimleri ---
  const klass = classById(char.classId)

  // Fighting Style (Fighter 1 / Ranger, Paladin 2)
  const fs = FIGHTING_STYLE_BY_CLASS[char.classId]
  if (fs && char.level >= fs.level)
    slots.push({ key: 'fighting-style', type: 'fighting-style', count: 1, label: `${klass?.name} — Dövüş Stili (Fighting Style)`, source: 'class', options: fs.options })

  // Expertise (Rogue 1 / Bard 3)
  const exp = EXPERTISE_CHOICE[char.classId]
  if (exp && char.level >= exp.level)
    slots.push({
      key: 'expertise',
      type: 'expertise',
      count: exp.count,
      label: `${klass?.name} — Uzmanlık (Expertise)`,
      help: 'Sahip olduğun beceri (proficiency) seçeneklerinden seç; seçtiklerinde proficiency bonusu iki katına çıkar.',
      source: 'class',
      toolOption: exp.toolOption,
    })

  // Ranger Favored Enemy (düşman türü + o türün bir dili) & Natural Explorer (arazi)
  if (char.classId === 'ranger' && char.level >= 1) {
    slots.push({ key: 'favored-enemy', type: 'favored-enemy', count: 1, label: 'Ranger — Tercihli Düşman (Favored Enemy)', help: 'Bir düşman türü seç; o türü izlemede Advantage kazanır ve türün bir dilini öğrenirsin.', source: 'class' })
    slots.push({ key: 'lang-favored-enemy', type: 'language', count: 1, label: 'Favored Enemy — dil seçimi', source: 'class' })
    slots.push({ key: 'terrain', type: 'terrain', count: 1, label: 'Ranger — Doğal Kaşif (Natural Explorer)', help: 'Uzmanlaştığın arazi türünü seç.', source: 'class' })
  }

  // --- alt sınıf (subclass) seviye-1 seçimleri ---
  // subclass yalnız subclassLevel'e ulaşınca geçerli olduğu için seviye kontrolü
  const grant = klass && klass.subclassLevel != null && char.level >= klass.subclassLevel ? SUBCLASS_GRANTS[char.subclassId] : undefined
  if (grant) {
    const subName = klass?.subclasses.find((s) => s.id === char.subclassId)?.name ?? 'Alt sınıf'
    if (grant.languageChoices)
      slots.push({ key: 'lang-domain', type: 'language', count: grant.languageChoices, label: `${subName} — ekstra dil`, source: 'subclass' })
    if (grant.expertiseFrom && grant.expertiseCount)
      slots.push({ key: 'expertise-domain', type: 'expertise-grant', count: grant.expertiseCount, label: `${subName} — Expertise`, help: 'Seçtiğin becerilerde proficiency kazanır ve bonusu iki katına çıkarırsın.', source: 'subclass', options: grant.expertiseFrom })
    if (grant.skillGrantFrom && grant.skillGrantCount)
      slots.push({ key: 'skill-domain', type: 'skill-grant', count: grant.skillGrantCount, label: `${subName} — beceri (proficiency)`, source: 'subclass', options: grant.skillGrantFrom })
    if (grant.druidCantripChoice)
      slots.push({ key: 'cantrip-domain', type: 'grant-cantrip', count: grant.druidCantripChoice, label: `${subName} — druid cantrip`, help: 'Druid büyü listesinden bir cantrip öğrenirsin.', source: 'subclass', from: 'druid' })
    if (grant.draconicAncestry)
      slots.push({ key: 'ancestry-draconic', type: 'ancestry', count: 1, label: `${subName} — Ejderha Atası (Dragon Ancestor)`, help: 'Bir ejderha türü seç; hasar bağın ve Draconic dilin bu seçime göre belirlenir.', source: 'subclass' })
  }

  return slots
}

/** Bir tool slotu için seçilebilir eşyalar (sabit liste ya da grup havuzu). */
export function toolSlotOptions(slot: ChoiceSlot): Item[] {
  if (slot.options) return slot.options.map((id) => items.find((i) => i.id === id)).filter((i): i is Item => Boolean(i))
  if (!slot.pool) return []
  const pool = slot.pool
  return items
    .filter((i) => {
      if (i.category !== 'tool') return false
      if (pool === 'artisan-or-instrument') return i.toolGroup === 'artisan' || i.toolGroup === 'instrument'
      return i.toolGroup === pool
    })
    .sort((a, b) => a.name.localeCompare(b.name))
}

export function innateCantripFor(char: Character): string | null {
  return INNATE_CANTRIP[char.subraceId] ?? INNATE_CANTRIP[char.raceId] ?? SUBCLASS_GRANTS[char.subclassId]?.innateCantrip ?? null
}

// Irk/subrace/alt sınıf cantrip'leri, kaynak etiketiyle. Seçmeli olanlar id'li
// (tıklanıp künye açılabilir); otomatik innate'ler yalnız isimle gelir.
export interface RaceCantripEntry {
  name: string
  spellId?: string
  sourceLabel: string
}

export function raceCantripEntries(char: Character): RaceCantripEntry[] {
  const race = raceById(char.raceId)
  const sub = race?.subraces.find((s) => s.id === char.subraceId)
  const out: RaceCantripEntry[] = []
  // seçmeli (High-Elf gibi): id'li, tıklanabilir
  if (char.raceCantripIds.length) {
    const src = (SUBRACE_CANTRIP_CHOICE[char.subraceId] ? sub?.name : race?.name) ?? 'Irk'
    for (const id of char.raceCantripIds) out.push({ name: spellById(id)?.name ?? id, spellId: id, sourceLabel: `${src} özelliği` })
  }
  // otomatik innate (ırk/subrace)
  const innate = INNATE_CANTRIP[char.subraceId] ?? INNATE_CANTRIP[char.raceId]
  if (innate) {
    const src = (INNATE_CANTRIP[char.subraceId] ? sub?.name : race?.name) ?? 'Irk'
    out.push({ name: innate, sourceLabel: `${src} özelliği (otomatik)` })
  }
  // alt sınıf innate (ör. Light domain)
  const subInnate = SUBCLASS_GRANTS[char.subclassId]?.innateCantrip
  if (subInnate) out.push({ name: subInnate, sourceLabel: 'Alt sınıf özelliği (otomatik)' })
  return out
}
