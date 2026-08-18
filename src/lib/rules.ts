// D&D 5e hesap kuralları — tüm veri config.json + data/*.json'dan. Hardcode kural yok.
import { config, raceById, classById, itemById, backgroundById } from '@/data'
import { subclassGrant } from '@/data/grants'
import { featAbilityBonuses, featNumeric, featSelectionAbilityBonuses, featSaveProficiencies, featGrantedSkills } from '@/data/feats'
import type { Ability } from '@/types/data'
import type { AbilityScores, Character } from '@/types/character'
import { ABILITIES } from '@/types/data'
import { armorClassFrom } from './inventory'

export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2)
}

export function formatMod(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`
}

export function proficiencyBonus(level: number): number {
  return config.proficiencyBonusByLevel[String(level)] ?? 2
}

// point-buy maliyeti
export function pointBuyCost(score: number): number {
  return config.pointBuy.cost[String(score)] ?? 0
}
export function pointBuySpent(scores: AbilityScores): number {
  return ABILITIES.reduce((sum, a) => sum + pointBuyCost(scores[a]), 0)
}
export function pointBuyRemaining(scores: AbilityScores): number {
  return config.pointBuy.totalPoints - pointBuySpent(scores)
}

// ırk bonuslarını (sabit + seçmeli) topla
export function raceBonuses(char: Character): Partial<Record<Ability, number>> {
  const race = raceById(char.raceId)
  const out: Partial<Record<Ability, number>> = {}
  if (!race) return out
  const add = (a: Ability, n: number) => { out[a] = (out[a] || 0) + n }
  if (race.abilityBonusesAll) ABILITIES.forEach((a) => add(a, race.abilityBonusesAll!))
  for (const [a, n] of Object.entries(race.abilityBonuses)) add(a as Ability, n as number)
  // subrace
  const sub = race.subraces.find((s) => s.id === char.subraceId)
  if (sub) for (const [a, n] of Object.entries(sub.abilityBonuses)) add(a as Ability, n as number)
  // seçmeli (+1 x count)
  for (const [a, n] of Object.entries(char.raceAbilityChoice)) add(a as Ability, n as number)
  return out
}

// nihai ability score = base + ırk + ASI + feat (sabit VE seçmeli half-feat bonusları)
export function finalAbilityScores(char: Character): AbilityScores {
  const rb = raceBonuses(char)
  const fb = featAbilityBonuses(char.feats ?? [])
  const fsb = featSelectionAbilityBonuses(char.featSelections ?? {})
  const out = { ...char.baseAbilityScores }
  ABILITIES.forEach((a) => {
    // 5e: sihir olmadan ability score 20'yi geçemez (ASI/half-feat dahil)
    out[a] = Math.min(20, char.baseAbilityScores[a] + (rb[a] || 0) + (char.asiBonuses[a] || 0) + (fb[a] || 0) + (fsb[a] || 0))
  })
  return out
}

export function abilityMod(char: Character, a: Ability): number {
  return abilityModifier(finalAbilityScores(char)[a])
}

const SKILL_KEYS = Object.keys(config.skills)

// Background'ın verdiği sabit 2 skill proficiency'si (serbest metinden çıkarılır).
// c.skills'e YAZILMAZ; burada türetilir — böylece background değişince eski
// proficiency'ler kalmaz (stale olmaz).
export function backgroundSkills(char: Character): string[] {
  const text = backgroundById(char.backgroundId)?.skillProficiencies ?? ''
  if (!text) return []
  return SKILL_KEYS.filter((s) => new RegExp(`\\b${s.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i').test(text))
}

// Sınıfın seçime açtığı skill listesi (serbest metinden). Metinde skill adı
// yoksa ama açıkça "herhangi/any N skill" diyorsa (RAW: Bard serbest seçer) TÜM
// skill'ler seçilebilir olur; aksi halde yalnız adı geçenler (5e kısıtı korunur).
export function classSkillOptions(classId: string): string[] {
  const klass = classById(classId)
  const text = klass?.skillChoices.options ?? ''
  const named = SKILL_KEYS.filter((s) => new RegExp(`\\b${s.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i').test(text))
  if (named.length) return named
  if ((klass?.skillChoices.count ?? 0) > 0 && /herhangi|any/i.test(text)) return [...SKILL_KEYS]
  return named
}

// bir beceride proficiency var mı (class/manuel + background + ırk + alt sınıf grantı)
export function isSkillProficient(char: Character, skill: string): boolean {
  if (Boolean(char.skills[skill]?.proficient) || char.raceExtraSkills.includes(skill)) return true
  if (backgroundSkills(char).includes(skill)) return true
  // alt sınıf grantı (Nature domain beceri, Knowledge domain expertise becerileri)
  const granted = [...(char.choiceSelections['skill-domain'] ?? []), ...(char.choiceSelections['expertise-domain'] ?? [])]
  if (granted.includes(skill)) return true
  // feat grantı (Skilled)
  return featGrantedSkills(char.feats ?? [], char.featSelections ?? {}).includes(skill)
}

// pasif algı = 10 + Wis mod + (proficient ise) prof bonus + (expertise ise) bir kez daha
export function passivePerception(char: Character): number {
  const wis = abilityMod(char, 'Wisdom')
  const prof = isSkillProficient(char, 'Perception') ? proficiencyBonus(char.level) : 0
  const expertise = hasExpertise(char, 'Perception') ? proficiencyBonus(char.level) : 0
  return 10 + wis + prof + expertise + featNumeric(char.feats ?? [], 'passivePerceptionBonus')
}

// Rogue/Bard Expertise + Knowledge domain — seçilen skill'lerde proficiency iki katı
export function hasExpertise(char: Character, skill: string): boolean {
  const exp = [...(char.choiceSelections['expertise'] ?? []), ...(char.choiceSelections['expertise-domain'] ?? [])]
  return exp.includes(skill) && isSkillProficient(char, skill)
}

export function skillModifier(char: Character, skill: string): number {
  const ability = config.skills[skill]
  if (!ability) return 0
  const base = abilityMod(char, ability)
  const prof = isSkillProficient(char, skill) ? proficiencyBonus(char.level) : 0
  // Expertise: proficiency bonusunu bir kez daha ekle (toplam iki kat)
  const expertise = hasExpertise(char, skill) ? proficiencyBonus(char.level) : 0
  return base + prof + expertise
}

export function savingThrowModifier(char: Character, ability: Ability): number {
  const base = abilityMod(char, ability)
  const isProf = char.savingThrowProficiencies.includes(ability) || featSaveProficiencies(char.feats ?? [], char.featSelections ?? {}).includes(ability)
  const prof = isProf ? proficiencyBonus(char.level) : 0
  return base + prof
}

export function initiative(char: Character): number {
  return char.initiativeManual ?? abilityMod(char, 'Dexterity') + featNumeric(char.feats ?? [], 'initiativeBonus')
}

// Giyilen zırh + kalkandan AC. Zırh yoksa sınıfa göre Unarmored Defense:
// Barbarian 10+Dex+Con, Monk 10+Dex+Wis (kalkansız), diğerleri 10+Dex.
export function baseArmorClass(char: Character): number {
  const armor = char.equippedArmorId ? itemById(char.equippedArmorId) : undefined
  const dex = abilityMod(char, 'Dexterity')
  const shield = char.equippedShield ? 2 : 0
  let ac: number
  if (!armor) {
    // Unarmored Defense varyantları — en yükseği kullanılır
    const candidates = [10 + dex + shield]
    if (char.classId === 'barbarian') candidates.push(10 + dex + abilityMod(char, 'Constitution') + shield)
    if (char.classId === 'monk' && !char.equippedShield) candidates.push(10 + dex + abilityMod(char, 'Wisdom'))
    const grant = subclassGrant(char.subclassId)
    if (grant?.unarmoredAcBase != null) candidates.push(grant.unarmoredAcBase + dex + shield) // Draconic 13+Dex
    ac = Math.max(...candidates)
  } else {
    ac = armorClassFrom(armor, dex, char.equippedShield)
    // Fighting Style — Defense: zırh giyerken AC +1
    if (char.choiceSelections['fighting-style']?.includes('defense')) ac += 1
  }
  return ac
}
export function armorClass(char: Character): number {
  return char.acManual ? char.armorClass : baseArmorClass(char)
}

// ---- silah saldırıları ----
import type { Item } from '@/types/data'

// isimli-liste sınıflarının (wizard/druid vb.) silahları için TR alias'lar
const WEAPON_ALIAS: Record<string, string> = {
  dagger: 'hançer',
  dart: 'dart',
  sling: 'sapan',
  quarterstaff: 'quarterstaff',
  'light-crossbow': 'hafif arbalet',
  club: 'sopa',
  javelin: 'cirit',
  mace: 'gürz',
  spear: 'mızrak',
  handaxe: 'el baltası',
  scimitar: 'pala',
}

// Karakter bu silahla proficient mi? (sınıf metni + alt sınıf martial grantı)
export function weaponProficient(char: Character, item: Item): boolean {
  const klass = classById(char.classId)
  const text = (klass?.weapons ?? '').toLowerCase()
  const martial = /martial|savaş/.test(text) || Boolean(subclassGrant(char.subclassId)?.martialWeapons)
  const simple = martial || /simple|basit/.test(text)
  if (item.weaponClass === 'simple' && simple) return true
  if (item.weaponClass === 'martial' && martial) return true
  // isimli liste: silah adı sınıf metninde geçiyor mu (İngilizce ad + TR alias)
  if (text.includes(item.name.toLowerCase())) return true
  const alias = WEAPON_ALIAS[item.id]
  return Boolean(alias && text.includes(alias))
}

// Saldırıda kullanılan ability: ranged=Dex, finesse=Str/Dex'ten yüksek, diğer=Str
function weaponAbility(char: Character, item: Item): Ability {
  const dex = abilityMod(char, 'Dexterity')
  const str = abilityMod(char, 'Strength')
  if (item.weaponRange === 'ranged') return 'Dexterity'
  const finesse = item.properties?.some((p) => /finesse/i.test(p))
  if (finesse) return dex >= str ? 'Dexterity' : 'Strength'
  return 'Strength'
}

export function weaponAttackBonus(char: Character, item: Item): number {
  const ab = weaponAbility(char, item)
  return abilityMod(char, ab) + (weaponProficient(char, item) ? proficiencyBonus(char.level) : 0)
}

export function weaponDamage(char: Character, item: Item): string {
  const mod = abilityMod(char, weaponAbility(char, item))
  const base = item.damage ?? '—'
  const modStr = mod === 0 ? '' : mod > 0 ? ` + ${mod}` : ` − ${Math.abs(mod)}`
  return `${base}${modStr}${item.damageType ? ` ${item.damageType}` : ''}`
}

// büyü hesapları
export function spellSaveDC(char: Character, ability: Ability): number {
  return 8 + proficiencyBonus(char.level) + abilityMod(char, ability)
}
export function spellAttackBonus(char: Character, ability: Ability): number {
  return proficiencyBonus(char.level) + abilityMod(char, ability)
}

// 1. seviye HP = hit die max + CON mod
export function firstLevelHp(char: Character): number {
  const klass = classById(char.classId)
  const hd = klass?.hitDie ?? 8
  return hd + abilityMod(char, 'Constitution')
}

// sonraki seviyelerde ortalama HP artışı = (hit die / 2 + 1) + CON mod
export function averageLevelHp(char: Character): number {
  const klass = classById(char.classId)
  const hd = klass?.hitDie ?? 8
  return Math.floor(hd / 2) + 1 + abilityMod(char, 'Constitution')
}
