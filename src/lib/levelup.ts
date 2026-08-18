// Seviye atlama. Yeni kazanılan özellikler guide levelFeatures'tan gelir; YENİ
// rozeti için lastGainedFeatureKeys işaretlenir. HP recomputeDerived'da türetilir.
import { classById, config } from '@/data'
import { collectChoiceSlots, type ChoiceSlot } from '@/data/grants'
import type { Character, GainedFeature, FeatSelection } from '@/types/character'
import { featureKey } from './character-factory'
import { recomputeDerived } from './derive'
import { averageLevelHp } from './rules'
import type { Ability } from '@/types/data'

// Seviye atlarken yeni açılan sınıf seçimleri (level-up panelinde sorulacak).
const LEVELUP_CHOICE_TYPES = new Set<ChoiceSlot['type']>(['fighting-style', 'expertise'])

export interface LevelUpPreview {
  fromLevel: number
  toLevel: number
  features: GainedFeature[]
  needsASI: boolean
  needsSubclass: boolean
  isExtraAttack: boolean
  hpGained: number
  newChoiceSlots: ChoiceSlot[]
}

// toLevel'de açılıp bu seviyede henüz doldurulmamış sınıf seçim slotları.
function newChoiceSlotsFor(char: Character, toLevel: number, pendingSubclassId?: string): ChoiceSlot[] {
  const atNew = collectChoiceSlots({ ...char, level: toLevel, subclassId: char.subclassId || pendingSubclassId || '' })
  const atCurKeys = new Set(collectChoiceSlots(char).map((s) => s.key))
  return atNew.filter((s) => {
    if (!LEVELUP_CHOICE_TYPES.has(s.type)) return false
    if (atCurKeys.has(s.key)) return false // zaten önceki seviyede vardı
    const filled = (char.choiceSelections[s.key]?.length ?? 0) >= s.count
    return !filled
  })
}

/** Bir alt sınıfın belirli seviyedeki özellikleri. */
export function subclassFeaturesAt(classId: string, subclassId: string, level: number): GainedFeature[] {
  const sub = classById(classId)?.subclasses.find((s) => s.id === subclassId)
  return (sub?.levelFeatures?.[String(level)] ?? []).map((f) => ({
    name: f.name,
    level: f.level,
    description: f.description,
    source: sub!.id,
  }))
}

/**
 * @param pendingSubclassId bu seviyede yeni seçilen alt sınıf (henüz kaydedilmedi);
 *   önizlemede o alt sınıfın özellikleri de gösterilsin diye.
 */
export function previewLevelUp(char: Character, pendingSubclassId?: string): LevelUpPreview | null {
  const klass = classById(char.classId)
  if (!klass || char.level >= 20) return null
  const toLevel = char.level + 1
  const feats = (klass.levelFeatures[String(toLevel)] || []).map((f) => ({
    name: f.name,
    level: f.level,
    description: f.description,
    source: klass.id,
  }))
  // seçili (ya da bu adımda seçilen) alt sınıfın bu seviyedeki özellikleri
  const subId = char.subclassId || pendingSubclassId
  if (subId) feats.push(...subclassFeaturesAt(char.classId, subId, toLevel))
  // ASI'yi statik seviye listesinden DEĞİL, o seviyede "Ability Score Improvement"
  // özelliği var mı diye tespit et — Fighter 6/14, Rogue 10 gibi ekstra ASI'ler de
  // yakalanır (statik liste [4,8,12,16,19] yedek olarak kalır).
  const needsASI =
    config.abilityScoreImprovementLevels.includes(toLevel) ||
    feats.some((f) => /^ability score improvement$/i.test(f.name.trim()))
  const needsSubclass = klass.subclassLevel === toLevel && !char.subclassId
  const isExtraAttack = feats.some((f) => /Extra Attack/i.test(f.name))
  return {
    fromLevel: char.level,
    toLevel,
    features: feats,
    needsASI,
    needsSubclass,
    isExtraAttack,
    hpGained: averageLevelHp(char),
    newChoiceSlots: newChoiceSlotsFor(char, toLevel, pendingSubclassId),
  }
}

export interface LevelUpChoices {
  asi?: Partial<Record<Ability, number>> // toplam +2 dağıtımı
  feat?: string // ASI yerine seçilen feat id'i
  featSelection?: FeatSelection // seçilen feat'in alt seçimleri (ability, skill, büyü…)
  subclassId?: string
  choiceSelections?: Record<string, string[]> // yeni açılan sınıf seçimleri
}

export function applyLevelUp(char: Character, choices: LevelUpChoices): Character {
  const preview = previewLevelUp(char, choices.subclassId)
  if (!preview) return char
  const draft = structuredClone(char)
  draft.level = preview.toLevel

  // subclass seçimi
  if (preview.needsSubclass && choices.subclassId) draft.subclassId = choices.subclassId

  // ASI ya da (ASI yerine) Feat uygula
  if (preview.needsASI) {
    if (choices.feat) {
      draft.feats = [...(draft.feats ?? []), choices.feat]
      if (choices.featSelection) {
        draft.featSelections = { ...(draft.featSelections ?? {}), [choices.feat]: choices.featSelection }
      }
    } else if (choices.asi) {
      for (const [a, n] of Object.entries(choices.asi)) {
        draft.asiBonuses[a as Ability] = (draft.asiBonuses[a as Ability] || 0) + (n as number)
      }
    }
  }

  // yeni açılan sınıf seçimleri (Fighting Style / Expertise)
  if (choices.choiceSelections) {
    for (const [k, v] of Object.entries(choices.choiceSelections)) draft.choiceSelections[k] = v
  }

  // YENİ rozet anahtarları: bu seviyede kazanılan sınıf özellikleri (+ yeni subclass)
  const newKeys = preview.features.map((f) => featureKey(f.name, f.level))
  if (preview.needsSubclass && choices.subclassId) {
    const sub = classById(char.classId)?.subclasses.find((s) => s.id === choices.subclassId)
    if (sub) newKeys.push(featureKey(sub.name, preview.toLevel))
  }
  draft.lastGainedFeatureKeys = newKeys

  // geçmiş
  draft.levelUpHistory.push({
    toLevel: preview.toLevel,
    hpGained: preview.hpGained,
    features: preview.features,
    asiApplied: choices.asi as Partial<Character['baseAbilityScores']>,
    timestamp: new Date().toISOString(),
  })

  return recomputeDerived(draft)
}
