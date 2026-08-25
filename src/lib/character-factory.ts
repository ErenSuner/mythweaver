// Boş/başlangıç Character üretimi + türetme yardımcıları
import { config } from '@/data'
import type { Character } from '@/types/character'
import { SCHEMA_VERSION } from '@/types/character'
import { ABILITIES } from '@/types/data'

function uid(): string {
  return (crypto as Crypto).randomUUID?.() ?? `c_${Date.now()}_${Math.random().toString(36).slice(2)}`
}

export function emptyCharacter(): Character {
  const skills: Character['skills'] = {}
  Object.keys(config.skills).forEach((s) => (skills[s] = { proficient: false }))
  return {
    id: uid(),
    schemaVersion: SCHEMA_VERSION,
    characterName: '',
    playerName: '',
    classId: '',
    subclassId: '',
    level: 1,
    startingLevel: 1,
    raceId: '',
    subraceId: '',
    backgroundId: '',
    alignment: '',
    xp: 0,
    baseAbilityScores: { Strength: 8, Dexterity: 8, Constitution: 8, Intelligence: 8, Wisdom: 8, Charisma: 8 },
    raceAbilityChoice: {},
    asiBonuses: {},
    choiceSelections: {},
    raceExtraSkills: [],
    raceCantripIds: [],
    feats: [],
    featSelections: {},
    savingThrowProficiencies: [],
    skills,
    inspiration: false,
    armorClass: 10,
    acManual: false,
    initiativeManual: null,
    speed: 30,
    maxHp: 0,
    currentHp: 0,
    tempHp: 0,
    hitDiceTotal: '',
    hitDiceRemaining: 1,
    deathSaves: { successes: 0, failures: 0 },
    attacks: [],
    startingKit: { mode: 'package', goldRolled: null, goldRollDice: null },
    equipChoices: {},
    equipPicks: {},
    purchases: [],
    equippedArmorId: '',
    equippedShield: false,
    inventory: [],
    currency: { CP: 0, SP: 0, EP: 0, GP: 0, PP: 0 },
    equipment: '',
    otherProficienciesLanguages: '',
    featuresAndTraits: [],
    lastGainedFeatureKeys: [],
    personalityTraits: '',
    ideals: '',
    bonds: '',
    flaws: '',
    age: '',
    height: '',
    weight: '',
    eyes: '',
    skin: '',
    hair: '',
    appearance: '',
    backstory: '',
    allies: '',
    factionName: '',
    additionalFeatures: '',
    treasure: '',
    spellcasting: null,
    levelUpHistory: [],
    wizardStep: 0,
    completed: false,
  }
}

export const featureKey = (name: string, level: number) => `${name}::${level}`

export { ABILITIES }
