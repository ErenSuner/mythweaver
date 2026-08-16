/**
 * parse-guide.ts
 * helper_files/dnd5e_ultimate_character_creation_guide.md -> src/data/*.json
 *
 * Guide serbest-metin Türkçe markdown. Bu script yapıyı (isim, açıklama, trait
 * tabloları, seviye-etiketli özellikler, subrace/subclass, büyüler) çıkarır.
 * Mekanik kritik alanlar (ability bonus, speed, hit die, save, skill seçimi,
 * büyü seviye/okul) regex ile parse edilir; ayrıca ham Türkçe metin korunur ki
 * UI her zaman guide açıklamasını gösterebilsin. Kural LLM ile üretilmez.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const GUIDE = join(ROOT, 'helper_files', 'dnd5e_ultimate_character_creation_guide.md')
const OUT = join(ROOT, 'src', 'data')

// ---------- yardımcılar ----------
const ABILITIES = ['Strength', 'Dexterity', 'Constitution', 'Intelligence', 'Wisdom', 'Charisma'] as const
type Ability = (typeof ABILITIES)[number]
const ABIL_TR: Record<string, Ability> = {
  strength: 'Strength', güç: 'Strength', str: 'Strength',
  dexterity: 'Dexterity', çeviklik: 'Dexterity', dex: 'Dexterity',
  constitution: 'Constitution', dayanıklılık: 'Constitution', con: 'Constitution',
  intelligence: 'Intelligence', zekâ: 'Intelligence', zeka: 'Intelligence', int: 'Intelligence',
  wisdom: 'Wisdom', bilgelik: 'Wisdom', wis: 'Wisdom',
  charisma: 'Charisma', karizma: 'Charisma', cha: 'Charisma',
}

function isFooter(line: string): boolean {
  return /D&D 5e Yeni Oyuncu Rehberi\s*—\s*sayfa/i.test(line)
}

interface Section {
  depth: number
  title: string
  start: number // header line index
  body: string[] // lines until next header (footers stripped)
}

const HEADER_RE = /^(#{1,6})\s+(.*?)\s*$/
function stripBold(s: string): string {
  return s.replace(/\*\*/g, '').replace(/_/g, '').trim()
}

function parseSections(lines: string[]): Section[] {
  const out: Section[] = []
  let cur: Section | null = null
  lines.forEach((raw, i) => {
    const line = raw.replace(/\r$/, '')
    const m = line.match(HEADER_RE)
    // sayfa kırılmasıyla bölünmüş büyü meta satırı sahte başlık gibi görünür
    // ("###### **Range:** ..."); gerçek başlık değil, önceki gövdeye ekle
    if (m && cur && /^\s*(Range|Components|Duration|Casting Time)\s*:/i.test(m[2].replace(/\*\*/g, ''))) {
      cur.body.push(m[2])
      return
    }
    if (m) {
      cur = { depth: m[1].length, title: stripBold(m[2]), start: i, body: [] }
      out.push(cur)
    } else if (cur) {
      if (!isFooter(line)) cur.body.push(line)
    }
  })
  return out
}

// Bir markdown tablosunu (|a|b|) satır dizisinden {key:value} olarak oku
function parseKvTable(body: string[]): Record<string, string> {
  const rows: Record<string, string> = {}
  for (const l of body) {
    const t = l.trim()
    if (!t.startsWith('|')) continue
    if (/^\|[-\s|]+\|?$/.test(t)) continue // ayraç
    const rawCells = t.split('|').slice(1, -1)
    if (rawCells.length >= 2) {
      const cells = rawCells.map((c) => c.replace(/<br>/g, ' ').trim())
      const key = stripBold(cells[0])
      if (key) rows[key] = cells.slice(1).join(' | ').trim()
    } else if (rawCells.length === 1 && /<br>/.test(rawCells[0])) {
      // page-break kaynaklı tek-kolon birleşik satır: "Key<br>Value..." (Entertainer)
      const [k, ...rest] = rawCells[0].split('<br>')
      const key = stripBold(k.trim())
      if (key) rows[key] = stripBold(rest.join(' ').replace(/<br>/g, ' ').trim())
    }
  }
  return rows
}

