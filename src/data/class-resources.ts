// Sınıf kaynakları (Rage, Ki, Sneak Attack, Bardic Inspiration, Lay on Hands vb.)
// — seviyeye göre hesaplanır, sheet'te "Kaynaklar" bölümünde gösterilir.
// Değerler helper_files/dnd5e_ultimate_character_creation_guide.md sınıf tablolarından.
import type { Character } from '@/types/character'
import { classById } from '@/data'
import { abilityMod } from '@/lib/rules'

export interface ClassResource {
  name: string
  value: string
  recharge?: string // 'Long Rest' | 'Short/Long Rest' vb.
}

const rageUses = (l: number): string => (l >= 20 ? 'Sınırsız' : l >= 17 ? '6' : l >= 12 ? '5' : l >= 6 ? '4' : l >= 3 ? '3' : '2')
const rageDamage = (l: number): string => (l >= 16 ? '+4' : l >= 9 ? '+3' : '+2')
const bardicDie = (l: number): string => (l >= 15 ? 'd12' : l >= 10 ? 'd10' : l >= 5 ? 'd8' : 'd6')
const sneakDice = (l: number): string => `${Math.ceil(l / 2)}d6`
const martialArtsDie = (l: number): string => (l >= 17 ? '1d10' : l >= 11 ? '1d8' : l >= 5 ? '1d6' : '1d4')
const channelDivinityUses = (l: number): string => (l >= 18 ? '3' : l >= 6 ? '2' : '1')

// Bu karakterin seviyesinde geçerli sınıf kaynakları.
export function classResources(char: Character): ClassResource[] {
  const klass = classById(char.classId)
  if (!klass) return []
  const l = char.level
  const out: ClassResource[] = []
  const cha = abilityMod(char, 'Charisma')

  switch (klass.id) {
    case 'barbarian':
      out.push({ name: 'Rage (kullanım)', value: rageUses(l), recharge: 'Long Rest' })
      out.push({ name: 'Rage hasar bonusu', value: rageDamage(l) })
      break
    case 'bard':
      out.push({ name: 'Bardic Inspiration', value: `${Math.max(1, cha)} × ${bardicDie(l)}`, recharge: l >= 5 ? 'Short/Long Rest' : 'Long Rest' })
      break
    case 'cleric':
      if (l >= 2) out.push({ name: 'Channel Divinity', value: channelDivinityUses(l), recharge: 'Short/Long Rest' })
      break
    case 'druid':
      if (l >= 2) out.push({ name: 'Wild Shape', value: '2', recharge: 'Short/Long Rest' })
      break
    case 'fighter':
      out.push({ name: 'Second Wind (iyileşme)', value: `1d10 + ${l}`, recharge: 'Short/Long Rest' })
      if (l >= 2) out.push({ name: 'Action Surge', value: l >= 17 ? '2' : '1', recharge: 'Short/Long Rest' })
      break
    case 'monk':
      if (l >= 2) out.push({ name: 'Ki puanı', value: `${l}`, recharge: 'Short/Long Rest' })
      out.push({ name: 'Martial Arts zarı', value: martialArtsDie(l) })
      break
    case 'paladin':
      out.push({ name: 'Lay on Hands (havuz)', value: `${5 * l} HP`, recharge: 'Long Rest' })
      out.push({ name: 'Divine Sense', value: `${1 + cha}`, recharge: 'Long Rest' })
      if (l >= 3) out.push({ name: 'Channel Divinity', value: l >= 6 ? '2' : '1', recharge: 'Short/Long Rest' })
      break
    case 'rogue':
      out.push({ name: 'Sneak Attack', value: sneakDice(l) })
      break
    case 'sorcerer':
      if (l >= 2) out.push({ name: 'Sorcery Points', value: `${l}`, recharge: 'Long Rest' })
      break
    case 'wizard':
      out.push({ name: 'Arcane Recovery', value: `${Math.ceil(l / 2)} slot seviyesi`, recharge: 'Günde 1 (Short Rest)' })
      break
    default:
      break
  }
  return out
}
