// Eşya bilgisi -> okunabilir etiketler. Yeni oyuncu için hep Türkçe açıklama +
// parantez içinde İngilizce oyun terimi.
import type { Item } from '@/types/data'

export function costLabel(item: Item): string {
  if (!item.cost) return '—'
  return `${item.cost.amount} ${item.cost.unit}`
}

export function gpLabel(gp: number): string {
  if (gp >= 1 || gp === 0) return `${+gp.toFixed(2)} gp`
  const sp = gp * 10
  if (sp >= 1) return `${+sp.toFixed(1)} sp`
  return `${Math.round(gp * 100)} cp`
}

export function weightLabel(item: Item): string {
  if (item.weight == null) return '—'
  return `${item.weight} lb`
}

const DAMAGE_TR: Record<string, string> = {
  bludgeoning: 'ezme',
  piercing: 'delme',
  slashing: 'kesme',
}

export function damageLabel(item: Item): string | null {
  if (!item.damage) return null
  const tr = item.damageType ? DAMAGE_TR[item.damageType] ?? item.damageType : ''
  return tr ? `${item.damage} ${tr}` : item.damage
}

const PROPERTY_TR: Record<string, string> = {
  ammunition: 'Mühimmat — ayrı ok/bolt gerekir.',
  finesse: 'Finesse — saldırı ve hasarda Güç yerine Çeviklik kullanabilirsin.',
  heavy: 'Ağır — Small boyutlu yaratıklar dezavantajla saldırır.',
  light: 'Hafif — iki silahla saldırıya (two-weapon fighting) uygun.',
  loading: 'Loading — turda yalnızca bir kez ateşlenir.',
  reach: 'Reach — 5 fit daha uzağa erişir.',
  special: 'Özel — kendine has kuralı vardır.',
  thrown: 'Fırlatılabilir — menzilli saldırı olarak atabilirsin.',
  'two-handed': 'İki elli — kullanmak için iki el gerekir.',
  versatile: 'Versatile — iki elle tutunca daha çok hasar verir.',
}

/** "Ammunition (range 80/320)" -> açıklama. */
export function propertyHelp(prop: string): string | null {
  const key = prop.toLowerCase().split(' (')[0].trim()
  return PROPERTY_TR[key] ?? null
}

export function armorLabel(item: Item): string | null {
  if (item.category === 'shield') return `AC +${item.acBase}`
  if (item.category !== 'armor') return null
  if (item.acDexMax === 0) return `AC ${item.acBase}`
  if (item.acDexMax == null) return `AC ${item.acBase} + Dex`
  return `AC ${item.acBase} + Dex (maks ${item.acDexMax})`
}

const ARMOR_TYPE_TR: Record<string, string> = {
  light: 'hafif zırh',
  medium: 'orta zırh',
  heavy: 'ağır zırh',
  shield: 'kalkan',
}

const CATEGORY_TR: Record<string, string> = {
  weapon: 'Silah',
  armor: 'Zırh',
  shield: 'Kalkan',
  gear: 'Malzeme',
  tool: 'Alet',
  pack: 'Donanım paketi',
  ammunition: 'Mühimmat',
  focus: 'Büyü odağı',
  mount: 'Binek',
  vehicle: 'Araç',
}

export function categoryLabel(item: Item): string {
  if (item.category === 'weapon') {
    const cls = item.weaponClass === 'martial' ? 'Savaş' : 'Basit'
    const rng = item.weaponRange === 'ranged' ? 'menzilli' : 'yakın dövüş'
    return `${cls} ${rng} silahı`
  }
  if (item.category === 'armor' || item.category === 'shield') return ARMOR_TYPE_TR[item.armorType ?? ''] ?? 'Zırh'
  return CATEGORY_TR[item.category] ?? item.category
}

/** Kartın üstünde görünen kısa etiketler. */
export function quickTags(item: Item): string[] {
  const tags: string[] = []
  const dmg = damageLabel(item)
  if (dmg) tags.push(dmg)
  const ac = armorLabel(item)
  if (ac) tags.push(ac)
  if (item.stealthDisadvantage) tags.push('gizlenmede dezavantaj')
  if (item.strengthReq) tags.push(`Güç ${item.strengthReq} gerekir`)
  for (const p of item.properties ?? []) tags.push(p)
  return tags
}