function bodyText(body: string[]): string {
  return body.map((l) => l.trim()).filter(Boolean).join('\n').trim()
}

const isTableLine = (l: string) => l.trim().startsWith('|')

function parseAbilityBonuses(text: string): Partial<Record<Ability, number>> {
  const out: Partial<Record<Ability, number>> = {}
  // "+2 Constitution", "+1 Wisdom", "Strength ve Constitution +2" gibi kalıplar
  const re = /([+-]?\d+)\s*([A-Za-zÇĞİÖŞÜçğıöşü]+)|([A-Za-zÇĞİÖŞÜçğıöşü]+)\s*([+-]?\d+)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    const num = m[1] ?? m[4]
    const word = (m[2] ?? m[3] ?? '').toLowerCase()
    const abil = ABIL_TR[word]
    if (abil && num) {
      const n = parseInt(num, 10)
      if (!Number.isNaN(n) && n !== 0) out[abil] = (out[abil] || 0) + n
    }
  }
  return out
}

// "— N. Seviye" / "4., 8., 12. Seviye" etiketinden seviye(ler) çıkar
function parseFeatureLevels(title: string): { name: string; levels: number[] } {
  // "... — 4., 8., 12., 16., 19. Seviye" -> tüm sayılar
  const m = title.match(/^(.*?)[—-]\s*([\d.,\s]+)\s*Seviye\s*$/i)
  if (m) {
    const nums = (m[2].match(/\d+/g) || []).map((n) => parseInt(n, 10))
    if (nums.length) return { name: m[1].trim(), levels: [...new Set(nums)] }
  }
  const m2 = title.match(/(\d+)\s*\.\s*Seviye/i)
  if (m2 && !/SUBCLASS/i.test(title)) return { name: title.replace(/[—-]?\s*[\d.,\s]*Seviye.*/i, '').trim() || title, levels: [parseInt(m2[1], 10)] }
  return { name: title, levels: [] }
}

const raw = readFileSync(GUIDE, 'utf-8')
const lines = raw.split('\n')
const sections = parseSections(lines)

// bölüm sınırları (başlık indexleri)
function findSectionIdx(pred: (s: Section) => boolean): number {
  return sections.findIndex(pred)
}
const iRaces = findSectionIdx((s) => /BÖLÜM 1/.test(s.title))
const iClasses = findSectionIdx((s) => /BÖLÜM 2/.test(s.title))
const iBackgrounds = findSectionIdx((s) => /BÖLÜM 3/.test(s.title))
const iSpells = findSectionIdx((s) => /BÜYÜLER/i.test(s.title) && /Kapsamlı Rehber|Büyüler —/i.test(s.title))

// ============ IRKLAR ============
const UPPER_PAREN = /^[A-ZÇĞİÖŞÜ][A-ZÇĞİÖŞÜ'’ \/-]*\(.+\)$/
function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/\(.+\)/g, '')
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
function enName(title: string): string {
  return title.replace(/\s*\(.+\)\s*$/, '').trim()
}
function trName(title: string): string {
  const m = title.match(/\((.+)\)\s*$/)
  return m ? m[1].trim() : ''
}

interface Subrace { id: string; name: string; description: string; abilityBonuses: Partial<Record<Ability, number>>; speed?: number; hpPerLevelBonus?: number }
interface Trait { name: string; description: string }
interface AbilityChoice { count: number; amount: number }
interface Race {
  id: string; name: string; nameTr: string; description: string
  abilityBonuses: Partial<Record<Ability, number>>
  abilityBonusesAll?: number // Human: her stat'a +N
  abilityBonusChoice?: AbilityChoice // Half-Elf: seçmeli +N x count
  abilityScoreText: string
  speed: number | null; sizeText: string; ageText: string; alignmentText: string
  languages: string; languagesRaw: string
  traits: Trait[]; subraces: Subrace[]
  _placeholder?: string
}

