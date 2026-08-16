/**
 * parse-equipment.ts
 * helper_files/dnd_5e_equipment.md            -> src/data/items.json
 * helper_files/dnd_5e_dungeon_masters_tools.md-> src/data/tool-guides.json
 * helper_files/dnd_5e_conditions.md           -> src/data/conditions.json
 *
 * Kural verisi LLM ile üretilmez; markdown tabloları birebir parse edilir.
 * Paket içerikleri (Equipment Packs) Türkçe düzyazı olduğu için PACK_CONTENTS
 * sabitinde item id'lerine elle eşlenir — fiyat/ağırlık yine tablodan gelir.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const HELP = join(ROOT, 'helper_files')
const OUT = join(ROOT, 'src', 'data')

const EQUIP_MD = join(HELP, 'dnd_5e_equipment.md')
const TOOLS_MD = join(HELP, 'dnd_5e_dungeon_masters_tools.md')
const COND_MD = join(HELP, 'dnd_5e_conditions.md')

// ---------- yardımcılar ----------
function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/['’`]/g, '')
    .replace(/[()]/g, '')
    .replace(/[àáâä]/g, 'a')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const COIN_TO_GP: Record<string, number> = { cp: 0.01, sp: 0.1, ep: 0.5, gp: 1, pp: 10 }

export interface Cost {
  amount: number
  unit: 'cp' | 'sp' | 'ep' | 'gp' | 'pp'
}

function parseCost(raw: string): { cost: Cost | null; costGp: number | null } {
  const t = raw.replace(/\*/g, '').trim()
  if (!t || t === '—' || t === '-') return { cost: null, costGp: null }
  const m = t.match(/^([\d.,]+)\s*(cp|sp|ep|gp|pp)/i)
  if (!m) return { cost: null, costGp: null }
  const amount = parseFloat(m[1].replace(/,/g, ''))
  const unit = m[2].toLowerCase() as Cost['unit']
  return { cost: { amount, unit }, costGp: +(amount * COIN_TO_GP[unit]).toFixed(4) }
}

function parseWeight(raw: string): number | null {
  const t = raw.trim()
  if (!t || t === '—' || t === '-' || t === '*') return null
  // "1½ lb." | "1/4 lb." | "5 lb. (full)" | "1/2 lb."
  const half = t.match(/^(\d+)½/)
  if (half) return parseInt(half[1], 10) + 0.5
  const frac = t.match(/^(\d+)\/(\d+)/)
  if (frac) return parseInt(frac[1], 10) / parseInt(frac[2], 10)
  const n = t.match(/^([\d.,]+)/)
  return n ? parseFloat(n[1].replace(/,/g, '')) : null
}

function stripBold(s: string): string {
  return s.replace(/\*\*/g, '').trim()
}

interface Row {
  cells: string[]
  isGroup: boolean // **Grup Başlığı** satırı
  isSub: boolean // "— Alt öğe" satırı
}

// Belirli satır aralığındaki markdown tablo satırlarını okur
function tableRows(lines: string[], from: number, to: number): Row[] {
  const out: Row[] = []
  for (let i = from; i < to && i < lines.length; i++) {
    const line = lines[i]
    if (!line.startsWith('|')) continue
    if (/^\|[\s|:-]+\|$/.test(line)) continue // ayraç satırı
    const cells = line
      .split('|')
      .slice(1, -1)
      .map((c) => c.trim())
    if (cells.length < 2) continue
    const first = cells[0]
    if (/^(Name|Item|Armor|Class|Container|Coin|Activity|Goods|Service|Lifestyle|Vehicle|Ship|Mount)\b/i.test(stripBold(first)) && /Cost|Funds|Capacity|Weight|cp\b|Value|DC|Pay|Speed/i.test(cells.slice(1).join(' '))) continue
    const isGroup = /^\*\*.+\*\*$/.test(first) && cells.slice(1).every((c) => !c)
    const isSub = /^—\s*/.test(first)
    out.push({ cells: cells.map(stripBold), isGroup, isSub })
  }
  return out
}

