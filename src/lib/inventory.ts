// Envanter, altın ve zırh/AC hesabı. Tüm eşyalar seçimlerden türetilir; kullanıcı
// envantere ya da altına elle bir şey yazmaz.
import { itemById, startingWealthFor } from '@/data'
import { startingEquipmentFor, resolveFilter, type EquipPick, type Grant } from '@/data/starting-equipment'
import { backgroundEquipmentFor } from '@/data/background-equipment'
import type { Character, Currency, InventoryEntry, InventorySource } from '@/types/character'
import type { Item } from '@/types/data'

// ---- seçim anahtarları (tek kaynak; UI ve türetme aynı anahtarı kullanır) ----
export const choiceKey = (scope: 'class' | 'bg', choiceId: string) => `${scope}:${choiceId}`
export const optionPickKey = (scope: 'class' | 'bg', choiceId: string, optionId: string) => `${scope}:${choiceId}:${optionId}`
export const fixedPickKey = (scope: 'class' | 'bg', pickId: string) => `${scope}:pick:${pickId}`

// ---- envanter derleme ----
function push(list: InventoryEntry[], itemId: string, qty: number, source: InventorySource, fromPack?: string) {
  const found = list.find((e) => e.itemId === itemId && e.source === source && e.fromPack === fromPack)
  if (found) found.qty += qty
  else list.push({ itemId, qty, source, fromPack })
}

function pushGrants(list: InventoryEntry[], grants: Grant[] | undefined, source: InventorySource) {
  for (const g of grants ?? []) push(list, g.itemId, g.qty ?? 1, source)
}

/** Bir paketin içindekileri ayrı satırlar olarak açar. */
export function expandPacks(list: InventoryEntry[]): InventoryEntry[] {
  const out: InventoryEntry[] = []
  for (const e of list) {
    const item = itemById(e.itemId)
    out.push(e)
    if (item?.category === 'pack' && item.contents) {
      for (const c of item.contents) push(out, c.itemId, c.qty * e.qty, 'pack', item.id)
    }
  }
  return out
}

/** Karakterin tüm eşyaları — sınıf + geçmiş + satın alımlar. Paketler açılmaz. */
export function buildInventory(c: Character): InventoryEntry[] {
  const list: InventoryEntry[] = []
  const bgEq = backgroundEquipmentFor(c.backgroundId)
  const clsEq = startingEquipmentFor(c.classId)

  // sınıf ekipmanı yalnızca "hazır paket" modunda gelir
  if (c.startingKit.mode === 'package' && clsEq) {
    pushGrants(list, clsEq.fixed, 'class')
    for (const choice of clsEq.choices) {
      const optId = c.equipChoices[choiceKey('class', choice.id)]
      const opt = choice.options.find((o) => o.id === optId)
      if (!opt) continue
      pushGrants(list, opt.grants, 'class')
      if (opt.pick) {
        for (const id of c.equipPicks[optionPickKey('class', choice.id, opt.id)] ?? []) push(list, id, 1, 'class')
      }
    }
    for (const p of clsEq.fixedPicks ?? []) {
      for (const id of c.equipPicks[fixedPickKey('class', p.id)] ?? []) push(list, id, 1, 'class')
    }
  }

  // geçmiş ekipmanı her modda gelir (PHB: geçmiş donanımı ayrıdır)
  if (bgEq) {
    pushGrants(list, bgEq.fixed, 'background')
    for (const choice of bgEq.choices ?? []) {
      const optId = c.equipChoices[choiceKey('bg', choice.id)]
      const opt = choice.options.find((o) => o.id === optId)
      if (!opt) continue
      pushGrants(list, opt.grants, 'background')
      if (opt.pick) {
        for (const id of c.equipPicks[optionPickKey('bg', choice.id, opt.id)] ?? []) push(list, id, 1, 'background')
      }
    }
    for (const p of bgEq.fixedPicks ?? []) {
      for (const id of c.equipPicks[fixedPickKey('bg', p.id)] ?? []) push(list, id, 1, 'background')
    }
  }

  // mağazadan alınanlar
  for (const p of c.purchases) if (p.qty > 0) push(list, p.itemId, p.qty, 'purchase')

  return list
}

// ---- para ----
export function purchasesTotalGp(c: Character): number {
  return c.purchases.reduce((sum, p) => sum + (itemById(p.itemId)?.costGp ?? 0) * p.qty, 0)
}

/** Harcanabilir başlangıç altını: geçmişin kesesi + (altın modundaysa) atılan zar. */
export function startingGoldGp(c: Character): number {
  const bg = backgroundEquipmentFor(c.backgroundId)?.gold ?? 0
  const rolled = c.startingKit.mode === 'gold' ? (c.startingKit.goldRolled ?? 0) : 0
  return bg + rolled
}

export function remainingGoldGp(c: Character): number {
  return +(startingGoldGp(c) - purchasesTotalGp(c)).toFixed(2)
}

/** Kalan altını sikkelere böler (gp artığı sp/cp'ye iner). */
export function currencyFromGp(gp: number): Currency {
  const safe = Math.max(0, gp)
  const cpTotal = Math.round(safe * 100)
  const GP = Math.floor(cpTotal / 100)
  const SP = Math.floor((cpTotal % 100) / 10)
  const CP = cpTotal % 10
  return { CP, SP, EP: 0, GP, PP: 0 }
}

/** Sınıfın başlangıç serveti zarını atar (ör. Barbarian 2d4 × 10). */
export function rollStartingWealth(classId: string): { total: number; dice: number[] } | null {
  const w = startingWealthFor(classId)
  if (!w) return null
  const dice: number[] = []
  for (let i = 0; i < w.dice.count; i++) dice.push(1 + Math.floor(Math.random() * w.dice.die))
  const total = dice.reduce((a, b) => a + b, 0) * w.dice.multiplier
  return { total, dice }
}