function sliceEntries(fromIdx: number, toIdx: number, isEntry: (s: Section) => boolean): { entry: Section; children: Section[] }[] {
  const res: { entry: Section; children: Section[] }[] = []
  let cur: { entry: Section; children: Section[] } | null = null
  for (let i = fromIdx + 1; i < toIdx; i++) {
    const s = sections[i]
    if (isEntry(s)) {
      cur = { entry: s, children: [] }
      res.push(cur)
    } else if (cur) {
      cur.children.push(s)
    }
  }
  return res
}

// Irk bölümü ile BÖLÜM 2 arasında "TEMEL MEKANİK TERİMLER" sözlüğü var; onun
// depth-6 girdileri son ırka (Tiefling) trait olarak sızmasın diye ırk slice'ını
// sözlük başlığında bitir.
const iGlossary = findSectionIdx((s) => /TEMEL MEKANİK TERİMLER/i.test(s.title))
const racesEnd = iGlossary > iRaces ? iGlossary : iClasses

const races: Race[] = []
if (iRaces >= 0 && racesEnd > iRaces) {
  const entries = sliceEntries(iRaces, racesEnd, (s) => s.depth === 6 && UPPER_PAREN.test(s.title))
  for (const { entry, children } of entries) {
    const race: Race = {
      id: slug(entry.title), name: enName(entry.title), nameTr: trName(entry.title),
      description: bodyText(entry.body), abilityBonuses: {}, abilityScoreText: '', speed: null,
      sizeText: '', ageText: '', alignmentText: '', languages: '', languagesRaw: '',
      traits: [], subraces: [],
    }
    let mode: '' | 'traits' | 'subrace' = ''
    for (const c of children) {
      const title = c.title
      if (/Temel Trait|Temel Özellik/i.test(title)) {
        const kv = parseKvTable(c.body)
        for (const [k, v] of Object.entries(kv)) {
          // NOT: exact key eşleşmesi — /Age/ "Languages" içindeki 'age'i yakalamasın
          if (/^Ability Score/i.test(k)) {
            race.abilityScoreText = v
            const allM = v.match(/Tüm ability score.*?\+(\d+)/i)
            if (allM) race.abilityBonusesAll = parseInt(allM[1], 10)
            else {
              Object.assign(race.abilityBonuses, parseAbilityBonuses(v))
              const chM = v.match(/(iki|üç|dört|\d+)\s*farklı ability score'a\s*\+(\d+)/i)
              if (chM) {
                const nm: Record<string, number> = { iki: 2, üç: 3, dört: 4 }
                race.abilityBonusChoice = { count: nm[chM[1].toLowerCase()] ?? parseInt(chM[1], 10), amount: parseInt(chM[2], 10) }
              }
            }
          }
          else if (/^Speed$/i.test(k)) { const mm = v.match(/(\d+)\s*ft/i); race.speed = mm ? parseInt(mm[1], 10) : null }
          else if (/^Size$/i.test(k)) race.sizeText = v
          else if (/^Age$/i.test(k)) race.ageText = v
          else if (/^Alignment$/i.test(k)) race.alignmentText = v
          else if (/^Languages$/i.test(k)) { race.languagesRaw = v; race.languages = v }
        }
        // page-break dil satırı fallback (Human): tabloda yoksa trait gövdesinden yakala
        if (!race.languages) {
          const langLine = c.body.find((l) => /Common\s*\+/i.test(l) && !isTableLine(l))
          if (langLine) { race.languages = langLine.trim(); race.languagesRaw = langLine.trim() }
        }
        continue
      }
      if (/Özel Yetenek/i.test(title)) { mode = 'traits'; continue }
      if (/Subrace/i.test(title)) {
        mode = 'subrace'
        // subrace'ler body içinde **Name:** satırları
        for (const l of c.body) {
          const mm = l.trim().match(/^\*\*(.+?):\*\*\s*(.*)$/)
          if (mm) {
            const desc = mm[2].trim()
            const sub: Subrace = { id: slug(mm[1]), name: mm[1].trim(), description: desc, abilityBonuses: parseAbilityBonuses(desc) }
            // subrace hız override'ı (Wood Elf: "Fleet of Foot: Hız 35 ft olur")
            const speedM = desc.match(/Hız\s*(\d+)\s*ft/i)
            if (speedM) sub.speed = parseInt(speedM[1], 10)
            // seviye-başı HP bonusu (Hill Dwarf: "Max HP her seviyede +1 artar")
            const hpM = desc.match(/Max HP.*?\+(\d+)/i)
            if (hpM) sub.hpPerLevelBonus = parseInt(hpM[1], 10)
            race.subraces.push(sub)
          }
        }
        continue
      }
      if (mode === 'traits' && c.depth === 6) {
        race.traits.push({ name: title, description: bodyText(c.body) })
      }
    }
    races.push(race)
  }
}

// ============ SINIFLAR ============
interface ClassFeature { name: string; level: number; description: string }
interface Klass {
  id: string; name: string; nameTr: string; description: string
  hitDie: number | null; primaryAbility: string; savingThrows: Ability[]
  armor: string; weapons: string; tools: string
  skillChoices: { count: number | null; options: string; raw: string }
  startingEquipment: string; hpText: string
  levelFeatures: Record<number, ClassFeature[]>
  isCaster: boolean; spellcastingAbility: Ability | null
  subclassLevel: number | null
  subclasses: { id: string; name: string; nameTr: string; description: string; levelFeatures: Record<number, ClassFeature[]> }[]
  otherSections: Trait[]
  _placeholder?: string
}
const HITDIE_RE = /d(\d+)/i
function parseSaves(text: string): Ability[] {
  const out: Ability[] = []
  const re = /(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma|Güç|Çeviklik|Dayanıklılık|Zekâ|Zeka|Bilgelik|Karizma)/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) { const a = ABIL_TR[m[1].toLowerCase()]; if (a && !out.includes(a)) out.push(a) }
  return out
}
const SPELL_ABILITY_BY_CLASS: Record<string, Ability> = {
  wizard: 'Intelligence', cleric: 'Wisdom', druid: 'Wisdom',
  sorcerer: 'Charisma', bard: 'Charisma', paladin: 'Charisma', warlock: 'Charisma', ranger: 'Wisdom',
}