function sectionBounds(lines: string[], heading: RegExp): [number, number] {
  const start = lines.findIndex((l) => /^#{2,4}\s/.test(l) && heading.test(l))
  if (start < 0) throw new Error(`Başlık bulunamadı: ${heading}`)
  let end = lines.length
  for (let i = start + 1; i < lines.length; i++) {
    if (/^#{2,4}\s/.test(lines[i])) {
      end = i
      break
    }
  }
  return [start, end]
}

// ---------- Item şeması ----------
export type ItemCategory = 'weapon' | 'armor' | 'shield' | 'gear' | 'tool' | 'pack' | 'ammunition' | 'focus' | 'mount' | 'vehicle'

export interface Item {
  id: string
  name: string
  category: ItemCategory
  cost: Cost | null
  costGp: number | null
  weight: number | null
  group?: string // "Arcane focus", "Artisan's tools", "Gaming set", ...
  description?: string // md'den gelen kural/açıklama metni (Türkçe)
  // silah
  weaponClass?: 'simple' | 'martial'
  weaponRange?: 'melee' | 'ranged'
  damage?: string
  damageType?: string
  properties?: string[]
  // zırh
  armorType?: 'light' | 'medium' | 'heavy' | 'shield'
  acBase?: number
  acDexMax?: number | null // null = sınırsız Dex, 0 = Dex eklenmez
  strengthReq?: number | null
  stealthDisadvantage?: boolean
  // alet
  toolGroup?: 'artisan' | 'kit' | 'gaming' | 'instrument' | 'vehicle'
  // paket
  contents?: { itemId: string; qty: number; note?: string }[]
}

const items: Item[] = []
const byId = new Map<string, Item>()
// Tekil eşyaya değil, alet grubuna ait açıklamalar ("Artisan's Tools", "Gaming Set", ...)
const GROUP_DESCRIPTIONS: Record<string, string> = {}
function addItem(it: Item) {
  if (byId.has(it.id)) throw new Error(`Yinelenen item id: ${it.id}`)
  byId.set(it.id, it)
  items.push(it)
}

const equipLines = readFileSync(EQUIP_MD, 'utf8').split(/\r?\n/)

// ---------- 1) Silahlar ----------
{
  const [s, e] = sectionBounds(equipLines, /Weapons Table/i)
  let cls: 'simple' | 'martial' = 'simple'
  let rng: 'melee' | 'ranged' = 'melee'
  for (const r of tableRows(equipLines, s, e)) {
    if (r.isGroup) {
      const g = r.cells[0].toLowerCase()
      cls = g.includes('martial') ? 'martial' : 'simple'
      rng = g.includes('ranged') ? 'ranged' : 'melee'
      continue
    }
    const [name, costRaw, dmgRaw, wRaw, propRaw] = r.cells
    if (/unarmed strike/i.test(name)) continue // envanter eşyası değil
    const { cost, costGp } = parseCost(costRaw)
    const dm = dmgRaw.match(/^(\S+)\s+(\w+)/)
    addItem({
      id: slug(name),
      name,
      category: 'weapon',
      cost,
      costGp,
      weight: parseWeight(wRaw),
      weaponClass: cls,
      weaponRange: rng,
      damage: dm ? dm[1] : dmgRaw === '—' ? undefined : dmgRaw,
      damageType: dm ? dm[2] : undefined,
      properties:
        propRaw === '—'
          ? []
          : propRaw
              .split(/,\s*(?![^(]*\))/)
              .map((p) => p.trim())
              .filter(Boolean)
              // tabloda ilk harf bazen büyük ("Heavy, two-handed") — tekilleştir
              .map((p) => p.charAt(0).toLowerCase() + p.slice(1)),
    })
  }
}

// ---------- 2) Zırh & kalkan ----------
{
  const [s, e] = sectionBounds(equipLines, /Armor Table/i)
  let type: Item['armorType'] = 'light'
  for (const r of tableRows(equipLines, s, e)) {
    if (r.isGroup) {
      const g = r.cells[0].toLowerCase()
      type = g.includes('medium') ? 'medium' : g.includes('heavy') ? 'heavy' : g.includes('shield') ? 'shield' : 'light'
      continue
    }
    const [name, costRaw, acRaw, strRaw, stealthRaw, wRaw] = r.cells
    const { cost, costGp } = parseCost(costRaw)
    let acBase = 0
    let acDexMax: number | null = 0
    if (type === 'shield') {
      acBase = parseInt(acRaw.replace('+', ''), 10)
      acDexMax = 0
    } else {
      acBase = parseInt(acRaw.match(/^\d+/)?.[0] ?? '10', 10)
      if (/Dex modifier/i.test(acRaw)) {
        const cap = acRaw.match(/max\s*(\d+)/i)
        acDexMax = cap ? parseInt(cap[1], 10) : null
      } else acDexMax = 0
    }
    addItem({
      id: slug(name),
      name,
      category: type === 'shield' ? 'shield' : 'armor',
      cost,
      costGp,
      weight: parseWeight(wRaw),
      armorType: type,
      acBase,
      acDexMax,
      strengthReq: /Str\s*(\d+)/i.test(strRaw) ? parseInt(strRaw.match(/Str\s*(\d+)/i)![1], 10) : null,
      stealthDisadvantage: /disadvantage/i.test(stealthRaw),
    })
  }
}

// ---------- 3) Macera malzemeleri ----------
{
  const [s, e] = sectionBounds(equipLines, /Adventuring Gear Table/i)
  let group = ''
  for (const r of tableRows(equipLines, s, e)) {
    if (r.isGroup) {
      group = r.cells[0]
      continue
    }
    const rawName = r.cells[0].replace(/^—\s*/, '')
    const name = r.isSub ? `${group} — ${rawName}` : rawName
    if (!r.isSub) group = ''
    const [, costRaw, wRaw] = r.cells
    const { cost, costGp } = parseCost(costRaw)
    const lower = name.toLowerCase()
    const category: ItemCategory = /ammunition/i.test(group) && r.isSub ? 'ammunition' : /focus|holy symbol/i.test(group) && r.isSub ? 'focus' : 'gear'
    addItem({
      id: slug(name),
      name,
      category,
      cost,
      costGp,
      weight: parseWeight(wRaw),
      group: r.isSub ? group : undefined,
      // spellbook/component pouch da focus grubuna yakın ama tabloda tekil
      ...(lower === 'component pouch' ? { group: 'Spellcasting focus' } : {}),
    })
  }
}

// macera malzemesi açıklamaları: "- **Acid.** metin"
{
  const [s, e] = sectionBounds(equipLines, /Adventuring Gear Descriptions/i)
  for (let i = s; i < e; i++) {
    const m = equipLines[i].match(/^-\s+\*\*(.+?)\.?\*\*\s*(.+)$/)
    if (!m) continue
    const key = m[1].toLowerCase()
    const target = items.find((it) => {
      const n = it.name.toLowerCase()
      // "Acid" -> "Acid (vial)", "Hooded Lantern" -> "Lantern, hooded", "Rope" -> "Rope, hempen (50 feet)"
      return n === key || it.id === slug(key) || n.replace(/\s*\(.*\)$/, '') === key || n.endsWith(`— ${key}`) || it.id.startsWith(`${slug(key)}-`)
    })
    if (target && !target.description) target.description = m[2].trim()
  }
}

// ---------- 4) Aletler ----------
const STANDALONE_KITS = new Set([
  'disguise-kit',
  'forgery-kit',
  'herbalism-kit',
  'navigators-tools',
  'poisoners-kit',
  'thieves-tools',
  'vehicles-land-or-water',
])
{
  const [s, e] = sectionBounds(equipLines, /Tools Table/i)
  let group = ''
  for (const r of tableRows(equipLines, s, e)) {
    if (r.isGroup) {
      group = r.cells[0]
      continue
    }
    const [name, costRaw, wRaw] = r.cells
    const { cost, costGp } = parseCost(costRaw)
    // Tabloda bağımsız kitler grup başlığı olmadan araya serpiştirilmiş; bunlar
    // bir önceki grubun (Artisan's tools / Gaming set / Musical instrument) parçası değil.
    const isStandaloneKit = STANDALONE_KITS.has(slug(name))
    const g = isStandaloneKit ? '' : group.toLowerCase()
    const toolGroup: Item['toolGroup'] = /vehicles/i.test(name)
      ? 'vehicle'
      : g.includes('artisan')
        ? 'artisan'
        : g.includes('gaming')
          ? 'gaming'
          : g.includes('musical')
            ? 'instrument'
            : 'kit'
    addItem({
      id: slug(name),
      name,
      category: 'tool',
      cost,
      costGp,
      weight: parseWeight(wRaw),
      group: isStandaloneKit ? undefined : group || undefined,
      toolGroup,
    })
  }
}

// alet açıklamaları (equipment md): "- **Herbalism Kit.** metin"
{
  const [s, e] = sectionBounds(equipLines, /Tool Descriptions/i)
  for (let i = s; i < e; i++) {
    const m = equipLines[i].match(/^-\s+\*\*(.+?)\.?\*\*\s*(.+)$/)
    if (!m) continue
    const key = slug(m[1])
    const target = items.find((it) => it.id === key)
    if (target) target.description = m[2].trim()
    else GROUP_DESCRIPTIONS[key] = m[2].trim() // "Artisan's Tools", "Gaming Set", "Musical Instrument"
  }
}

// ---------- 5) Donanım paketleri ----------
// Paket içerikleri Türkçe düzyazı; item id eşlemesi elle (PHB birebir).
const PACK_CONTENTS: Record<string, { itemId: string; qty: number; note?: string }[]> = {
  "burglar's pack": [
    { itemId: 'backpack', qty: 1 },
    { itemId: 'ball-bearings-bag-of-1-000', qty: 1 },
    { itemId: 'rope-hempen-50-feet', qty: 1, note: '10 fit ip + 50 fit kenevir ip' },
    { itemId: 'bell', qty: 1 },
    { itemId: 'candle', qty: 5 },
    { itemId: 'crowbar', qty: 1 },
    { itemId: 'hammer', qty: 1 },
    { itemId: 'piton', qty: 10 },
    { itemId: 'lantern-hooded', qty: 1 },
    { itemId: 'oil-flask', qty: 2 },
    { itemId: 'rations-1-day', qty: 5 },
    { itemId: 'tinderbox', qty: 1 },
    { itemId: 'waterskin', qty: 1 },
  ],
  "diplomat's pack": [
    { itemId: 'chest', qty: 1 },
    { itemId: 'case-map-or-scroll', qty: 2 },
    { itemId: 'clothes-fine', qty: 1 },
    { itemId: 'ink-1-ounce-bottle', qty: 1 },
    { itemId: 'ink-pen', qty: 1 },
    { itemId: 'lamp', qty: 1 },
    { itemId: 'oil-flask', qty: 2 },
    { itemId: 'paper-one-sheet', qty: 5 },
    { itemId: 'perfume-vial', qty: 1 },
    { itemId: 'sealing-wax', qty: 1 },
    { itemId: 'soap', qty: 1 },
  ],
  "dungeoneer's pack": [
    { itemId: 'backpack', qty: 1 },
    { itemId: 'crowbar', qty: 1 },
    { itemId: 'hammer', qty: 1 },
    { itemId: 'piton', qty: 10 },
    { itemId: 'torch', qty: 10 },
    { itemId: 'tinderbox', qty: 1 },
    { itemId: 'rations-1-day', qty: 10 },
    { itemId: 'waterskin', qty: 1 },
    { itemId: 'rope-hempen-50-feet', qty: 1 },
  ],
  "entertainer's pack": [
    { itemId: 'backpack', qty: 1 },
    { itemId: 'bedroll', qty: 1 },
    { itemId: 'clothes-costume', qty: 2 },
    { itemId: 'candle', qty: 5 },
    { itemId: 'rations-1-day', qty: 5 },
    { itemId: 'waterskin', qty: 1 },
    { itemId: 'disguise-kit', qty: 1 },
  ],
  "explorer's pack": [
    { itemId: 'backpack', qty: 1 },
    { itemId: 'bedroll', qty: 1 },
    { itemId: 'mess-kit', qty: 1 },
    { itemId: 'tinderbox', qty: 1 },
    { itemId: 'torch', qty: 10 },
    { itemId: 'rations-1-day', qty: 10 },
    { itemId: 'waterskin', qty: 1 },
    { itemId: 'rope-hempen-50-feet', qty: 1 },
  ],
  "priest's pack": [
    { itemId: 'backpack', qty: 1 },
    { itemId: 'blanket', qty: 1 },
    { itemId: 'candle', qty: 10 },
    { itemId: 'tinderbox', qty: 1 },
    { itemId: 'alms-box', qty: 1 },
    { itemId: 'incense-block', qty: 2 },
    { itemId: 'censer', qty: 1 },
    { itemId: 'vestments', qty: 1 },
    { itemId: 'rations-1-day', qty: 2 },
    { itemId: 'waterskin', qty: 1 },
  ],
  "scholar's pack": [
    { itemId: 'backpack', qty: 1 },
    { itemId: 'book', qty: 1, note: 'bilgi kitabı (book of lore)' },
    { itemId: 'ink-1-ounce-bottle', qty: 1 },
    { itemId: 'ink-pen', qty: 1 },
    { itemId: 'parchment-one-sheet', qty: 10 },
    { itemId: 'bag-of-sand', qty: 1 },
    { itemId: 'small-knife', qty: 1 },
  ],
}

// Paket içeriğinde geçen ama Adventuring Gear tablosunda olmayan eşyalar
const EXTRA_GEAR: { id: string; name: string; costGp: number | null; weight: number | null; description?: string }[] = [
  { id: 'alms-box', name: 'Alms box (Sadaka kutusu)', costGp: null, weight: 1 },
  { id: 'incense-block', name: 'Block of incense (Tütsü bloğu)', costGp: null, weight: 0 },
  { id: 'censer', name: 'Censer (Buhurdan)', costGp: null, weight: 1 },
  { id: 'vestments', name: 'Vestments (Ayin giysileri)', costGp: null, weight: 4 },
  { id: 'bag-of-sand', name: 'Little bag of sand (Kum torbası)', costGp: null, weight: 1 },
  { id: 'small-knife', name: 'Small knife (Küçük bıçak)', costGp: null, weight: 0.25 },
  { id: 'prayer-book', name: 'Prayer book (Dua kitabı)', costGp: null, weight: 5 },
  { id: 'prayer-wheel', name: 'Prayer wheel (Dua çarkı)', costGp: null, weight: 2 },
  { id: 'incense-stick', name: 'Stick of incense (Tütsü çubuğu)', costGp: null, weight: 0 },
  { id: 'vestments-ceremonial', name: 'Ceremonial vestments (Törensel elbise)', costGp: null, weight: 4 },
  { id: 'fake-trinkets', name: 'Con tools (Sahte eşyalar: renkli şişeler, işaretli zar, damgalı kâğıt, sahte mühür yüzüğü)', costGp: null, weight: 1 },
  { id: 'guild-letter', name: "Letter of introduction from your guild (Lonca tanıtım mektubu)", costGp: null, weight: 0 },
  { id: 'scroll-case-notes', name: 'Scroll case stuffed full of notes (Notlarla dolu parşömen kutusu)', costGp: null, weight: 1 },
  { id: 'winter-blanket', name: 'Winter blanket (Kışlık battaniye)', costGp: null, weight: 3 },
  { id: 'pedigree-scroll', name: 'Scroll of pedigree (Soy ağacı belgesi)', costGp: null, weight: 0 },
  { id: 'animal-trophy', name: 'Trophy from an animal you killed (Hayvan trofesi)', costGp: null, weight: 1 },
  { id: 'staff-walking', name: 'Staff (Asa / yürüyüş sopası)', costGp: null, weight: 4 },
  { id: 'colleague-letter', name: 'Letter from a dead colleague posing an unanswered question (Meslektaş mektubu)', costGp: null, weight: 0 },
  { id: 'belaying-pin', name: 'Belaying pin (Gemi sapanı — club sayılır)', costGp: null, weight: 2 },
  { id: 'lucky-charm', name: 'Lucky charm (Şanslı muska)', costGp: null, weight: 0 },
  { id: 'rank-insignia', name: 'Insignia of rank (Askeri rütbe nişanı)', costGp: null, weight: 0 },
  { id: 'enemy-trophy', name: 'Trophy taken from a fallen enemy (Düşman ganimeti)', costGp: null, weight: 1 },
  { id: 'city-map', name: 'Map of the city you grew up in (Şehir haritası)', costGp: null, weight: 0 },
  { id: 'parent-token', name: 'Token to remember your parents by (Ebeveyn madalyonu)', costGp: null, weight: 0 },
  { id: 'fan-gift', name: "Favor of an admirer (Hayran hediyesi: aşk mektubu, saç tutamı ya da hatıra)", costGp: null, weight: 0 },
]

for (const g of EXTRA_GEAR) {
  addItem({
    id: g.id,
    name: g.name,
    category: 'gear',
    cost: g.costGp != null ? { amount: g.costGp, unit: 'gp' } : null,
    costGp: g.costGp,
    weight: g.weight,
    description: g.description,
  })
}

{
  const [s, e] = sectionBounds(equipLines, /Equipment Packs/i)
  for (let i = s; i < e; i++) {
    const m = equipLines[i].match(/^-\s+\*\*(.+?)\s*\((\d+)\s*gp\)\.?\*\*\s*(.+)$/)
    if (!m) continue
    const name = m[1].trim()
    const gp = parseInt(m[2], 10)
    const contents = PACK_CONTENTS[name.toLowerCase()]
    if (!contents) throw new Error(`Paket içeriği eşlenmedi: ${name}`)
    for (const c of contents) if (!byId.has(c.itemId)) throw new Error(`Paket ${name} bilinmeyen item: ${c.itemId}`)
    const weight = contents.reduce((sum, c) => sum + (byId.get(c.itemId)!.weight ?? 0) * c.qty, 0)
    addItem({
      id: slug(name),
      name,
      category: 'pack',
      cost: { amount: gp, unit: 'gp' },
      costGp: gp,
      weight: +weight.toFixed(2),
      description: m[3].trim(),
      contents,
    })
  }
}

// ---------- 6) Başlangıç serveti ----------
interface StartingWealth {
  classId: string
  dice: { count: number; die: number; multiplier: number }
  text: string
}
const startingWealth: StartingWealth[] = []
{
  const [s, e] = sectionBounds(equipLines, /Starting Wealth by Class/i)
  for (const r of tableRows(equipLines, s, e)) {
    const [cls, funds] = r.cells
    if (!cls || /^Class/i.test(cls)) continue
    const m = funds.match(/(\d+)d(\d+)(?:\s*×\s*(\d+))?/)
    if (!m) continue
    startingWealth.push({
      classId: slug(cls),
      dice: { count: parseInt(m[1], 10), die: parseInt(m[2], 10), multiplier: m[3] ? parseInt(m[3], 10) : 1 },
      text: funds,
    })
  }
}

// ---------- 7) Sikke kurları ----------
const coinage = { cp: 1, sp: 10, ep: 50, gp: 100, pp: 1000 } // cp cinsinden

// ---------- items.json ----------
mkdirSync(OUT, { recursive: true })
items.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name))
writeFileSync(
  join(OUT, 'items.json'),
  JSON.stringify({ items, startingWealth, coinage, groupDescriptions: GROUP_DESCRIPTIONS }, null, 1),
  'utf8',
)

