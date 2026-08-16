// Statik oyun verisi — parse-guide.ts + parse-equipment.ts çıktısı. Tüm kural
// verisi buradan gelir; UI hiçbir kuralı elle hesaplamaz/uydurmaz.
import racesJson from './races.json'
import classesJson from './classes.json'
import backgroundsJson from './backgrounds.json'
import spellsJson from './spells.json'
import configJson from './config.json'
import itemsJson from './items.json'
import toolGuidesJson from './tool-guides.json'
import conditionsJson from './conditions.json'
import type { Race, Klass, Background, Spell, GameConfig, ItemsFile, Item, ToolGuidesFile, ToolGuide, Condition } from '@/types/data'

export const races = racesJson as unknown as Race[]
export const classes = classesJson as unknown as Klass[]
export const backgrounds = backgroundsJson as unknown as Background[]
export const spells = spellsJson as unknown as Spell[]
export const config = configJson as unknown as GameConfig

const itemsFile = itemsJson as unknown as ItemsFile
export const items = itemsFile.items
export const startingWealth = itemsFile.startingWealth
export const coinage = itemsFile.coinage
export const itemGroupDescriptions = itemsFile.groupDescriptions

const toolGuidesFile = toolGuidesJson as unknown as ToolGuidesFile
export const toolGuides = toolGuidesFile.guides
export const toolGuideAlias = toolGuidesFile.alias
export const conditions = conditionsJson as unknown as Condition[]

export const raceById = (id: string) => races.find((r) => r.id === id)
export const classById = (id: string) => classes.find((c) => c.id === id)
export const backgroundById = (id: string) => backgrounds.find((b) => b.id === id)
export const spellById = (id: string) => spells.find((s) => s.id === id)
export const spellsForClass = (classId: string) => spells.filter((s) => s.classes.includes(classId))

// ---- eşya erişimi ----
const ITEM_INDEX = new Map<string, Item>(items.map((i) => [i.id, i]))
export const itemById = (id: string): Item | undefined => ITEM_INDEX.get(id)
export const startingWealthFor = (classId: string) => startingWealth.find((w) => w.classId === classId)

// item id -> alet rehberi (tekil eşya ya da grup takma adı üzerinden)
const GUIDE_INDEX = new Map<string, ToolGuide>()
for (const g of toolGuides) {
  GUIDE_INDEX.set(g.id, g)
  for (const alias of toolGuideAlias[g.id] ?? []) GUIDE_INDEX.set(alias, g)
}
export const toolGuideForItem = (itemId: string): ToolGuide | undefined => GUIDE_INDEX.get(itemId)
export const conditionById = (id: string) => conditions.find((c) => c.id === id)