const classes: Klass[] = []
if (iClasses >= 0 && iBackgrounds > iClasses) {
  const entries = sliceEntries(iClasses, iBackgrounds, (s) => s.depth === 6 && UPPER_PAREN.test(s.title))
  for (const { entry, children } of entries) {
    const id = slug(entry.title)
    const k: Klass = {
      id, name: enName(entry.title), nameTr: trName(entry.title), description: bodyText(entry.body),
      hitDie: null, primaryAbility: '', savingThrows: [], armor: '', weapons: '', tools: '',
      skillChoices: { count: null, options: '', raw: '' }, startingEquipment: '', hpText: '',
      levelFeatures: {}, isCaster: id in SPELL_ABILITY_BY_CLASS,
      spellcastingAbility: SPELL_ABILITY_BY_CLASS[id] ?? null,
      subclassLevel: null, subclasses: [], otherSections: [],
    }
    let inFeatures = false
    let inSubclass = false
    // SUBCLASS bloğundan sonra gelen başlıklar sırayla o alt sınıfa aittir
    let curSub: Klass['subclasses'][number] | null = null
    for (const c of children) {
      const title = c.title
      // subclass bloğu başlangıcı
      if (/^SUBCLASS/i.test(title)) {
        inSubclass = true
        curSub = null
        const lm = title.match(/(\d+)\s*\.?\s*Seviye/i)
        if (lm) k.subclassLevel = parseInt(lm[1], 10)
        continue
      }
      if (/Temel Özellik|Temel Trait/i.test(title)) {
        const kv = parseKvTable(c.body)
        for (const [key, v] of Object.entries(kv)) {
          if (/Hit Die/i.test(key)) { const mm = v.match(HITDIE_RE); k.hitDie = mm ? parseInt(mm[1], 10) : null }
          else if (/Primary Ability/i.test(key)) k.primaryAbility = v
          else if (/Saving Throw/i.test(key)) k.savingThrows = parseSaves(v)
          else if (/Armor/i.test(key)) k.armor = v
          else if (/Weapon/i.test(key)) k.weapons = v
          else if (/Tool/i.test(key)) k.tools = v
          else if (/Skill/i.test(key)) {
            k.skillChoices.raw = v
            const cm = v.match(/(ikisini|üçünü|birini|dördünü|iki|üç|dört)/i)
            const map: Record<string, number> = { birini: 1, iki: 2, ikisini: 2, üç: 3, üçünü: 3, dört: 4, dördünü: 4 }
            k.skillChoices.count = cm ? map[cm[1].toLowerCase()] ?? null : null
            k.skillChoices.options = v
          }
        }
        // Fallback (Warlock): sayfa-sonu bölmesi yüzünden "Skills" tablo dışında
        // kalmış olabilir; tablo gövdesinden "...dan ikisini seç" satırını yakala.
        if (!k.skillChoices.count) {
          const skillLine = c.body.find((l) => /(ikisini|üçünü|birini|dördünü)\s*seç/i.test(l) && l.includes(',') && !isTableLine(l))
          if (skillLine) {
            const v = skillLine.trim()
            const cm = v.match(/(ikisini|üçünü|birini|dördünü)/i)
            const map: Record<string, number> = { birini: 1, ikisini: 2, üçünü: 3, dördünü: 4 }
            k.skillChoices.raw = v
            k.skillChoices.count = cm ? map[cm[1].toLowerCase()] ?? null : null
            k.skillChoices.options = v
          }
        }
        continue
      }
      if (/Başlangıç Ekipman/i.test(title)) { k.startingEquipment = bodyText(c.body); continue }
      if (/HP Hesaplama/i.test(title)) { k.hpText = bodyText(c.body); continue }
      if (/Sınıf Özellikleri/i.test(title)) { inFeatures = true; continue }
      // seviye etiketli özellik
      const { name, levels } = parseFeatureLevels(title)

      // --- SUBCLASS bloğu içindeyiz: her şey aktif alt sınıfa ait ---
      if (inSubclass && c.depth === 6) {
        if (levels.length && curSub) {
          // alt sınıfın seviye özelliği — sınıfın geneline YAZILMAZ
          for (const level of levels) (curSub.levelFeatures[level] ||= []).push({ name, level, description: bodyText(c.body) })
          continue
        }
        // "Domain Büyüleri:", "Cantrip Nedir?", "Orman (Forest):" gibi devam
        // başlıkları yeni alt sınıf değildir; aktif alt sınıfın metnine eklenir
        if (curSub && /[:?]\s*$/.test(title)) {
          curSub.description = `${curSub.description}\n**${title}**\n${bodyText(c.body)}`.trim()
          continue
        }
        if (!levels.length) {
          curSub = {
            id: slug(title),
            name: enName(title),
            nameTr: trName(title),
            description: bodyText(c.body),
            levelFeatures: {},
          }
          k.subclasses.push(curSub)
          continue
        }
      }

      if (levels.length) {
        inFeatures = true
        for (const level of levels) (k.levelFeatures[level] ||= []).push({ name, level, description: bodyText(c.body) })
      } else if (inFeatures && c.depth === 6) {
        k.otherSections.push({ name: title, description: bodyText(c.body) })
      }
    }
    classes.push(k)
  }
}