// ---------- 8) Alet rehberleri (Xanathar) ----------
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

const SKILL_WORDS = [
  'Arcana',
  'History',
  'Insight',
  'Investigation',
  'Medicine',
  'Nature',
  'Perception',
  'Performance',
  'Persuasion',
  'Religion',
  'Sleight of Hand',
  'Stealth',
  'Survival',
  'Deception',
  'Intimidation',
  'Athletics',
  'Acrobatics',
  'Animal Handling',
]
function isSkillName(key: string): boolean {
  // "Arcana", "Nature and Survival", "Investigation, Perception", "Other Tools"
  // NOT: kelime sınırı şart — "Investigation" içinde "ve" geçiyor
  const parts = key.split(/\s*,\s*|\s+and\s+|\s+ve\s+/i).map((p) => p.trim())
  return parts.length > 0 && parts.every((p) => SKILL_WORDS.includes(p))
}

const toolLines = readFileSync(TOOLS_MD, 'utf8').split(/\r?\n/)
const toolGuides: ToolGuide[] = []
{
  // "## Alchemist's Supplies (Simyacı Malzemeleri)" ... bir sonraki H2'ye kadar
  const startIdx = toolLines.findIndex((l) => /^##\s+Alchemist's Supplies/i.test(l))
  const endIdx = toolLines.findIndex((l) => /^##\s+Spellcasting/i.test(l))
  const heads: number[] = []
  for (let i = startIdx; i < endIdx; i++) if (/^##\s+/.test(toolLines[i])) heads.push(i)
  heads.push(endIdx)

  for (let h = 0; h < heads.length - 1; h++) {
    const from = heads[h]
    const to = heads[h + 1]
    const hm = toolLines[from].match(/^##\s+(.+?)\s*\((.+?)\)\s*$/)
    if (!hm) continue
    const name = hm[1].trim()
    const guide: ToolGuide = {
      id: slug(name),
      name,
      nameTr: hm[2].trim(),
      intro: '',
      components: '',
      skills: [],
      special: [],
      sampleDCs: [],
    }
    const introParts: string[] = []
    for (let i = from + 1; i < to; i++) {
      const line = toolLines[i].trim()
      if (!line || line === '---') continue
      // "| Activity | DC |" tablosu
      if (line.startsWith('|')) {
        if (/^\|[\s|:-]+\|$/.test(line)) continue
        const cells = line
          .split('|')
          .slice(1, -1)
          .map((c) => c.trim())
        if (cells.length < 2) continue
        if (/^Activity$/i.test(cells[0])) continue
        guide.sampleDCs.push({ activity: cells[0], dc: cells[1] })
        continue
      }
      const bullet = line.match(/^-\s+\*\*(.+?)\.?\*\*\s*(.*)$/)
      if (bullet) {
        const key = bullet[1].trim()
        const text = bullet[2].trim()
        if (/^components$/i.test(key)) guide.components = text
        else if (isSkillName(key)) guide.skills.push({ skill: key, text })
        else guide.special.push({ name: key, text })
        continue
      }
      introParts.push(line)
    }
    guide.intro = introParts.join(' ')
    toolGuides.push(guide)
  }
}

// alet rehberi <-> item eşlemesi (fiyat/ağırlık item'dan, rehber metni buradan)
const TOOL_GUIDE_ALIAS: Record<string, string[]> = {
  'gaming-set': ['dice-set', 'dragonchess-set', 'playing-card-set', 'three-dragon-ante-set'],
  'musical-instruments': ['bagpipes', 'drum', 'dulcimer', 'flute', 'lute', 'lyre', 'horn', 'pan-flute', 'shawm', 'viol'],
  'land-and-water-vehicles': ['vehicles-land-or-water'],
}

writeFileSync(join(OUT, 'tool-guides.json'), JSON.stringify({ guides: toolGuides, alias: TOOL_GUIDE_ALIAS }, null, 1), 'utf8')

// ---------- 9) Durumlar ----------
export interface Condition {
  id: string
  name: string
  nameTr: string
  effects: string[]
  levels?: { level: number; effect: string }[]
  notes?: string[]
}

const condLines = readFileSync(COND_MD, 'utf8').split(/\r?\n/)
const conditions: Condition[] = []
{
  const heads: number[] = []
  condLines.forEach((l, i) => {
    if (/^##\s+/.test(l)) heads.push(i)
  })
  heads.push(condLines.length)
  for (let h = 0; h < heads.length - 1; h++) {
    const from = heads[h]
    const to = heads[h + 1]
    const hm = condLines[from].match(/^##\s+(.+?)\s*\((.+?)\)\s*$/)
    if (!hm) continue
    const cond: Condition = { id: slug(hm[1]), name: hm[1].trim(), nameTr: hm[2].trim(), effects: [] }
    const notes: string[] = []
    for (let i = from + 1; i < to; i++) {
      const line = condLines[i].trim()
      if (!line || line === '---' || /^Kaynak:/i.test(line)) continue
      if (line.startsWith('|')) {
        if (/^\|[\s|:-]+\|$/.test(line)) continue
        const cells = line
          .split('|')
          .slice(1, -1)
          .map((c) => c.trim())
        if (cells.length < 2 || /^Level|^Seviye/i.test(cells[0])) continue
        const lvl = parseInt(cells[0], 10)
        if (!Number.isNaN(lvl)) (cond.levels ??= []).push({ level: lvl, effect: cells[1] })
        continue
      }
      if (/^-\s+/.test(line)) cond.effects.push(line.replace(/^-\s+/, ''))
      else notes.push(line)
    }
    if (notes.length) cond.notes = notes
    conditions.push(cond)
  }
}

writeFileSync(join(OUT, 'conditions.json'), JSON.stringify(conditions, null, 1), 'utf8')

console.log(`items.json        : ${items.length} eşya, ${startingWealth.length} sınıf serveti`)
console.log(`tool-guides.json  : ${toolGuides.length} alet rehberi`)
console.log(`conditions.json   : ${conditions.length} durum`)
