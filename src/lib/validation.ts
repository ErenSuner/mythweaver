// Wizard adım tamamlanma kontrolleri (zorunlu alanlar dolmadan İleri kapalı)
import { config, classById, raceById, backgroundById } from '@/data'
import { collectChoiceSlots } from '@/data/grants'
import { spellLimitsFor } from '@/data/spell-progression'
import { pointBuyRemaining } from './rules'
import { pendingEquipChoices } from './inventory'
import type { Character } from '@/types/character'

const SKILL_KEYS = Object.keys(config.skills)

function skillsInText(text: string): string[] {
  if (!text) return []
  return SKILL_KEYS.filter((s) => new RegExp(`\\b${s.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i').test(text))
}

export function raceComplete(c: Character): boolean {
  const race = raceById(c.raceId)
  if (!race) return false
  if (race.subraces.length > 0 && !c.subraceId) return false
  if (race.abilityBonusChoice) {
    const n = Object.keys(c.raceAbilityChoice).length
    if (n < race.abilityBonusChoice.count) return false
  }
  return true
}

export function classComplete(c: Character): boolean {
  const klass = classById(c.classId)
  if (!klass) return false
  // subclass bu seviyede seçilmeliyse (Cleric/Sorcerer/Warlock = 1. seviye) zorunlu
  if (klass.subclassLevel != null && c.level >= klass.subclassLevel && klass.subclasses.length > 0 && !c.subclassId) return false
  return true
}

export function abilitiesComplete(c: Character): boolean {
  // tüm 27 puan dağıtılmış olmalı
  return pointBuyRemaining(c.baseAbilityScores) === 0
}

export function skillsComplete(c: Character): boolean {
  const klass = classById(c.classId)
  if (!klass) return false
  const count = klass.skillChoices.count ?? 0
  if (count === 0) return true
  const bgSkills = skillsInText(backgroundById(c.backgroundId)?.skillProficiencies ?? '')
  const classOptions = skillsInText(klass.skillChoices.options)
  const chosen = classOptions.filter((s) => !bgSkills.includes(s) && c.skills[s]?.proficient).length
  return chosen >= count
}

export function equipmentComplete(c: Character): boolean {
  return pendingEquipChoices(c).length === 0
}

export function spellsComplete(c: Character): boolean {
  const klass = classById(c.classId)
  // büyü kullanmayan sınıflar bu adımı otomatik geçer
  if (!klass?.isCaster || !c.spellcasting) return true
  const limits = spellLimitsFor(c)
  const cantripN = c.spellcasting.cantripIds.length
  const lvl1N = c.spellcasting.levels[1]?.spellIds.length ?? 0
  return cantripN === limits.cantrips && lvl1N === limits.level1Spells
}

export function choicesComplete(c: Character): boolean {
  const slots = collectChoiceSlots(c)
  return slots.every((slot) => {
    const n =
      slot.type === 'skill'
        ? c.raceExtraSkills.length
        : slot.type === 'cantrip'
          ? c.raceCantripIds.length
          : (c.choiceSelections[slot.key]?.length ?? 0)
    return n >= slot.count
  })
}