// ============ BACKGROUNDS ============
interface DiceRow { roll: string; text: string }
interface Background {
  id: string; name: string; nameTr: string; description: string
  skillProficiencies: string; languages: string; toolProficiencies: string; equipment: string
  feature: { name: string; description: string } | null
  personalityTraits: DiceRow[]; ideals: DiceRow[]; bonds: DiceRow[]; flaws: DiceRow[]
}
// yalnız düz paragraf metni (tablo satırları hariç)
function bodyTextNoTable(body: string[]): string {
  return body.filter((l) => !isTableLine(l)).map((l) => l.trim()).filter(Boolean).join('\n').trim()
}
type DiceCat = 'personality' | 'ideals' | 'bonds' | 'flaws'
// Birleşik kişilik tablosunu kategori başlık-satırlarına göre böl
// (|**d8**|**Personality Trait (Kişilik)**| kategori değiştirir; |N|metin| veri satırı)
function parseDiceCategories(body: string[]): Record<DiceCat, DiceRow[]> {
  const out: Record<DiceCat, DiceRow[]> = { personality: [], ideals: [], bonds: [], flaws: [] }
  let cur: DiceCat | null = null
  for (const l of body) {
    const t = l.trim()
    if (!t.startsWith('|')) continue
    if (/^\|[-\s|]+\|?$/.test(t)) continue
    const cells = t.split('|').slice(1, -1).map((c) => c.replace(/<br>/g, ' ').trim())
    if (cells.length < 2) continue
    const c0 = stripBold(cells[0])
    const c1 = stripBold(cells[1])
    // kategori başlık satırı: ilk hücre d4/d6/d8/d10 ...
    if (/^d\d+$/i.test(c0)) {
      if (/Personality|Kişilik/i.test(c1)) cur = 'personality'
      else if (/Ideal|Ülkü/i.test(c1)) cur = 'ideals'
      else if (/Bond|Bağ/i.test(c1)) cur = 'bonds'
      else if (/Flaw|Kusur/i.test(c1)) cur = 'flaws'
      continue
    }
    // veri satırı
    if (/^\d+$/.test(c0) && cur) out[cur].push({ roll: c0, text: cells.slice(1).join(' ').trim() })
  }
  return out
}