// ---- zırh / AC ----
export function armorItemsIn(c: Character): Item[] {
  const ids = new Set(buildInventory(c).map((e) => e.itemId))
  return [...ids].map((id) => itemById(id)).filter((i): i is Item => i?.category === 'armor')
}

// envanterdeki silahlar (saldırı satırları için)
export function weaponItemsIn(c: Character): Item[] {
  const ids = new Set(buildInventory(c).map((e) => e.itemId))
  return [...ids]
    .map((id) => itemById(id))
    .filter((i): i is Item => i?.category === 'weapon')
    .sort((a, b) => a.name.localeCompare(b.name))
}

export function hasShield(c: Character): boolean {
  return buildInventory(c).some((e) => e.itemId === 'shield')
}

/** Giyilen zırha göre AC. Zırh yoksa 10 + Dex. */
export function armorClassFrom(armor: Item | undefined, dexMod: number, shield: boolean): number {
  let ac: number
  if (!armor) ac = 10 + dexMod
  else if (armor.acDexMax === 0) ac = armor.acBase ?? 10
  else if (armor.acDexMax == null) ac = (armor.acBase ?? 10) + dexMod
  else ac = (armor.acBase ?? 10) + Math.min(dexMod, armor.acDexMax)
  return ac + (shield ? 2 : 0)
}

/** Zırhın Str şartı karşılanmıyorsa hız -10 ft. */
export function armorSpeedPenalty(armor: Item | undefined, strength: number): number {
  if (armor?.strengthReq && strength < armor.strengthReq) return 10
  return 0
}

// ---- yeterlilik (proficiency) ----
/** Seçimlerden gelen alet yeterlilikleri (item id). */
export function chosenToolProficiencies(c: Character): string[] {
  const out: string[] = []
  const clsEq = startingEquipmentFor(c.classId)
  const bgEq = backgroundEquipmentFor(c.backgroundId)
  const collect = (scope: 'class' | 'bg', picks: (EquipPick & { id: string })[] | undefined) => {
    for (const p of picks ?? []) {
      for (const id of c.equipPicks[fixedPickKey(scope, p.id)] ?? []) {
        if (itemById(id)?.category === 'tool') out.push(id)
      }
    }
  }
  collect('class', clsEq?.fixedPicks)
  collect('bg', bgEq?.fixedPicks)
  return [...new Set(out)]
}

// ---- doğrulama ----
export interface PendingChoice {
  key: string
  label: string
}

/** Henüz tamamlanmamış ekipman seçimleri. */
export function pendingEquipChoices(c: Character): PendingChoice[] {
  const out: PendingChoice[] = []
  const add = (key: string, label: string) => out.push({ key, label })

  const scopes: { scope: 'class' | 'bg'; eq: { choices?: import('@/data/starting-equipment').EquipChoice[]; fixedPicks?: (EquipPick & { id: string })[] } | undefined }[] = [
    { scope: 'class', eq: c.startingKit.mode === 'package' ? startingEquipmentFor(c.classId) : undefined },
    { scope: 'bg', eq: backgroundEquipmentFor(c.backgroundId) },
  ]

  for (const { scope, eq } of scopes) {
    if (!eq) continue
    for (const choice of eq.choices ?? []) {
      const k = choiceKey(scope, choice.id)
      const optId = c.equipChoices[k]
      const opt = choice.options.find((o) => o.id === optId)
      if (!opt) {
        add(k, choice.label)
        continue
      }
      if (opt.pick) {
        const picked = c.equipPicks[optionPickKey(scope, choice.id, opt.id)] ?? []
        if (picked.length < opt.pick.count) add(k, opt.pick.label)
      }
    }
    for (const p of eq.fixedPicks ?? []) {
      const picked = c.equipPicks[fixedPickKey(scope, p.id)] ?? []
      if (picked.length < p.count) add(fixedPickKey(scope, p.id), p.label)
    }
  }

  if (c.startingKit.mode === 'gold' && c.startingKit.goldRolled == null) {
    add('gold-roll', 'Başlangıç altınını at')
  }
  return out
}

/** Bir pick için seçilebilir eşyalar. */
export function pickOptions(pick: EquipPick): Item[] {
  return resolveFilter(pick.from).sort((a, b) => a.name.localeCompare(b.name))
}

// ---- görüntüleme ----
export function inventoryWeight(c: Character): number {
  // paketler içeriğine açılır; paketin kendi toplam ağırlığı iki kez sayılmasın
  const total = expandPacks(buildInventory(c)).reduce((sum, e) => {
    const item = itemById(e.itemId)
    if (!item || item.category === 'pack') return sum
    return sum + (item.weight ?? 0) * e.qty
  }, 0)
  return +total.toFixed(1)
}

/** Karakter sayfasındaki ekipman metni (PDF/export için). */
export function composeEquipmentText(c: Character): string {
  const list = buildInventory(c)
  if (!list.length) return ''
  const label = (e: InventoryEntry) => {
    const item = itemById(e.itemId)
    const name = item?.name ?? e.itemId
    return e.qty > 1 ? `${name} ×${e.qty}` : name
  }
  const bySource: Record<string, InventoryEntry[]> = {}
  for (const e of list) (bySource[e.source] ??= []).push(e)
  const titles: Record<string, string> = { class: 'Sınıf', background: 'Geçmiş', purchase: 'Satın alınan', pack: 'Paket' }
  return Object.entries(bySource)
    .map(([src, entries]) => `${titles[src] ?? src}: ${entries.map(label).join(', ')}`)
    .join('\n')
}
