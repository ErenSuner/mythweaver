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
  desc?: string // kaynağın ne işe yaradığı — künye modalında gösterilir
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
      out.push({
        name: 'Rage (kullanım)',
        value: rageUses(l),
        recharge: 'Long Rest',
        desc: 'Bonus aksiyon ile öfkelen (1 dakika sürer). Güç temelli yakın dövüş saldırılarına hasar bonusu; Güç kontrol/kurtarma atışlarında avantaj; delici/kesici/ezici hasara karşı direnç. Zırh giyersen veya bir tur boyunca saldırmaz/hasar almazsan öfke sona erer; konsantrasyon büyüsü yaparken kullanılamaz.',
      })
      out.push({
        name: 'Rage hasar bonusu',
        value: rageDamage(l),
        desc: 'Öfke aktifken Güç kullanan yakın dövüş saldırılarına eklenen ekstra hasar. Seviyeyle büyür.',
      })
      break
    case 'bard':
      out.push({
        name: 'Bardic Inspiration',
        value: `${Math.max(1, cha)} × ${bardicDie(l)}`,
        recharge: l >= 5 ? 'Short/Long Rest' : 'Long Rest',
        desc: 'Bonus aksiyon ile 60 ft içindeki bir yaratığa bir ilham zarı ver. O yaratık, 10 dakika içinde bir saldırı, yetenek kontrolü veya kurtarma atışına bu zarı ekleyebilir (atıştan sonra, ama sonucu öğrenmeden önce). Charisma modifiyeni kadar kullanımın var; 5. seviyeden itibaren kısa dinlenmede de yenilenir.',
      })
      break
    case 'cleric':
      if (l >= 2)
        out.push({
          name: 'Channel Divinity',
          value: channelDivinityUses(l),
          recharge: 'Short/Long Rest',
          desc: 'Tanrısal enerjini doğrudan kanalize et. Turn Undead (ölümsüzleri kaçırt) her rahibe açıktır; alan (domain) seçimin ek bir Channel Divinity seçeneği verir.',
        })
      break
    case 'druid':
      if (l >= 2)
        out.push({
          name: 'Wild Shape',
          value: '2',
          recharge: 'Short/Long Rest',
          desc: 'Aksiyon ile daha önce gördüğün bir canavarın formuna bürün. Süre druid seviyenin yarısı kadar saattir. Challenge Rating ve hareket türü sınırları seviyeyle gevşer.',
        })
      break
    case 'fighter':
      out.push({
        name: 'Second Wind (iyileşme)',
        value: `1d10 + ${l}`,
        recharge: 'Short/Long Rest',
        desc: 'Bonus aksiyon ile 1d10 + fighter seviyesi kadar HP geri kazan.',
      })
      if (l >= 2)
        out.push({
          name: 'Action Surge',
          value: l >= 17 ? '2' : '1',
          recharge: 'Short/Long Rest',
          desc: 'Turunda normal aksiyonuna ek olarak bir aksiyon daha al (bonus aksiyon hariç).',
        })
      break
    case 'monk':
      if (l >= 2)
        out.push({
          name: 'Ki puanı',
          value: `${l}`,
          recharge: 'Short/Long Rest',
          desc: 'Flurry of Blows, Patient Defense ve Step of the Wind gibi manastır tekniklerini besleyen kaynak. Ki kurtarma zorluğu 8 + prof + Bilgelik.',
        })
      out.push({
        name: 'Martial Arts zarı',
        value: martialArtsDie(l),
        desc: 'Silahsız vuruşların ve manastır silahların için hasar zarı. Bu silahlarla saldırdığında bonus aksiyonla bir silahsız saldırı daha yapabilirsin; saldırılarda Güç yerine Çeviklik kullanabilirsin.',
      })
      break
    case 'paladin':
      out.push({
        name: 'Lay on Hands (havuz)',
        value: `${5 * l} HP`,
        recharge: 'Long Rest',
        desc: 'Dokunuşla, günlük havuzundan istediğin kadar HP dağıtarak yaralıları iyileştir. 5 puan harcayıp bir hastalığı veya bir zehri de nötrleştirebilirsin. Havuz büyüklüğü paladin seviyesi × 5.',
      })
      out.push({
        name: 'Divine Sense',
        value: `${1 + cha}`,
        recharge: 'Long Rest',
        desc: 'Aksiyon ile bir sonraki turuna dek 60 ft içindeki iblis/şeytan/ölümsüzlerin ve kutsanmış/lanetlenmiş yer ile nesnelerin varlığını ve türünü algıla. Kullanım sayısı 1 + Charisma modifiyeni.',
      })
      if (l >= 3)
        out.push({
          name: 'Channel Divinity',
          value: l >= 6 ? '2' : '1',
          recharge: 'Short/Long Rest',
          desc: 'Yeminine (oath) bağlı özel tanrısal etkileri kanalize et.',
        })
      break
    case 'rogue':
      out.push({
        name: 'Sneak Attack',
        value: sneakDice(l),
        desc: 'Tur başına bir kez, saldırıda avantajın varsa YA DA hedefin yanında (5 ft) müttefikin varken avantajın yoksa, finesse veya menzilli bir silahla ekstra hasar ekle. Hedef sana dezavantajlı olmamalı.',
      })
      break
    case 'sorcerer':
      if (l >= 2)
        out.push({
          name: 'Sorcery Points',
          value: `${l}`,
          recharge: 'Long Rest',
          desc: 'Büyü yuvası ile arasında dönüşüm yapmak (Flexible Casting) ve Metamagic seçeneklerini beslemek için harcanan kaynak.',
        })
      break
    case 'wizard':
      out.push({
        name: 'Arcane Recovery',
        value: `${Math.ceil(l / 2)} slot seviyesi`,
        recharge: 'Günde 1 (Short Rest)',
        desc: 'Günde bir kez kısa dinlenmede, toplam seviyesi wizard seviyenin yarısını (yukarı yuvarla) geçmeyen büyü yuvalarını geri kazan. 6. seviye ve üstü yuvalar geri gelmez.',
      })
      break
    default:
      break
  }
  return out
}