const backgrounds: Background[] = []
if (iBackgrounds >= 0) {
  const endIdx = iSpells > iBackgrounds ? iSpells : sections.length
  const entries = sliceEntries(iBackgrounds, endIdx, (s) => s.depth === 6 && UPPER_PAREN.test(s.title))
  for (const { entry, children } of entries) {
    const bg: Background = {
      id: slug(entry.title), name: enName(entry.title), nameTr: trName(entry.title),
      description: bodyTextNoTable(entry.body), skillProficiencies: '', languages: '', toolProficiencies: '',
      equipment: '', feature: null, personalityTraits: [], ideals: [], bonds: [], flaws: [],
    }
    // proficiency tablosu entry gövdesinde (|Özellik|Detay|)
    const kv = parseKvTable(entry.body)
    for (const [key, v] of Object.entries(kv)) {
      if (/Skill Prof/i.test(key)) bg.skillProficiencies = v
      else if (/^Language/i.test(key)) bg.languages = v
      else if (/Tool Prof/i.test(key)) bg.toolProficiencies = v
      else if (/^Equipment/i.test(key)) bg.equipment = v
    }
    for (const c of children) {
      const title = c.title
      if (/Feature:/i.test(title) || /^Feature/i.test(title)) {
        bg.feature = { name: title.replace(/^Feature:?\s*/i, '').trim(), description: bodyTextNoTable(c.body) }
        continue
      }
      if (/Kişilik|Personality/i.test(title)) {
        const cats = parseDiceCategories(c.body)
        bg.personalityTraits = cats.personality
        bg.ideals = cats.ideals
        bg.bonds = cats.bonds
        bg.flaws = cats.flaws
      }
    }
    backgrounds.push(bg)
  }
}

// ============ BÜYÜLER ============
interface Spell {
  id: string; name: string; level: number; school: string
  castingTime: string; range: string; components: string; duration: string
  description: string; classes: string[]
}
const spellMap = new Map<string, Spell>()
// büyü sınıf blokları: "## **X BÜYÜLERİ**"
const spellClassSections = sections.filter((s) => /BÜYÜLERİ\s*$/i.test(s.title) && s.depth <= 3)
function parseSpellMeta(body: string[]): { school: string; castingTime: string; range: string; components: string; duration: string; description: string } {
  const clean = body.map((l) => l.trim()).filter(Boolean)
  const meta = { school: '', castingTime: '', range: '', components: '', duration: '', description: '' }
  // meta genelde tek satır; sayfa kırılmasında birkaç satıra bölünebilir
  const metaIdx = clean.findIndex((l) => /Casting Time:/i.test(l))
  let lastMeta = metaIdx
  for (let j = metaIdx + 1; j < clean.length; j++) {
    if (/^\*{0,2}\s*(Range|Components|Duration)\s*:/i.test(clean[j].replace(/\*\*/g, '').trim()) || /\*\*(Range|Components|Duration):/i.test(clean[j])) lastMeta = j
    else break
  }
  const metaLine = metaIdx >= 0 ? clean.slice(metaIdx, lastMeta + 1).join(' ') : ''
  const schoolM = metaLine.match(/_([^_]+)_/)
  if (schoolM) meta.school = schoolM[1].trim()
  const grab = (label: string) => {
    const re = new RegExp('\\*\\*' + label + ':\\*\\*\\s*(.*?)(?=\\s*\\*\\*[A-Za-z][^:]*:\\*\\*|$)', 'i')
    const m = metaLine.match(re)
    return m ? m[1].trim() : ''
  }
  meta.castingTime = grab('Casting Time')
  meta.range = grab('Range')
  meta.components = grab('Components')
  meta.duration = grab('Duration')
  // açıklama = meta satırlarından sonraki satırlar
  meta.description = clean.slice(lastMeta + 1).join('\n').trim()
  return meta
}
for (const classSec of spellClassSections) {
  const classId = slug(classSec.title.replace(/BÜYÜLERİ/i, ''))
  const idx = sections.indexOf(classSec)
  let curLevel = 0
  for (let i = idx + 1; i < sections.length; i++) {
    const s = sections[i]
    if (/BÜYÜLERİ\s*$/i.test(s.title) && s.depth <= 3) break // sonraki sınıf
    // seviye başlığı
    const lm = s.title.match(/(\d+)\s*\.\s*(SEVİYE|Seviye)/)
    if (/CANTR/i.test(s.title) || /0\.\s*Seviye/i.test(s.title)) { curLevel = 0; continue }
    if (lm && /SEVİYE BÜYÜLER|Seviye Büyüler/i.test(s.title)) { curLevel = parseInt(lm[1], 10); continue }
    // büyü girdisi: seviye/başlık değil, gövdesinde meta var
    if (s.depth === 6 && !/Seviye|SEVİYE|CANTR/i.test(s.title)) {
      const hasMeta = s.body.some((l) => /Casting Time:/i.test(l))
      if (!hasMeta) continue
      const meta = parseSpellMeta(s.body)
      const id = slug(s.title)
      const existing = spellMap.get(id)
      if (existing) {
        if (!existing.classes.includes(classId)) existing.classes.push(classId)
      } else {
        // seviyeyi italic'ten de doğrula ("1st-level", "cantrip")
        let level = curLevel
        const it = meta.school.toLowerCase()
        if (/cantrip/.test(it)) level = 0
        const nm = it.match(/(\d+)(st|nd|rd|th)-level/)
        if (nm) level = parseInt(nm[1], 10)
        spellMap.set(id, {
          id, name: s.title.trim(), level, school: meta.school,
          castingTime: meta.castingTime, range: meta.range, components: meta.components,
          duration: meta.duration, description: meta.description, classes: [classId],
        })
      }
    }
  }
}
const spells = [...spellMap.values()].sort((a, b) => a.level - b.level || a.name.localeCompare(b.name))

// ============ CONFIG (statik 5e kuralları) ============
const config = {
  pointBuy: {
    totalPoints: 27, min: 8, max: 15,
    // standart 5e maliyet tablosu (guide'da açık tablo yok; kanonik kural)
    cost: { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 } as Record<number, number>,
  },
  proficiencyBonusByLevel: {
    1: 2, 2: 2, 3: 2, 4: 2, 5: 3, 6: 3, 7: 3, 8: 3, 9: 4, 10: 4,
    11: 4, 12: 4, 13: 5, 14: 5, 15: 5, 16: 5, 17: 6, 18: 6, 19: 6, 20: 6,
  } as Record<number, number>,
  abilityScoreImprovementLevels: [4, 8, 12, 16, 19],
  skills: {
    Acrobatics: 'Dexterity', 'Animal Handling': 'Wisdom', Arcana: 'Intelligence', Athletics: 'Strength',
    Deception: 'Charisma', History: 'Intelligence', Insight: 'Wisdom', Intimidation: 'Charisma',
    Investigation: 'Intelligence', Medicine: 'Wisdom', Nature: 'Intelligence', Perception: 'Wisdom',
    Performance: 'Charisma', Persuasion: 'Charisma', Religion: 'Intelligence', 'Sleight of Hand': 'Dexterity',
    Stealth: 'Dexterity', Survival: 'Wisdom',
  } as Record<string, Ability>,
  skillsTr: {
    Acrobatics: 'Akrobasi', 'Animal Handling': 'Hayvan Terbiyesi', Arcana: 'Gizli Bilgi', Athletics: 'Atletizm',
    Deception: 'Aldatma', History: 'Tarih', Insight: 'Sezgi', Intimidation: 'Sindirme',
    Investigation: 'Araştırma', Medicine: 'Tıp', Nature: 'Doğa', Perception: 'Algılama',
    Performance: 'Performans', Persuasion: 'İkna', Religion: 'Din', 'Sleight of Hand': 'El Çabukluğu',
    Stealth: 'Gizlenme', Survival: 'Hayatta Kalma',
  } as Record<string, string>,
  abilitiesTr: {
    Strength: 'Güç', Dexterity: 'Çeviklik', Constitution: 'Dayanıklılık',
    Intelligence: 'Zekâ', Wisdom: 'Bilgelik', Charisma: 'Karizma',
  } as Record<Ability, string>,
  currencies: ['CP', 'SP', 'EP', 'GP', 'PP'],
}

// ---------- yaz ----------
mkdirSync(OUT, { recursive: true })
function write(name: string, data: unknown) {
  writeFileSync(join(OUT, name), JSON.stringify(data, null, 2), 'utf-8')
}
write('races.json', races)
write('classes.json', classes)
write('backgrounds.json', backgrounds)
write('spells.json', spells)
write('config.json', config)

// ---------- rapor ----------
const totalFeatures = classes.reduce((n, c) => n + Object.values(c.levelFeatures).reduce((m, a) => m + a.length, 0), 0)
console.log('=== PARSE RAPORU ===')
console.log(`Irklar: ${races.length} (subrace: ${races.reduce((n, r) => n + r.subraces.length, 0)})`)
console.log(`Sınıflar: ${classes.length}, toplam seviye özelliği: ${totalFeatures}`)
console.log(`Backgrounds: ${backgrounds.length}`)
console.log(`Büyüler: ${spells.length}`)
const missAbil = races.filter((r) => Object.keys(r.abilityBonuses).length === 0 && !r.abilityBonusesAll).map((r) => r.name)
if (missAbil.length) console.warn('UYARI ability bonus çıkmayan ırk:', missAbil.join(', '))
const missHitDie = classes.filter((c) => !c.hitDie).map((c) => c.name)
if (missHitDie.length) console.warn('UYARI hit die çıkmayan sınıf:', missHitDie.join(', '))
const noFeat = classes.filter((c) => Object.keys(c.levelFeatures).length === 0).map((c) => c.name)
if (noFeat.length) console.warn('UYARI seviye özelliği çıkmayan sınıf:', noFeat.join(', '))
